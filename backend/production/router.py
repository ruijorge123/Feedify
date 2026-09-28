"""Produksi Batch endpoints, admin only, under /api/admin/produksi/*.

The client is named in the path rather than read from X-Client-Id: a plan belongs
to one client for its whole life, and a stray picker change in another tab must
never rewrite someone else's plan.

Plans are text only (ideas, on-image text, captions, settings). Prompts are not
stored — they are rebuilt from the current Brand DNA every time a plan is read,
so fixing a client's colours after planning fixes all thirty prompts at once.
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Callable, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from .plan import (
    CAMPURAN, MAX_GAYA, MAX_JUMLAH, TIPE_ARAH, TIPE_LABEL,
    bangun_prompt, susun_rencana,
)

logger = logging.getLogger(__name__)

GROQ_CHUNK = 5  # rows per request: at 10 the model returned only ~6 rows, and smaller calls stay well inside the serverless time limit


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class GayaIn(BaseModel):
    id: str
    url: str = ""
    description: str = ""
    categoryName: str = ""
    tags: List[str] = Field(default_factory=list)


class RencanaIn(BaseModel):
    jumlah: int = 30
    campuran: str = "seimbang"
    gaya: List[GayaIn] = Field(default_factory=list)
    momen: str = ""


class BarisPatch(BaseModel):
    ide: Optional[str] = None
    teks: Optional[str] = None
    perubahan: Optional[str] = None
    caption: Optional[str] = None
    gaya_id: Optional[str] = None
    product_id: Optional[str] = None
    tipe: Optional[str] = None


class IsiIn(BaseModel):
    nomor: List[int] = Field(default_factory=list)


def build_router(require_admin: Callable, db, groq_chat: Callable) -> APIRouter:
    router = APIRouter()

    # ── loading ──────────────────────────────────────────────────────────────

    async def _brand(client_id: str) -> dict:
        # Same rule as _get_active_brand in server.py: the active profile, else the first.
        brand = await db.brand_profiles.find_one({"user_id": client_id, "is_active": True}, {"_id": 0, "logo_base64": 0})
        if not brand:
            brand = await db.brand_profiles.find_one({"user_id": client_id}, {"_id": 0, "logo_base64": 0})
        return brand or {}

    async def _products(client_id: str) -> List[dict]:
        products = await db.products.find(
            {"user_id": client_id}, {"_id": 0, "photo_base64": 0}
        ).sort("created_at", 1).to_list(60)
        with_photo = {
            p["id"] for p in await db.products.find(
                {"user_id": client_id, "photo_base64": {"$nin": [None, ""]}}, {"_id": 0, "id": 1}
            ).to_list(60)
        }
        return [{
            "id": p["id"],
            "name": p.get("name", ""),
            "description": p.get("description") or p.get("usp") or "",
            "allocation": int(p.get("allocation") or 0),
            "has_photo": p["id"] in with_photo,
        } for p in products]

    async def _plan(plan_id: str) -> dict:
        plan = await db.batch_plans.find_one({"id": plan_id}, {"_id": 0})
        if not plan:
            raise HTTPException(status_code=404, detail="Rencana tidak ditemukan")
        return plan

    def _with_prompts(plan: dict, brand: dict, products: List[dict]) -> dict:
        by_id = {p["id"]: p for p in products}
        gaya = {g["id"]: g for g in plan.get("settings", {}).get("gaya", [])}
        rows = []
        for r in plan.get("rows", []):
            rows.append({
                **r,
                "tipe_label": TIPE_LABEL.get(r.get("tipe"), r.get("tipe", "")),
                "prompt": bangun_prompt(r, brand, by_id.get(r.get("product_id")), gaya.get(r.get("gaya_id"))),
            })
        return {**plan, "rows": rows}

    async def _render(plan: dict) -> dict:
        cid = plan["client_id"]
        return _with_prompts(plan, await _brand(cid), await _products(cid))

    # ── brief + latest plan ──────────────────────────────────────────────────

    @router.get("/admin/produksi/{client_id}")
    async def brief(client_id: str, admin_user: dict = Depends(require_admin)):
        client = await db.clients.find_one({"user_id": client_id}, {"_id": 0})
        if not client:
            raise HTTPException(status_code=404, detail="Klien tidak ditemukan")
        user = await db.users.find_one({"id": client_id}, {"_id": 0, "name": 1, "email": 1}) or {}
        brand = await _brand(client_id)
        products = await _products(client_id)
        latest = await db.batch_plans.find_one(
            {"client_id": client_id}, {"_id": 0}, sort=[("created_at", -1)]
        )
        return {
            "client": {
                "user_id": client_id,
                "nama": client.get("nickname") or user.get("name") or user.get("email") or "",
                "counter": int(client.get("counter") or 0),
                "total_feeds": int(client.get("total_feeds") or 0),
                "status": client.get("status", ""),
            },
            "brand": {k: brand.get(k) for k in (
                "brand_name", "category", "colors", "color_primary", "color_secondary", "color_accent",
                "mood", "lighting", "materials", "composition", "target_audience",
                "caption_tone", "notes", "donts", "donts_notes",
            ) if brand.get(k)},
            "products": products,
            "rencana": _with_prompts(latest, brand, products) if latest else None,
            "campuran": CAMPURAN,
            "tipe_label": TIPE_LABEL,
            "max_gaya": MAX_GAYA,
            "max_jumlah": MAX_JUMLAH,
        }

    @router.get("/admin/produksi/{client_id}/produk/{product_id}/foto")
    async def product_photo(client_id: str, product_id: str, admin_user: dict = Depends(require_admin)):
        p = await db.products.find_one(
            {"id": product_id, "user_id": client_id}, {"_id": 0, "name": 1, "photo_base64": 1}
        )
        if not p or not p.get("photo_base64"):
            raise HTTPException(status_code=404, detail="Foto produk belum ada")
        return {"name": p.get("name", ""), "photo_base64": p["photo_base64"]}

    # ── create / edit ────────────────────────────────────────────────────────

    @router.post("/admin/produksi/{client_id}/rencana")
    async def create_plan(client_id: str, payload: RencanaIn, admin_user: dict = Depends(require_admin)):
        if not await db.clients.find_one({"user_id": client_id}, {"_id": 1}):
            raise HTTPException(status_code=404, detail="Klien tidak ditemukan")
        if payload.campuran not in CAMPURAN:
            raise HTTPException(status_code=400, detail="Campuran konten tidak dikenal")
        if not 1 <= payload.jumlah <= MAX_JUMLAH:
            raise HTTPException(status_code=400, detail=f"Jumlah feed harus 1–{MAX_JUMLAH}")

        gaya = [g.dict() for g in payload.gaya[:MAX_GAYA]]
        for g in gaya:
            g["url"] = g["url"][:300]
            g["description"] = g["description"][:300]
            g["tags"] = [t[:40] for t in g["tags"][:8]]

        products = await _products(client_id)
        rows = susun_rencana(payload.jumlah, products, CAMPURAN[payload.campuran]["persen"], gaya)
        plan = {
            "id": str(uuid.uuid4()),
            "client_id": client_id,
            "created_by": admin_user["id"],
            "created_at": now_iso(),
            "updated_at": now_iso(),
            "settings": {
                "jumlah": payload.jumlah,
                "campuran": payload.campuran,
                "gaya": gaya,
                "momen": payload.momen.strip()[:500],
            },
            "rows": rows,
        }
        await db.batch_plans.insert_one(dict(plan))
        return await _render(plan)

    @router.patch("/admin/produksi/rencana/{plan_id}/baris/{no}")
    async def edit_row(plan_id: str, no: int, payload: BarisPatch, admin_user: dict = Depends(require_admin)):
        plan = await _plan(plan_id)
        rows = plan.get("rows", [])
        idx = next((i for i, r in enumerate(rows) if r.get("no") == no), None)
        if idx is None:
            raise HTTPException(status_code=404, detail="Baris tidak ditemukan")

        changes = {k: v for k, v in payload.dict().items() if v is not None}
        if "tipe" in changes and changes["tipe"] not in TIPE_LABEL:
            raise HTTPException(status_code=400, detail="Tipe konten tidak dikenal")
        if "gaya_id" in changes and changes["gaya_id"] and changes["gaya_id"] not in {
            g["id"] for g in plan.get("settings", {}).get("gaya", [])
        }:
            raise HTTPException(status_code=400, detail="Gaya tidak ada di rencana ini")
        if "product_id" in changes:
            p = await db.products.find_one({"id": changes["product_id"], "user_id": plan["client_id"]}, {"_id": 0, "name": 1})
            if not p:
                raise HTTPException(status_code=400, detail="Produk bukan milik klien ini")
            changes["product_name"] = p.get("name", "")
        for k in ("ide", "perubahan"):
            if k in changes:
                changes[k] = changes[k][:400]
        for k in ("teks", "caption"):
            if k in changes:
                changes[k] = changes[k][:2200]

        rows[idx] = {**rows[idx], **changes}
        await db.batch_plans.update_one(
            {"id": plan_id}, {"$set": {f"rows.{idx}": rows[idx], "updated_at": now_iso()}}
        )
        rendered = await _render({**plan, "rows": [rows[idx]]})
        return rendered["rows"][0]

    @router.delete("/admin/produksi/rencana/{plan_id}")
    async def delete_plan(plan_id: str, admin_user: dict = Depends(require_admin)):
        res = await db.batch_plans.delete_one({"id": plan_id})
        if not res.deleted_count:
            raise HTTPException(status_code=404, detail="Rencana tidak ditemukan")
        return {"ok": True}

    # ── Groq: ideas, on-image text, captions ────────────────────────────────

    @router.post("/admin/produksi/rencana/{plan_id}/isi")
    async def fill_rows(plan_id: str, payload: IsiIn, admin_user: dict = Depends(require_admin)):
        plan = await _plan(plan_id)
        wanted = list(dict.fromkeys(payload.nomor))[:GROQ_CHUNK]
        rows = plan.get("rows", [])
        targets = [r for r in rows if r.get("no") in wanted]
        if not targets:
            raise HTTPException(status_code=400, detail="Tidak ada baris yang dipilih")

        brand = await _brand(plan["client_id"])
        products = {p["id"]: p for p in await _products(plan["client_id"])}
        gaya = {g["id"]: g for g in plan.get("settings", {}).get("gaya", [])}
        momen = plan.get("settings", {}).get("momen", "")

        dipakai = {r.get("product_id") for r in targets if r.get("product_id")}
        produk_teks = "\n".join(
            f"- {products[pid]['name']}: {products[pid]['description'] or '(tidak ada deskripsi)'}"
            for pid in dipakai if pid in products
        ) or "- (belum ada data produk)"
        larangan = ", ".join([d for d in brand.get("donts") or [] if d] + ([brand["donts_notes"]] if brand.get("donts_notes") else []))
        system = (
            "Kamu perencana konten dan copywriter Instagram untuk brand UMKM Indonesia. "
            "Tulis dalam Bahasa Indonesia yang natural, rapi, dan tidak lebay. Output HANYA JSON valid."
        )

        def _user_prompt(rs: List[dict]) -> str:
            baris_teks = "\n".join(
                f"- no {r['no']} | produk: {r.get('product_name') or '-'} | tipe: "
                f"{TIPE_LABEL.get(r.get('tipe'), r.get('tipe'))} ({TIPE_ARAH.get(r.get('tipe'), '')}) | "
                f"gaya foto: {(gaya.get(r.get('gaya_id')) or {}).get('description') or 'bebas'}"
                for r in rs
            )
            return f"""Brand: {brand.get('brand_name') or '-'}
Kategori: {brand.get('category') or '-'}
Target pembeli: {brand.get('target_audience') or '-'}
Suasana brand: {brand.get('mood') or '-'}
Nada caption: {brand.get('caption_tone') or brand.get('mood') or 'hangat dan jelas'}
Catatan brand: {brand.get('notes') or '-'}
Larangan: {larangan or '-'}
Momen bulan ini: {momen or '-'}

Data produk (satu-satunya sumber fakta):
{produk_teks}

Buat isi untuk SEMUA {len(rs)} baris berikut, tidak boleh ada yang terlewat:
{baris_teks}

Aturan:
1. "ide": satu kalimat, apa yang terlihat di foto. Maks 20 kata.
2. "teks": teks yang tampil di foto, 1–3 baris dipisah "\\n". Baris 1 judul maks 6 kata. Baris 2 (opsional) maks 10 kata. Baris 3 (opsional) poin singkat dipisah " · ". Perkenalan dan Soft selling cukup 1–2 baris.
3. "caption": 2–4 kalimat sesuai nada caption, lalu baris kosong, lalu 3–6 hashtag relevan.
4. FAKTA: setiap bahan, angka, manfaat, dan klaim HANYA boleh yang tertulis di data produk. Jangan menambah manfaat lain (misal "menyeimbangkan pH", "tidak lengket", "menenangkan", "mencerahkan", "UVA/UVB") kalau tidak tertulis. Jangan menyebut sertifikat, klaim medis, harga, atau diskon yang tidak ada di data produk atau momen. Kalau data produk sedikit, tulis suasana dan momen pemakaian, bukan klaim.
5. TESTIMONI: JANGAN mengarang kutipan, nama, atau pengalaman pelanggan. Untuk tipe Testimoni, isi "teks" baris 2 persis dengan "[kutipan asli pelanggan]" dan tulis caption yang mengajak pembeli berbagi pengalaman, tanpa mengaku sudah ada ulasan.
6. MOMEN: sebut momen bulan ini HANYA di baris tipe Promo. Jangan sebut momen (termasuk di hashtag) pada tipe lain.
7. Setiap baris harus punya ide dan judul yang berbeda.

Format: {{"baris": [{{"no": 1, "ide": "...", "teks": "...", "caption": "..."}}]}}"""

        def _parse(raw: str) -> list:
            text = (raw or "").strip()
            if text.startswith("```"):
                text = text.strip("`")
                text = text[text.find("{"):] if "{" in text else text
            try:
                parsed = json.loads(text)
            except Exception:
                start, end = text.find("{"), text.rfind("}")
                try:
                    parsed = json.loads(text[start:end + 1]) if start >= 0 else {}
                except Exception:
                    parsed = {}
            items = parsed.get("baris") if isinstance(parsed, dict) else parsed
            return items if isinstance(items, list) else []

        hasil: Dict[int, dict] = {}
        # The model sometimes answers fewer rows than asked; one more pass for the
        # missing ones fills them without making the owner click again.
        for attempt in range(2):
            sisa = [r for r in targets if r["no"] not in hasil]
            if not sisa:
                break
            try:
                raw = await groq_chat(
                    [{"role": "system", "content": system}, {"role": "user", "content": _user_prompt(sisa)}],
                    max_tokens=3000, temperature=0.7, response_format={"type": "json_object"},
                )
            except HTTPException:
                if hasil:
                    break
                raise
            except Exception as e:
                logger.error(f"Produksi batch fill failed: {e}")
                if hasil:
                    break
                raise HTTPException(status_code=502, detail="AI sedang sibuk. Coba lagi sebentar.")
            for it in _parse(raw):
                try:
                    n = int(it.get("no"))
                except Exception:
                    continue
                if n in wanted and n not in hasil:
                    hasil[n] = {
                        "ide": str(it.get("ide") or "")[:400],
                        "teks": str(it.get("teks") or "").replace("\\n", "\n")[:2200],
                        "caption": str(it.get("caption") or "").replace("\\n", "\n")[:2200],
                        "diisi_ai": True,
                    }
        if not hasil:
            raise HTTPException(status_code=502, detail="Jawaban AI tidak terbaca. Coba lagi.")

        updates = {}
        for i, r in enumerate(rows):
            if r.get("no") in hasil:
                rows[i] = {**r, **hasil[r["no"]]}
                updates[f"rows.{i}"] = rows[i]
        if not updates:
            raise HTTPException(status_code=502, detail="Jawaban AI tidak cocok dengan baris. Coba lagi.")
        updates["updated_at"] = now_iso()
        await db.batch_plans.update_one({"id": plan_id}, {"$set": updates})

        rendered = _with_prompts({**plan, "rows": [r for r in rows if r.get("no") in hasil]},
                                 brand, list(products.values()))
        return {"baris": rendered["rows"]}

    return router
