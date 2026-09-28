"""Brand Saya: the owner's own brands — own products, demo brands, prospect samples.

Each one is stored exactly like a client: a `clients` record plus brand_profiles
and products keyed by its user_id. That is deliberate: the client picker
(X-Client-Id), every generator and Produksi Batch already know how to work on a
client, so an internal brand needs no special case anywhere downstream.

What makes it internal is `internal: True` on the client record. There is no
account behind the id (it never appears in `users`, so nobody can log in as
it), it is left out of the client roster and stats, and nothing here touches
the Telegram group or the activity log — those are for paying clients.
"""

import uuid
from typing import Callable, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .models import BrandDnaIn, ClientProductIn
from . import store

MAX_BRANDS = 100
MAX_PRODUCTS = 30
ID_PREFIX = "int_"


class BrandSayaIn(BaseModel):
    nama: str


def _colors(brand: dict) -> List[str]:
    colors = [c for c in (brand.get("colors") or []) if c]
    if not colors:
        colors = [c for c in (brand.get("color_primary"), brand.get("color_secondary"), brand.get("color_accent")) if c]
    return colors[:3]


def build_router(require_admin: Callable, db, compress_photo: Callable) -> APIRouter:
    router = APIRouter()

    async def _get(bid: str) -> dict:
        c = await db.clients.find_one({"user_id": bid, "internal": True}, {"_id": 0})
        if not c:
            raise HTTPException(status_code=404, detail="Brand tidak ditemukan")
        return c

    async def _summary(c: dict) -> dict:
        uid = c["user_id"]
        brand = await db.brand_profiles.find_one({"user_id": uid}, {"_id": 0, "logo_base64": 0}) or {}
        return {
            "user_id": uid,
            "nama": c.get("nickname") or c.get("name") or "",
            "brand_name": brand.get("brand_name", ""),
            "category": brand.get("category", ""),
            "mood": brand.get("mood", ""),
            "colors": _colors(brand),
            "product_count": await db.products.count_documents({"user_id": uid}),
            "created_at": c.get("created_at", ""),
        }

    async def _create(nama: str, admin_user: dict, extra: dict = None) -> dict:
        nama = nama.strip()
        if not nama:
            raise HTTPException(status_code=400, detail="Nama brand wajib diisi")
        if len(nama) > 60:
            raise HTTPException(status_code=400, detail="Nama brand terlalu panjang")
        if await db.clients.count_documents({"internal": True}) >= MAX_BRANDS:
            raise HTTPException(status_code=400, detail=f"Maksimal {MAX_BRANDS} brand")
        uid = ID_PREFIX + uuid.uuid4().hex
        doc = store.new_client_doc({"id": uid, "name": nama})
        doc.update({
            "nickname": nama,
            "status": "internal",
            "internal": True,
            "owner_id": admin_user["id"],
            **(extra or {}),
        })
        await db.clients.insert_one(dict(doc))
        return doc

    # ── list / create / rename / delete ─────────────────────────────────────

    @router.get("/admin/brand-saya")
    async def list_brands(admin_user: dict = Depends(require_admin)):
        rows = await db.clients.find({"internal": True}, {"_id": 0}).sort("created_at", -1).to_list(MAX_BRANDS)
        # The old single-brand Brand Kit lives on the admin's own id; offered for
        # a one-time copy into Brand Saya so nothing set up there is lost.
        legacy = await db.brand_profiles.find_one({"user_id": admin_user["id"]}, {"_id": 1})
        return {
            "brands": [await _summary(c) for c in rows],
            "brand_lama": bool(legacy),
            "sudah_impor": any(c.get("imported_from") == admin_user["id"] for c in rows),
        }

    @router.post("/admin/brand-saya")
    async def create_brand(payload: BrandSayaIn, admin_user: dict = Depends(require_admin)):
        return await _summary(await _create(payload.nama, admin_user))

    @router.patch("/admin/brand-saya/{bid}")
    async def rename_brand(bid: str, payload: BrandSayaIn, admin_user: dict = Depends(require_admin)):
        await _get(bid)
        nama = payload.nama.strip()
        if not nama or len(nama) > 60:
            raise HTTPException(status_code=400, detail="Nama brand 1–60 karakter")
        await store.touch(db, bid, {"nickname": nama, "name": nama})
        return await _summary(await _get(bid))

    @router.delete("/admin/brand-saya/{bid}")
    async def delete_brand(bid: str, admin_user: dict = Depends(require_admin)):
        await _get(bid)
        await db.products.delete_many({"user_id": bid})
        await db.brand_profiles.delete_many({"user_id": bid})
        await db.batch_plans.delete_many({"client_id": bid})
        await db.clients.delete_one({"user_id": bid, "internal": True})
        return {"ok": True}

    # ── one-time import of the old Brand Kit ────────────────────────────────

    @router.post("/admin/brand-saya/impor")
    async def import_legacy(admin_user: dict = Depends(require_admin)):
        """Copy — never move — the admin's own brand and products into a new
        Brand Saya entry. The originals stay where they are, so anything that
        still reads them keeps working."""
        aid = admin_user["id"]
        legacy = await db.brand_profiles.find_one({"user_id": aid, "is_active": True}, {"_id": 0})
        if not legacy:
            legacy = await db.brand_profiles.find_one({"user_id": aid}, {"_id": 0})
        if not legacy:
            raise HTTPException(status_code=404, detail="Tidak ada brand lama untuk diimpor")

        c = await _create(legacy.get("brand_name") or "Brand lama", admin_user, {"imported_from": aid})
        uid = c["user_id"]

        brand = {**legacy, "id": str(uuid.uuid4()), "user_id": uid, "is_active": True, "updated_at": store.now_iso()}
        # The old form stored two colours and a list of don'ts under other names;
        # map them onto the fields the new Brand DNA form edits.
        if not brand.get("colors"):
            brand["colors"] = _colors(legacy)
        if not brand.get("donts") and legacy.get("brand_donts"):
            brand["donts"] = [d for d in legacy["brand_donts"] if d][:8]
        await db.brand_profiles.insert_one(brand)

        products = await db.products.find({"user_id": aid}, {"_id": 0}).sort("created_at", 1).to_list(MAX_PRODUCTS)
        for p in products:
            desc = p.get("description") or p.get("usp") or ", ".join((p.get("benefits") or [])[:4])
            await db.products.insert_one({
                **p,
                "id": str(uuid.uuid4()),
                "user_id": uid,
                "description": desc or "",
                "allocation": 0,
                "created_at": store.now_iso(),
            })
        return await _summary(c)

    # ── Brand DNA ────────────────────────────────────────────────────────────

    @router.get("/admin/brand-saya/{bid}/brand-dna")
    async def get_dna(bid: str, admin_user: dict = Depends(require_admin)):
        await _get(bid)
        return await db.brand_profiles.find_one({"user_id": bid}, {"_id": 0}) or {}

    @router.put("/admin/brand-saya/{bid}/brand-dna")
    async def save_dna(bid: str, payload: BrandDnaIn, admin_user: dict = Depends(require_admin)):
        await _get(bid)
        if not payload.brand_name.strip():
            raise HTTPException(status_code=400, detail="Nama brand wajib diisi")
        doc = store.build_brand_dna_doc(bid, payload, compress_photo)
        if await db.brand_profiles.find_one({"user_id": bid}, {"_id": 1}):
            await db.brand_profiles.update_one({"user_id": bid}, {"$set": doc})
        else:
            await db.brand_profiles.insert_one({**doc, "id": str(uuid.uuid4()), "is_active": True, "created_at": store.now_iso()})
        return await db.brand_profiles.find_one({"user_id": bid}, {"_id": 0})

    # ── products ─────────────────────────────────────────────────────────────

    @router.get("/admin/brand-saya/{bid}/produk")
    async def list_products(bid: str, admin_user: dict = Depends(require_admin)):
        await _get(bid)
        return await db.products.find({"user_id": bid}, {"_id": 0}).sort("created_at", 1).to_list(MAX_PRODUCTS)

    @router.post("/admin/brand-saya/{bid}/produk")
    async def add_product(bid: str, payload: ClientProductIn, admin_user: dict = Depends(require_admin)):
        await _get(bid)
        if not payload.name.strip():
            raise HTTPException(status_code=400, detail="Nama produk wajib diisi")
        if await db.products.count_documents({"user_id": bid}) >= MAX_PRODUCTS:
            raise HTTPException(status_code=400, detail=f"Maksimal {MAX_PRODUCTS} produk")
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": bid,
            "name": payload.name.strip()[:80],
            "description": payload.description.strip()[:1000],
            "photo_base64": compress_photo(payload.photo_base64) if payload.photo_base64 else None,
            # No package to split for an internal brand: allocation is just the
            # product's share when Produksi Batch spreads the feeds.
            "allocation": max(0, min(60, int(payload.allocation or 0))),
            "created_at": store.now_iso(),
        }
        await db.products.insert_one(dict(doc))
        return {"ok": True, "id": doc["id"]}

    @router.put("/admin/brand-saya/{bid}/produk/{pid}")
    async def edit_product(bid: str, pid: str, payload: ClientProductIn, admin_user: dict = Depends(require_admin)):
        await _get(bid)
        if not payload.name.strip():
            raise HTTPException(status_code=400, detail="Nama produk wajib diisi")
        fields = {
            "name": payload.name.strip()[:80],
            "description": payload.description.strip()[:1000],
            "allocation": max(0, min(60, int(payload.allocation or 0))),
        }
        if payload.photo_base64 and not payload.photo_base64.startswith("__keep"):
            fields["photo_base64"] = compress_photo(payload.photo_base64)
        res = await db.products.update_one({"id": pid, "user_id": bid}, {"$set": fields})
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
        return {"ok": True}

    @router.delete("/admin/brand-saya/{bid}/produk/{pid}")
    async def delete_product(bid: str, pid: str, admin_user: dict = Depends(require_admin)):
        await _get(bid)
        res = await db.products.delete_one({"id": pid, "user_id": bid})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
        return {"ok": True}

    return router
