"""
Feedify pricing & plan configuration.
Single source of truth — edit values here, used by both API and frontend (via /api/config).
"""

PLANS = {
    "starter": {
        "id": "starter",
        "name": "Starter",
        "tagline": "UMKM yang baru mulai",
        "price_idr": 99000,  # placeholder — owner can edit
        "price_label": "Rp 99.000",
        "billing_period": "bulan",
        "image_credits_monthly": 30,
        "popular": False,
        "description": "Cocok untuk UMKM yang baru mulai, posting beberapa kali seminggu.",
        "features": [
            "Akses penuh semua dashboard",
            "Brand Profile & Brand Visual DNA tersimpan",
            "Banner, Carousel, F&B Menu, Copywriting",
            "Grid Planner & Content Calendar",
            "Consistency Checker (auto run setelah generate)",
            "Prompt history unlimited",
        ],
        "highlight_features": [],
    },
    "pro": {
        "id": "pro",
        "name": "Pro",
        "tagline": "Posting rutin & aktif",
        "price_idr": 249000,
        "price_label": "Rp 249.000",
        "billing_period": "bulan",
        "image_credits_monthly": 120,
        "popular": True,
        "description": "Cocok untuk UMKM yang posting rutin dan butuh variasi konten lebih banyak.",
        "features": [
            "Semua fitur Starter",
            "Prioritas processing (generate lebih cepat)",
            "Akses early ke fitur baru",
        ],
        "highlight_features": ["Prioritas processing"],
    },
    "business": {
        "id": "business",
        "name": "Business",
        "tagline": "Tim & multi-brand",
        "price_idr": 599000,
        "price_label": "Rp 599.000",
        "billing_period": "bulan",
        "image_credits_monthly": 400,
        "popular": False,
        "description": "Cocok untuk bisnis dengan tim atau multiple brand, volume konten tinggi.",
        "features": [
            "Semua fitur Pro",
            "Multi-brand workspace (kelola > 1 Brand Profile)",
            "Quota tertinggi",
            "Dedicated support",
        ],
        "highlight_features": ["Multi-brand workspace"],
    },
}

PLAN_ORDER = ["starter", "pro", "business"]

# Default new user — assign starter for now (replace with payment flow later)
DEFAULT_PLAN = "starter"

# Top-up package (for over-quota)
TOP_UP_CREDITS = 25
TOP_UP_PRICE_IDR = 49000
TOP_UP_PRICE_LABEL = "Rp 49.000"

# Brand archetypes (single-select)
BRAND_ARCHETYPES = [
    {"id": "expert", "name": "The Expert", "desc": "Otoritatif, fakta-driven, terpercaya."},
    {"id": "friend", "name": "The Friend", "desc": "Hangat, dekat, percakapan sehari-hari."},
    {"id": "rebel", "name": "The Rebel", "desc": "Berani, beda, menantang status quo."},
    {"id": "caregiver", "name": "The Caregiver", "desc": "Penuh perhatian, melindungi, suportif."},
    {"id": "luxury", "name": "The Luxury Icon", "desc": "Eksklusif, premium, sophisticated."},
    {"id": "innovator", "name": "The Innovator", "desc": "Visioner, modern, breaking new ground."},
    {"id": "everyman", "name": "The Everyman", "desc": "Relatable, jujur, untuk semua orang."},
]

# Content purposes for copywriting
CONTENT_PURPOSES = [
    {"id": "awareness", "name": "Awareness / Perkenalan"},
    {"id": "soft_selling", "name": "Soft Selling"},
    {"id": "hard_selling", "name": "Hard Selling / Promo"},
    {"id": "education", "name": "Edukasi"},
    {"id": "engagement", "name": "Engagement"},
]
