"""Shapes for the agency client record, its Brand DNA and its products.

Nothing here mirrors the old self-service model: there are no credits, no plans
and no vouchers. A client is one brand with one running feed quota.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


# ── status ───────────────────────────────────────────────────────────────────
# Deliberately not a gate. A paid client can use everything the moment payment
# clears; the status is a badge the owner flips so they know who still needs a
# first WhatsApp conversation.
STATUS_KUNING = "kuning"      # paid, waiting for the owner to say hello
STATUS_HIJAU = "hijau"        # owner has approved and made contact
STATUS_SELESAI = "selesai"    # counter reached the total
STATUS_NONAKTIF = "nonaktif"  # package finished and not renewed

ALL_STATUSES = (STATUS_KUNING, STATUS_HIJAU, STATUS_SELESAI, STATUS_NONAKTIF)

STATUS_LABEL = {
    STATUS_KUNING: "Menunggu approval",
    STATUS_HIJAU: "Aktif dikerjakan",
    STATUS_SELESAI: "Paket selesai",
    STATUS_NONAKTIF: "Tidak aktif",
}


class ClientProfileIn(BaseModel):
    """Step 1 of onboarding. Only the nickname is required — it is what the
    dashboard greets them with, and an empty greeting reads as a broken page."""
    nickname: str = ""
    whatsapp: str = ""
    instagram: str = ""
    tiktok: str = ""
    store_links: List[str] = []
    reference_accounts: List[str] = []
    contact_time: str = ""


class BrandDnaIn(BaseModel):
    """The simplified Brand DNA.

    The old model asked for 12 visual styles, 30 market positionings and 38
    personality traits. A warung owner cannot answer "brand archetype", and most
    of those answers never reached the image prompt anyway. What survives here is
    only what actually changes a photo: who it is for, how it should feel, how it
    is lit, what it sits on, how it is framed — plus a free-text field for
    everything a preset list can never hold.
    """
    brand_name: str = ""
    category: str = ""
    logo_base64: Optional[str] = None
    colors: List[str] = Field(default_factory=list)   # max 3, hex

    audience_age: str = ""                            # one bucket
    audience_who: List[str] = Field(default_factory=list)

    mood: str = ""            # "hangat & ramah", "mewah & elegan", ...
    lighting: str = ""        # "cahaya matahari pagi", "studio putih bersih", ...
    materials: List[str] = Field(default_factory=list)  # marmer, kayu, linen...
    composition: str = ""     # "produk dominan", "banyak ruang kosong", ...
    caption_tone: str = ""    # how the caption should sound

    notes: str = ""                                   # free text
    donts: List[str] = Field(default_factory=list)    # picked from a list
    donts_notes: str = ""                             # ...and anything else


class ClientProductIn(BaseModel):
    name: str
    photo_base64: Optional[str] = None
    description: str = ""
    allocation: int = 0       # how many of the package's feeds go to this product


class AllocationIn(BaseModel):
    """Whole-basket rebalance: {product_id: feeds}. Sent as one map so the total
    can be validated against the package in a single step."""
    allocation: dict = Field(default_factory=dict)


class AdminClientPatch(BaseModel):
    """Every field the owner may override by hand. All optional — the Admin
    Panel sends only what changed."""
    status: Optional[str] = None
    counter: Optional[int] = None
    total_feeds: Optional[int] = None
    drive_link: Optional[str] = None
    nickname: Optional[str] = None
    instagram: Optional[str] = None
    tiktok: Optional[str] = None
    contact_time: Optional[str] = None
    note: Optional[str] = None
