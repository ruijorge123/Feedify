"""Data access for agency clients.

One client == one user == one brand. The client record holds the running quota
(counter / total_feeds) and the owner-managed status; the brand and the products
stay in their own collections so the existing prompt builders keep working.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from .models import (
    STATUS_HIJAU, STATUS_KUNING, STATUS_NONAKTIF, STATUS_SELESAI,
)

logger = logging.getLogger(__name__)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_client_doc(user: dict) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "status": STATUS_KUNING,
        "counter": 0,
        "total_feeds": 0,
        "drive_link": "",
        "nickname": "",
        "instagram": "",
        "tiktok": "",
        "store_links": [],
        "reference_accounts": [],
        "contact_time": "",
        "whatsapp": user.get("whatsapp", ""),
        "note": "",
        "onboarding_notified": False,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }


async def get_client(db, user_id: str) -> Optional[dict]:
    return await db.clients.find_one({"user_id": user_id}, {"_id": 0})


async def ensure_client(db, user: dict) -> dict:
    """Return the caller's client record, creating an empty one if missing.

    Accounts that existed before the agency rebuild have no client row, and the
    owner's own admin account never buys a package — both must still be able to
    open the dashboard rather than hit a 404.
    """
    existing = await get_client(db, user["id"])
    if existing:
        return existing
    doc = new_client_doc(user)
    await db.clients.insert_one(dict(doc))
    return doc


async def touch(db, user_id: str, fields: dict) -> None:
    fields = {**fields, "updated_at": now_iso()}
    await db.clients.update_one({"user_id": user_id}, {"$set": fields})


async def add_package(db, user: dict, feeds: int, package_name: str, order_id: str) -> dict:
    """Apply a paid package to the client.

    Stacking rule (spec round 3/7): an ACTIVE client's purchase adds to the
    remaining quota and sends them back to yellow so the owner sees the top-up.
    A client who had gone inactive starts a fresh count instead — their previous
    package is done and carrying its numerator forward would misreport the work.
    """
    client = await ensure_client(db, user)
    feeds = max(0, int(feeds or 0))
    was_inactive = client.get("status") in (STATUS_NONAKTIF, STATUS_SELESAI)

    if was_inactive:
        counter, total = 0, feeds
    else:
        counter, total = int(client.get("counter") or 0), int(client.get("total_feeds") or 0) + feeds

    await touch(db, user["id"], {
        "counter": counter,
        "total_feeds": total,
        "status": STATUS_KUNING,
        "email": user.get("email", client.get("email", "")),
        "name": user.get("name", client.get("name", "")),
    })
    await db.client_orders.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "order_id": order_id,
        "package_name": package_name,
        "feeds": feeds,
        "kind": "perpanjang" if was_inactive else ("tambah" if client.get("total_feeds") else "pertama"),
        "created_at": now_iso(),
    })
    return await get_client(db, user["id"])


async def list_orders(db, user_id: str) -> list:
    return await db.client_orders.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)


async def set_counter(db, user_id: str, counter: int) -> dict:
    """Move the delivered count, clamped to the package.

    SELESAI is the one automatic transition in the whole model: reaching the
    total flips it, dropping back below un-flips it, and nothing else touches
    a status the owner set by hand.
    """
    client = await db.clients.find_one({"user_id": user_id}, {"_id": 0})
    if not client:
        return None
    total = int(client.get("total_feeds") or 0)
    counter = max(0, min(int(counter), total)) if total else max(0, int(counter))

    status = client.get("status")
    if total and counter >= total:
        status = STATUS_SELESAI
    elif status == STATUS_SELESAI:
        status = STATUS_HIJAU

    await touch(db, user_id, {"counter": counter, "status": status})
    return await get_client(db, user_id)


# ── completeness ─────────────────────────────────────────────────────────────

async def completeness(db, user_id: str, client: dict) -> dict:
    """What the client still has to fill in before the owner can start.

    Drives both the client's own nudge and the owner's "who is holding things
    up" list, so it is computed in one place and never duplicated in the UI.
    """
    brand = await db.brand_profiles.find_one({"user_id": user_id}, {"_id": 0})
    products = await db.products.find({"user_id": user_id}, {"_id": 0, "photo_base64": 0}).to_list(200)

    total = int((client or {}).get("total_feeds") or 0)
    allocated = sum(int(p.get("allocation") or 0) for p in products)

    checks = {
        "profil": bool((client or {}).get("nickname")),
        "brand_dna": bool(brand and brand.get("brand_name")),
        "produk": len(products) > 0,
        # Nothing to allocate without a package, so it cannot be "incomplete"
        # either — otherwise a client waiting on approval is permanently flagged.
        "alokasi": allocated == total if total else True,
    }
    return {
        **checks,
        "lengkap": all(checks.values()),
        "produk_count": len(products),
        "alokasi_terpakai": allocated,
        "alokasi_total": total,
    }


# ── telegram: "a client finished their data" ─────────────────────────────────

async def notify_group_ready(db, telegram_api, group_chat_id: str, client: dict, comp: dict) -> bool:
    """Tell the owner's group that a client is ready to be contacted.

    Fires once per client (a flag on the record), because the owner reads this
    as "go say hello", not as a change feed. Approval itself stays in the
    owner's private chat — the group is informational only (spec round 8).
    """
    if not group_chat_id or not telegram_api:
        return False
    if client.get("onboarding_notified"):
        return False

    text = (
        "\U0001F7E2 Data klien lengkap\n"
        f"Nama: {client.get('name') or '-'}\n"
        f"Panggilan: {client.get('nickname') or '-'}\n"
        f"Email: {client.get('email') or '-'}\n"
        f"WhatsApp: {client.get('whatsapp') or '-'}\n"
        f"Instagram: {client.get('instagram') or '-'}\n"
        f"Paket: {client.get('counter', 0)}/{client.get('total_feeds', 0)} feed\n"
        f"Produk: {comp.get('produk_count', 0)}\n"
        f"Waktu enak dihubungi: {client.get('contact_time') or '-'}\n\n"
        "Siap dihubungi di WhatsApp."
    )
    try:
        res = await telegram_api("sendMessage", data={"chat_id": group_chat_id, "text": text})
        ok = bool(res and res.get("ok"))
    except Exception as e:
        logger.error(f"Group notify failed for client {client.get('user_id')}: {e}")
        ok = False

    if ok:
        await touch(db, client["user_id"], {"onboarding_notified": True})
    return ok


# ── activity log ─────────────────────────────────────────────────────────────

async def log_activity(db, user_id: str, action: str, detail: str = "") -> None:
    """Best-effort trail so the owner can see what a client changed and when.

    Never allowed to break the write it is describing — a missing log line is a
    far smaller problem than a failed save.
    """
    try:
        await db.client_activity.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "action": action,
            "detail": detail[:500],
            "created_at": now_iso(),
        })
    except Exception as e:
        logger.warning(f"activity log failed ({action}) for {user_id}: {e}")
