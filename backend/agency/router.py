"""Agency endpoints: /api/client/* for the buyer, /api/admin/clients/* for the owner.

Built with build_router() so server.py keeps ownership of auth, the db handle,
photo compression and the Telegram transport — this module only decides what an
agency client is allowed to do with them.
"""

import logging
import re as _re
import uuid
from typing import Callable, Optional

from fastapi import APIRouter, Depends, HTTPException

from .models import (
    ALL_STATUSES, STATUS_HIJAU, STATUS_KUNING, STATUS_NONAKTIF, STATUS_LABEL,
    AdminClientPatch, AllocationIn, BrandDnaIn, ClientProductIn, ClientProfileIn,
)
from . import store

logger = logging.getLogger(__name__)

MAX_COLORS = 3
MAX_PRODUCTS = 30


def build_router(
    get_current_user: Callable,
    require_admin: Callable,
    db,
    compress_photo: Callable,
    telegram_api: Optional[Callable] = None,
    group_chat_id: str = "",
) -> APIRouter:
    router = APIRouter()

    # ── shared shaping ───────────────────────────────────────────────────────

    async def _effective_user(user: dict) -> dict:
        """Whose dashboard this request is about.

        In "lihat sebagai klien" the owner drives the real client screens, so the
        /client/* endpoints have to answer as that client. get_current_user only
        sets content_user_id for admins and only for a client that exists, so a
        non-admin can never reach anyone else's data through this.
        """
        uid = user.get("content_user_id")
        if not uid or uid == user.get("id"):
            return user
        target = await db.users.find_one(
            {"id": uid}, {"_id": 0, "password_hash": 0, "admin_pin_hash": 0}
        )
        return target or user

    async def _client_payload(user: dict) -> dict:
        """Everything the client dashboard needs, in one round trip.

        The dashboard is the first screen after payment and the one clients
        reopen most; splitting this into four calls would show four separate
        loading states on a slow connection.
        """
        client = await store.ensure_client(db, user)
        brand = await db.brand_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
        products = await db.products.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", 1).to_list(MAX_PRODUCTS)
        comp = await store.completeness(db, user["id"], client)

        return {
            "client": {**client, "status_label": STATUS_LABEL.get(client.get("status"), "")},
            "brand": brand,
            "products": products,
            "kelengkapan": comp,
            "is_admin": user.get("role") == "admin",
        }

    # ── client: overview ─────────────────────────────────────────────────────

    @router.get("/client/overview")
    async def client_overview(current_user: dict = Depends(get_current_user)):
        return await _client_payload(await _effective_user(current_user))

    # ── client: profile (onboarding step 1) ──────────────────────────────────

    @router.put("/client/profile")
    async def update_profile(payload: ClientProfileIn, current_user: dict = Depends(get_current_user)):
        current_user = await _effective_user(current_user)
        nickname = payload.nickname.strip()
        if not nickname:
            raise HTTPException(status_code=400, detail="Nama panggilan wajib diisi")
        if len(nickname) > 40:
            raise HTTPException(status_code=400, detail="Nama panggilan terlalu panjang")

        await store.ensure_client(db, current_user)
        wa = _re.sub(r"\D", "", payload.whatsapp or "")
        if wa:
            if wa.startswith("0"):
                wa = "62" + wa[1:]
            elif not wa.startswith("62"):
                wa = "62" + wa
            # Mirrored onto the user doc too: checkout reads it from there when
            # building the Telegram payment message.
            await db.users.update_one({"id": current_user["id"]}, {"$set": {"whatsapp": wa}})

        await store.touch(db, current_user["id"], {
            "nickname": nickname,
            **({"whatsapp": wa} if wa else {}),
            "instagram": payload.instagram.strip().lstrip("@"),
            "tiktok": payload.tiktok.strip().lstrip("@"),
            "store_links": [s.strip() for s in payload.store_links if s.strip()][:5],
            "reference_accounts": [s.strip().lstrip("@") for s in payload.reference_accounts if s.strip()][:5],
            "contact_time": payload.contact_time.strip()[:120],
        })
        await store.log_activity(db, current_user["id"], "profil", f"nickname={nickname}")
        return await _maybe_notify(current_user)

    # ── client: brand DNA (onboarding step 2) ────────────────────────────────

    @router.get("/client/brand-dna")
    async def get_brand_dna(current_user: dict = Depends(get_current_user)):
        current_user = await _effective_user(current_user)
        return await db.brand_profiles.find_one({"user_id": current_user["id"]}, {"_id": 0}) or {}

    @router.put("/client/brand-dna")
    async def update_brand_dna(payload: BrandDnaIn, current_user: dict = Depends(get_current_user)):
        current_user = await _effective_user(current_user)
        if not payload.brand_name.strip():
            raise HTTPException(status_code=400, detail="Nama brand wajib diisi")

        colors = [c.strip() for c in payload.colors if c.strip()][:MAX_COLORS]
        doc = {
            "user_id": current_user["id"],
            "brand_name": payload.brand_name.strip(),
            "category": payload.category.strip(),
            "colors": colors,
            # The prompt builders still read color_primary/secondary, so the new
            # list is mirrored onto them rather than forcing a rewrite of every
            # builder in server.py.
            "color_primary": colors[0] if colors else "#0B3D2E",
            "color_secondary": colors[1] if len(colors) > 1 else "#FDFBF7",
            "color_accent": colors[2] if len(colors) > 2 else "",
            "audience_age": payload.audience_age.strip(),
            "audience_who": [w.strip() for w in payload.audience_who if w.strip()][:4],
            # Prompt builders in server.py still read target_audience as one
            # sentence, so the structured answers are joined into it rather than
            # rewriting every builder.
            "target_audience": ", ".join(
                [payload.audience_age.strip()] + [w.strip() for w in payload.audience_who if w.strip()]
            ).strip(", "),
            "mood": payload.mood.strip(),
            "lighting": payload.lighting.strip(),
            "materials": [m.strip() for m in payload.materials if m.strip()][:3],
            "composition": payload.composition.strip(),
            "caption_tone": payload.caption_tone.strip(),
            "notes": payload.notes.strip(),
            "donts": [d.strip() for d in payload.donts if d.strip()][:8],
            "donts_notes": payload.donts_notes.strip(),
            "schema": "agency_v1",
            "updated_at": store.now_iso(),
        }
        if payload.logo_base64:
            doc["logo_base64"] = compress_photo(payload.logo_base64)

        existing = await db.brand_profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
        if existing:
            await db.brand_profiles.update_one({"user_id": current_user["id"]}, {"$set": doc})
            # Set on the update path too, not just on create: an account that
            # already had a profile from the old model would otherwise keep
            # has_brand_profile=False and be bounced back into onboarding forever.
            await db.users.update_one({"id": current_user["id"]}, {"$set": {"has_brand_profile": True}})
            await store.log_activity(db, current_user["id"], "brand_dna", "diubah")
        else:
            doc["id"] = str(uuid.uuid4())
            doc["created_at"] = store.now_iso()
            await db.brand_profiles.insert_one(dict(doc))
            await db.users.update_one({"id": current_user["id"]}, {"$set": {"has_brand_profile": True}})
            await store.log_activity(db, current_user["id"], "brand_dna", "dibuat")

        return await _maybe_notify(current_user)

    # ── client: products (onboarding step 3) ─────────────────────────────────

    @router.get("/client/products")
    async def list_products(current_user: dict = Depends(get_current_user)):
        current_user = await _effective_user(current_user)
        return await db.products.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", 1).to_list(MAX_PRODUCTS)

    @router.post("/client/products")
    async def add_product(payload: ClientProductIn, current_user: dict = Depends(get_current_user)):
        current_user = await _effective_user(current_user)
        if not payload.name.strip():
            raise HTTPException(status_code=400, detail="Nama produk wajib diisi")
        count = await db.products.count_documents({"user_id": current_user["id"]})
        if count >= MAX_PRODUCTS:
            raise HTTPException(status_code=400, detail=f"Maksimal {MAX_PRODUCTS} produk")

        doc = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "name": payload.name.strip(),
            "description": payload.description.strip(),
            "photo_base64": compress_photo(payload.photo_base64) if payload.photo_base64 else None,
            # A new product starts at zero on purpose: the client rebalances the
            # basket themselves rather than us silently taking feeds off another.
            "allocation": 0,
            "created_at": store.now_iso(),
        }
        await db.products.insert_one(dict(doc))
        await store.log_activity(db, current_user["id"], "produk", f"tambah: {doc['name']}")
        doc.pop("photo_base64", None)
        return {"ok": True, "id": doc["id"]}

    @router.put("/client/products/{product_id}")
    async def edit_product(product_id: str, payload: ClientProductIn, current_user: dict = Depends(get_current_user)):
        current_user = await _effective_user(current_user)
        fields = {
            "name": payload.name.strip(),
            "description": payload.description.strip(),
        }
        if payload.photo_base64 and not payload.photo_base64.startswith("__keep"):
            fields["photo_base64"] = compress_photo(payload.photo_base64)

        res = await db.products.update_one(
            {"id": product_id, "user_id": current_user["id"]}, {"$set": fields}
        )
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
        await store.log_activity(db, current_user["id"], "produk", f"ubah: {fields['name']}")
        return {"ok": True}

    @router.delete("/client/products/{product_id}")
    async def remove_product(product_id: str, current_user: dict = Depends(get_current_user)):
        current_user = await _effective_user(current_user)
        res = await db.products.delete_one({"id": product_id, "user_id": current_user["id"]})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
        await store.log_activity(db, current_user["id"], "produk", "hapus")
        return {"ok": True}

    # ── client: allocation (onboarding step 4) ───────────────────────────────

    @router.put("/client/allocation")
    async def set_allocation(payload: AllocationIn, current_user: dict = Depends(get_current_user)):
        current_user = await _effective_user(current_user)
        """Split the package across products.

        Validated as a basket, not per product: the sum has to land exactly on
        the package total, otherwise feeds go missing or get over-promised.
        """
        client = await store.ensure_client(db, current_user)
        total = int(client.get("total_feeds") or 0)

        # No package yet — an owner testing the flow, or a client whose payment
        # has not been approved. Refusing here trapped them at the last step of
        # onboarding with no way out; there is simply nothing to split, so the
        # products are saved at zero and the split happens when the quota lands.
        if not total:
            for p in await db.products.find({"user_id": current_user["id"]}, {"_id": 0, "id": 1}).to_list(MAX_PRODUCTS):
                await db.products.update_one(
                    {"id": p["id"], "user_id": current_user["id"]}, {"$set": {"allocation": 0}}
                )
            return await _maybe_notify(current_user)

        products = await db.products.find({"user_id": current_user["id"]}, {"_id": 0, "photo_base64": 0}).to_list(MAX_PRODUCTS)
        ids = {p["id"] for p in products}
        wanted = {k: max(0, int(v or 0)) for k, v in (payload.allocation or {}).items() if k in ids}

        if sum(wanted.values()) != total:
            raise HTTPException(
                status_code=400,
                detail=f"Total pembagian harus pas {total} feed (sekarang {sum(wanted.values())})",
            )

        for pid in ids:
            await db.products.update_one(
                {"id": pid, "user_id": current_user["id"]},
                {"$set": {"allocation": wanted.get(pid, 0)}},
            )
        await store.log_activity(db, current_user["id"], "alokasi", str(wanted))
        return await _maybe_notify(current_user)

    # ── client: orders ───────────────────────────────────────────────────────

    @router.get("/client/orders")
    async def client_orders(current_user: dict = Depends(get_current_user)):
        current_user = await _effective_user(current_user)
        return await store.list_orders(db, current_user["id"])

    # ── shared: fire the group notification once everything is filled ────────

    async def _maybe_notify(user: dict) -> dict:
        payload = await _client_payload(user)
        if payload["kelengkapan"]["lengkap"]:
            await store.notify_group_ready(
                db, telegram_api, group_chat_id,
                {**payload["client"], "whatsapp": payload["client"].get("whatsapp") or user.get("whatsapp", "")},
                payload["kelengkapan"],
            )
            payload = await _client_payload(user)
        return payload

    # ── admin ────────────────────────────────────────────────────────────────

    @router.get("/admin/clients")
    async def admin_clients(admin_user: dict = Depends(require_admin)):
        """Client roster for the Admin Panel, with the incompleteness flag the
        owner uses to decide who to chase on WhatsApp."""
        clients = await db.clients.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
        # The owner's own record gets created the moment they open a client screen
        # (ensure_client), and listing themselves among their customers is noise.
        admin_ids = {u["id"] for u in await db.users.find({"role": "admin"}, {"_id": 0, "id": 1}).to_list(50)}
        out = []
        for c in clients:
            if c["user_id"] in admin_ids:
                continue
            comp = await store.completeness(db, c["user_id"], c)
            out.append({
                **c,
                "status_label": STATUS_LABEL.get(c.get("status"), ""),
                "kelengkapan": comp,
            })
        return out

    @router.get("/admin/clients/{user_id}")
    async def admin_client_detail(user_id: str, admin_user: dict = Depends(require_admin)):
        client = await store.get_client(db, user_id)
        if not client:
            raise HTTPException(status_code=404, detail="Klien tidak ditemukan")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0, "admin_pin_hash": 0})
        brand = await db.brand_profiles.find_one({"user_id": user_id}, {"_id": 0})
        products = await db.products.find({"user_id": user_id}, {"_id": 0}).sort("created_at", 1).to_list(MAX_PRODUCTS)
        orders = await store.list_orders(db, user_id)
        activity = await db.client_activity.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(60)
        return {
            "client": {**client, "status_label": STATUS_LABEL.get(client.get("status"), "")},
            "user": user,
            "brand": brand,
            "products": products,
            "orders": orders,
            "activity": activity,
            "kelengkapan": await store.completeness(db, user_id, client),
        }

    @router.patch("/admin/clients/{user_id}")
    async def admin_patch_client(user_id: str, payload: AdminClientPatch, admin_user: dict = Depends(require_admin)):
        client = await store.get_client(db, user_id)
        if not client:
            raise HTTPException(status_code=404, detail="Klien tidak ditemukan")

        fields = {}
        if payload.status is not None:
            if payload.status not in ALL_STATUSES:
                raise HTTPException(status_code=400, detail="Status tidak dikenal")
            fields["status"] = payload.status
        for key in ("drive_link", "nickname", "instagram", "tiktok", "contact_time", "note"):
            val = getattr(payload, key)
            if val is not None:
                fields[key] = val.strip()
        if payload.total_feeds is not None:
            # Free-form on purpose: the owner hands out bonuses and corrects
            # mistakes, and a cap here would just mean editing the database.
            fields["total_feeds"] = max(0, int(payload.total_feeds))

        if fields:
            await store.touch(db, user_id, fields)
        if payload.counter is not None:
            await store.set_counter(db, user_id, payload.counter)

        await store.log_activity(db, user_id, "admin", f"diubah admin: {list(fields) + (['counter'] if payload.counter is not None else [])}")
        return await store.get_client(db, user_id)

    @router.post("/admin/clients/{user_id}/deactivate")
    async def admin_deactivate(user_id: str, admin_user: dict = Depends(require_admin)):
        await store.touch(db, user_id, {"status": STATUS_NONAKTIF})
        await store.log_activity(db, user_id, "admin", "akun dinonaktifkan")
        return await store.get_client(db, user_id)

    @router.post("/admin/clients/{user_id}/activate")
    async def admin_activate(user_id: str, admin_user: dict = Depends(require_admin)):
        """Reactivation goes straight to green: the data is unchanged and the
        owner already knows this client (spec round 6)."""
        await store.touch(db, user_id, {"status": STATUS_HIJAU})
        await store.log_activity(db, user_id, "admin", "akun diaktifkan")
        return await store.get_client(db, user_id)

    @router.get("/admin/clients/{user_id}/preview")
    async def admin_preview_client(user_id: str, admin_user: dict = Depends(require_admin)):
        """Exactly what that client's dashboard would show.

        A read-only view rather than an impersonation token: the owner wants to
        see the client screen to judge the design, and issuing a real session as
        another account to do that would be a far bigger door than the job needs.
        """
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0, "admin_pin_hash": 0})
        if not user:
            raise HTTPException(status_code=404, detail="Klien tidak ditemukan")
        payload = await _client_payload(user)
        return {**payload, "preview": True, "previewed_user": {"id": user["id"], "name": user.get("name", ""), "email": user.get("email", "")}}

    @router.get("/admin/clients-stats")
    async def admin_stats(admin_user: dict = Depends(require_admin)):
        admin_ids = {u["id"] for u in await db.users.find({"role": "admin"}, {"_id": 0, "id": 1}).to_list(50)}
        clients = [c for c in await db.clients.find({}, {"_id": 0}).to_list(1000)
                   if c["user_id"] not in admin_ids]
        delivered = sum(int(c.get("counter") or 0) for c in clients)
        by_status = {}
        incomplete = 0
        for c in clients:
            by_status[c.get("status", "?")] = by_status.get(c.get("status", "?"), 0) + 1
            comp = await store.completeness(db, c["user_id"], c)
            if not comp["lengkap"]:
                incomplete += 1
        return {
            "total_klien": len(clients),
            "per_status": by_status,
            "feed_terkirim": delivered,
            "menunggu_approval": by_status.get(STATUS_KUNING, 0),
            "data_belum_lengkap": incomplete,
        }

    return router
