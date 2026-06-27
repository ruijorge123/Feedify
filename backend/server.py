from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
import string
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt as pyjwt
import json
import asyncio
try:
    import httpx
    _HTTPX_AVAILABLE = True
except ImportError:
    _HTTPX_AVAILABLE = False

try:
    import certifi
    _CERTIFI_CA = certifi.where()
except ImportError:
    _CERTIFI_CA = None

# Reels video generation modules (optional — requires FAL_KEY + OPENAI_API_KEY)
try:
    from video_service import run_reels_pipeline
    _REELS_ENABLED = True
except ImportError:
    _REELS_ENABLED = False

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(
    mongo_url,
    tls=True,
    tlsCAFile=_CERTIFI_CA,
    tlsAllowInvalidCertificates=False,
    serverSelectionTimeoutMS=10000,
)
db = client[os.environ['DB_NAME']]

# Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', '168'))
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')
GROQ_API_KEY_LOCAL = os.environ.get('GROQ_API_KEY_LOCAL', '')
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM = os.environ.get('SMTP_FROM', '')

# App
app = FastAPI(title="Feedify API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("feedify")


# ============= MODELS =============
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    has_brand_profile: bool = False
    created_at: str


class BrandProfileIn(BaseModel):
    brand_name: str
    category: str
    logo_base64: Optional[str] = None
    color_primary: str = "#0B3D2E"
    color_secondary: str = "#FDFBF7"
    visual_style: str = "minimal-clean"
    target_audience: str = ""
    brand_positioning: str = ""
    brand_personality: List[str] = []
    brand_donts: List[str] = []
    # Expanded fields (D)
    archetype: str = "expert"
    words_always: List[str] = []
    words_avoid: List[str] = []
    signature_phrase: str = ""
    proof_points: List[str] = []


class HumanModelIn(BaseModel):
    """Shared human/model fields for dashboards that support Model & Talent."""
    human_enabled: bool = False
    human_mode: str = "auto"           # "auto" | "manual"
    model_character: str = ""          # e.g. "Wanita Indonesia"
    model_age: str = ""                # e.g. "18-24"
    interaction_style: str = ""        # e.g. "Memegang produk"
    composition_style_human: str = ""  # e.g. "Produk dominan"
    outfit_style: str = ""             # e.g. "Kasual"
    expression_style: str = ""         # e.g. "Senyum"


class BannerPromptIn(BaseModel):
    headline: str
    subheadline: str = ""
    description: str = ""
    call_to_action: str = ""
    features: List[str] = []
    product_name: str = ""
    aspect_ratio: str = "4:5 (Portrait Feed)"
    style_preset: str = "Minimal Clean"
    composition_style: str = "Single hero product, dominant focal point composition."
    placement_rule: str = "center"
    lighting: str = "Diffused softbox lighting, gentle shadows, even illumination"
    expected_images_count: int = 1
    composition_concept: str = ""  # "", or one of CONCEPT_POOLS keys; empty = random
    campaign_goal: str = "brand_awareness"  # launch|promo|testimonial|edukasi|best_seller|brand_awareness|restock
    product_photo_base64: Optional[str] = None
    reference_image_base64: Optional[str] = None
    human_enabled: bool = False
    human_mode: str = "auto"
    model_character: str = ""
    model_age: str = ""
    interaction_style: str = ""
    composition_style_human: str = ""
    outfit_style: str = ""
    expression_style: str = ""
    save: bool = True


class CarouselPromptIn(BaseModel):
    # Section 1 — Content Brief
    topic: str
    target_audience: str = ""
    content_goal: str = "brand_awareness"   # edukasi|promo|launch|testimoni|best_seller|brand_awareness|restock
    final_cta: str = ""

    # Section 2 — Product
    product_name: Optional[str] = None      # optional — from brand profile if omitted

    # Section 3 — Story Structure
    template: str = "problem-solution"
    slide_count: int = 5

    # Section 4 — Visual Direction
    visual_type: str = "human_product"      # product_only|human_product|human_only|graphic_design|mixed
    photo_style: str = "auto"               # studio|lifestyle|ugc|editorial|commercial|flatlay|auto
    style_preset: str = "Minimal Clean"
    visual_priority: str = "balanced"       # product_first|human_first|balanced

    # Section 5 — Reference
    reference_image_base64: Optional[str] = None

    # Section 6 — Talent
    human_enabled: bool = False
    talent_gender: str = "auto"             # female|male|mixed|auto
    talent_ethnicity: str = "auto"          # korean|indonesian|asian|western|auto
    talent_age_group: str = "young_adult"   # teen|young_adult|adult|mature
    talent_role: str = "auto"              # main|supporting|background|auto

    # Section 7 — AI Visual Director
    ai_director_mode: str = "smart"         # simple|smart|advanced
    mood_override: str = ""
    lighting_override: str = ""
    composition_override: str = ""
    camera_style_override: str = ""

    # Layout / misc
    aspect_ratio: str = "1:1 (Square Feed)"
    save: bool = True

    # Backward-compat aliases (ignored by V2 pipeline but kept for old clients)
    campaign_goal: str = "brand_awareness"
    call_to_action: str = ""
    human_mode: str = "auto"
    model_character: str = ""
    model_age: str = ""
    interaction_style: str = ""
    composition_style_human: str = ""
    outfit_style: str = ""
    expression_style: str = ""


class CopywritingIn(BaseModel):
    product_name: str
    product_description: str
    target_audience: str
    main_problem: str = ""
    platform: str = "instagram"  # instagram, facebook, tiktok
    content_purpose: str = "soft_selling"  # awareness, soft_selling, hard_selling, education, engagement
    product_photo_base64: Optional[str] = None  # optional photo context
    save: bool = True


class FoodMenuIn(BaseModel):
    menu_name: str = ""
    items: List[Dict[str, Any]] = []
    mood: str = "cozy"
    layout: str = "menu-board"
    aspect_ratio: str = "4:5 (Portrait Feed)"
    call_to_action: str = ""
    headline: str = ""
    campaign_goal: str = "best_seller"
    product_photo_base64: Optional[str] = None
    reference_image_base64: Optional[str] = None
    save: bool = True


class RegenerateIn(BaseModel):
    prompt_id: str  # existing generated_prompt to regenerate
    slide_index: Optional[int] = None  # for carousel: regenerate single slide


class _FoodMenuLegacy(BaseModel):
    _placeholder: bool = False


class PhotoAnalyzeIn(BaseModel):
    image_base64: str  # raw base64 (no prefix)
    mime_type: str = "image/jpeg"


class SavePromptIn(BaseModel):
    dashboard_type: str  # banner | carousel | copywriting
    title: str
    payload: Dict[str, Any]


class _FoodMenuLegacyRemoved(BaseModel):
    """Removed — see FoodMenuIn above"""
    _x: bool = False


class CaptionBundleIn(BaseModel):
    product_name: str = ""
    product_description: str = ""
    headline: str = ""
    target_audience: str = ""
    platform: str = "instagram"
    content_purpose: str = "soft_selling"


class MarketplaceIn(BaseModel):
    product_name: str
    product_price: str = ""
    original_price: str = ""
    discount_percent: int = 0
    promo_label: str = ""  # "Flash Sale", "Best Seller", "Gratis Ongkir"
    platform: str = "shopee"  # shopee | tokopedia | general
    tagline: str = ""
    product_photo_base64: Optional[str] = None
    human_enabled: bool = False
    human_mode: str = "auto"
    model_character: str = ""
    model_age: str = ""
    interaction_style: str = ""
    composition_style_human: str = ""
    outfit_style: str = ""
    expression_style: str = ""
    save: bool = True


class CalendarIdeasIn(BaseModel):
    month: int  # 1-12
    year: int


class ConsistencyCheckIn(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"
    note: str = ""  # optional note about the image


class GridSlotIn(BaseModel):
    slot_index: int  # 0-8
    label: str = ""
    note: str = ""
    color_tag: str = ""  # hex
    prompt_id: Optional[str] = None  # link to existing generated prompt


class GridLayoutIn(BaseModel):
    name: str = "My Feed Grid"
    slots: List[GridSlotIn] = []  # exactly 9 slots


class CalendarEventIn(BaseModel):
    title: str
    scheduled_date: str  # ISO date string (YYYY-MM-DD)
    prompt_id: Optional[str] = None
    notes: str = ""
    status: str = "draft"  # draft, scheduled, posted
    photo_base64: Optional[str] = None
    caption: str = ""


class SchedulePostIn(BaseModel):
    prompt_id: Optional[str] = None
    title: str
    caption: str = ""
    platform: str = "instagram"
    post_date: str          # YYYY-MM-DD
    post_time: str = "09:00"
    reminder_hours_before: int = 24   # H-1=24, H-3=72 etc.
    dashboard_type: str = "banner"
    image_base64: Optional[str] = None  # thumbnail (small preview)


class NotificationSettingsIn(BaseModel):
    telegram_chat_id: Optional[str] = None
    whatsapp_phone: Optional[str] = None
    default_reminder_hours: int = 24
    notifications_enabled: bool = True


# ============= HELPERS =============
from feedify_config import BRAND_ARCHETYPES, CONTENT_PURPOSES


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


def create_jwt_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = pyjwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ============= CREDITS (top-up system, no expiry) =============
CREDIT_PACKAGES = {
    "starter":   {"name": "Coba Dulu",   "credits": 10,  "price": 15000,  "savings": 0},
    "monthly":   {"name": "1 Bulan Full","credits": 30,  "price": 40000,  "savings": 5000},
    "bimonthly": {"name": "2 Bulan Full","credits": 60,  "price": 79000,  "savings": 11000},
    "pro":       {"name": "Pro Pack",    "credits": 300, "price": 350000, "savings": 100000},
}

# ============= CONTENT MODERATION =============
_BANNED_CONTENT: dict = {
    "konten_dewasa": {
        "label": "Konten Dewasa / Pornografi",
        "message": "Konten yang kamu masukkan mengandung unsur dewasa atau pornografi. Feedify hanya untuk konten brand yang positif dan legal.",
        "keywords": [
            "pornografi", "porno", "xxx", "bokep", "bugil", "telanjang", "onlyfans",
            "adult content", "nsfw", "explicit", "esek", "mesum", "cabul",
            "hot video", "video panas", "konten dewasa",
        ],
    },
    "judi": {
        "label": "Perjudian",
        "message": "Konten yang kamu masukkan mengandung unsur perjudian. Feedify tidak mendukung promosi judi dalam bentuk apapun.",
        "keywords": [
            "judi", "judol", "slot gacor", "situs slot", "togel", "toto",
            "taruhan", "betting", "gambling", "casino", "kasino", "poker online",
            "jackpot slot", "agen judi", "bandar judi", "bo slot", "gacor hari ini",
        ],
    },
    "rokok_tembakau": {
        "label": "Rokok / Produk Tembakau",
        "message": "Feedify tidak mengizinkan promosi produk rokok atau tembakau sesuai kebijakan platform.",
        "keywords": [
            "rokok", "cigarette", "tobacco", "tembakau", "nikotin", "kretek",
            "cerutu", "shisha", "tembakau iris", "rokok elektrik", "vape liquid",
            "liquid vape", "mod vape", "rokok herbal",
        ],
    },
    "narkoba": {
        "label": "Narkoba / Zat Terlarang",
        "message": "Konten mengandung unsur narkoba atau zat terlarang. Ini melanggar kebijakan Feedify dan hukum yang berlaku.",
        "keywords": [
            "narkoba", "ganja", "sabu", "sabu-sabu", "kokain", "ekstasi", "putaw",
            "marijuana", "cannabis", "heroin", "psikotropika", "obat terlarang",
            "tramadol ilegal", "happy five", "lem ngelem",
        ],
    },
    "kekerasan_terorisme": {
        "label": "Kekerasan / Terorisme",
        "message": "Konten mengandung unsur kekerasan atau terorisme yang tidak diizinkan di Feedify.",
        "keywords": [
            "terorisme", "teroris", "bom bunuh diri", "pembunuhan massal",
            "genosida", "radikal ekstrem", "isis", "jihad kekerasan",
        ],
    },
    "penipuan": {
        "label": "Penipuan / Scam",
        "message": "Konten terindikasi mengandung unsur penipuan. Feedify tidak mendukung promosi produk atau layanan yang menipu konsumen.",
        "keywords": [
            "investasi bodong", "ponzi", "skema piramida", "uang palsu",
            "carding", "phishing", "hack rekening", "bobol atm",
            "jual akun netflix bajakan", "jual akun spotify bajakan", "tipu follower",
        ],
    },
    "minuman_keras": {
        "label": "Minuman Beralkohol",
        "message": "Feedify tidak mengizinkan promosi minuman beralkohol sesuai kebijakan platform.",
        "keywords": [
            "minuman keras", "miras", "alkohol", "bir", "wine", "whiskey",
            "vodka", "rum", "gin", "arak", "tuak", "khamr",
        ],
    },
}

def _moderate_content(*texts: str) -> Optional[dict]:
    """
    Check one or more text strings against the banned content list.
    Returns None if clean. Returns violation dict if flagged.
    Case-insensitive, checks all texts provided.
    """
    combined = " ".join(t.lower() for t in texts if t)
    for category, meta in _BANNED_CONTENT.items():
        for kw in meta["keywords"]:
            # Word-boundary aware: keyword must appear as standalone or with space/punctuation
            if f" {kw} " in f" {combined} " or combined.startswith(kw + " ") or combined.endswith(" " + kw) or combined == kw:
                return {
                    "type": "content_violation",
                    "category": meta["label"],
                    "message": meta["message"],
                }
    return None

def _ai_error_detail(e: Exception, fallback: str) -> str:
    """Return a user-friendly Indonesian error message for AI API errors."""
    msg = str(e)
    if "529" in msg or "Overloaded" in msg or "overloaded" in msg:
        return "Server AI sedang kelebihan beban. Coba lagi dalam beberapa detik."
    if "529" in msg or "rate limit" in msg.lower() or "429" in msg:
        return "Terlalu banyak permintaan ke AI. Tunggu sebentar lalu coba lagi."
    if "timeout" in msg.lower() or "timed out" in msg.lower():
        return "AI membutuhkan waktu terlalu lama. Coba lagi."
    return fallback

def _raise_if_banned(*texts: str):
    """Raise HTTP 422 with structured error if content violates policy."""
    violation = _moderate_content(*texts)
    if violation:
        raise HTTPException(
            status_code=422,
            detail=violation,
        )


async def _get_balance(user_id: str) -> int:
    """Return current credit balance for user (0 if never purchased)."""
    doc = await db.user_credits.find_one({"user_id": user_id}, {"balance": 1})
    return (doc or {}).get("balance", 0)

async def _consume_credit(user_id: str, n: int = 1, role: str = "user") -> bool:
    """
    Atomically deduct n credits. Admin users bypass credit check entirely.
    Returns True if deducted (or admin), False if insufficient balance.
    """
    if role == "admin":
        return True
    result = await db.user_credits.find_one_and_update(
        {"user_id": user_id, "balance": {"$gte": n}},
        {"$inc": {"balance": -n}, "$set": {"updated_at": now_iso()}},
        return_document=True,
    )
    if result is None:
        return False
    await db.credit_transactions.insert_one({
        "user_id": user_id,
        "type": "usage",
        "amount": -n,
        "balance_after": result["balance"],
        "reference_id": None,
        "description": f"Generate konten ({n} kredit)",
        "created_at": now_iso(),
    })
    return True

async def _refund_credit(user_id: str, n: int = 1, description: str = "Refund generate gagal"):
    """Add back credits after a failed generation. Logs as refund."""
    result = await db.user_credits.find_one_and_update(
        {"user_id": user_id},
        {"$inc": {"balance": n}, "$set": {"updated_at": now_iso()}},
        return_document=True,
        upsert=True,
    )
    await db.credit_transactions.insert_one({
        "user_id": user_id,
        "type": "refund",
        "amount": n,
        "balance_after": (result or {}).get("balance", n),
        "reference_id": None,
        "description": description,
        "created_at": now_iso(),
    })

async def _add_credits(user_id: str, n: int, reference_id: str, description: str) -> int:
    """Add credits after confirmed payment. Returns new balance."""
    result = await db.user_credits.find_one_and_update(
        {"user_id": user_id},
        {
            "$inc": {"balance": n, "total_purchased": n},
            "$set": {"updated_at": now_iso()},
        },
        return_document=True,
        upsert=True,
    )
    new_balance = (result or {}).get("balance", n)
    await db.credit_transactions.insert_one({
        "user_id": user_id,
        "type": "purchase",
        "amount": n,
        "balance_after": new_balance,
        "reference_id": reference_id,
        "description": description,
        "created_at": now_iso(),
    })
    return new_balance

def _credits_summary(doc: dict) -> dict:
    """Unified credits summary for API responses."""
    balance = (doc or {}).get("balance", 0)
    return {
        "balance": balance,
        "credits_remaining": balance,
        "total_purchased": (doc or {}).get("total_purchased", 0),
    }


# ============= COLOR HELPERS =============
import re as _re

def _build_human_directive(payload, brand: Optional[dict]) -> str:
    """Build a human/model directive string from payload and brand DNA. Returns empty string if disabled."""
    if not getattr(payload, "human_enabled", False):
        return ""

    brand = brand or {}
    category = brand.get("category", "")
    target_audience = brand.get("target_audience", "")
    positioning = brand.get("brand_positioning", "")
    personality = brand.get("brand_personality", []) or []
    archetype = brand.get("archetype", "")
    campaign_goal = getattr(payload, "campaign_goal", "brand_awareness")

    if getattr(payload, "human_mode", "auto") == "auto":
        # Let the image model decide all model details based on brand DNA
        return (
            "INCLUDE A HUMAN MODEL IN THIS IMAGE. "
            f"Brand context: category '{category}', target audience '{target_audience}', "
            f"archetype '{archetype}', campaign goal '{campaign_goal}'. "
            "Based on this brand DNA, autonomously choose the ideal model: "
            "gender, ethnicity, approximate age, outfit style, pose, expression, and interaction with the product. "
            "The model must feel authentic to the brand's target audience — not generic stock-photo. "
            "Composition: product and model must both be prominent and clearly readable on mobile. "
            "Avoid Western/European look unless it matches the brand's target audience. "
            "Priority: Indonesian or Southeast Asian representation by default."
        )

    # Manual mode — use user-specified fields
    parts = ["INCLUDE A HUMAN MODEL IN THIS IMAGE with these exact specifications:"]
    char = getattr(payload, "model_character", "")
    age = getattr(payload, "model_age", "")
    interaction = getattr(payload, "interaction_style", "")
    composition = getattr(payload, "composition_style_human", "")
    outfit = getattr(payload, "outfit_style", "")
    expression = getattr(payload, "expression_style", "")

    if char:
        parts.append(f"Model character: {char}.")
    if age:
        parts.append(f"Age range: {age} years old.")
    if outfit:
        parts.append(f"Outfit style: {outfit}.")
    if expression:
        parts.append(f"Facial expression: {expression}.")
    if interaction:
        parts.append(f"Interaction with product: {interaction}.")
    if composition:
        comp_map = {
            "Produk dominan": "product occupies ~70% of frame, model as supporting element in background or side",
            "Seimbang": "product and model share equal visual weight in the composition",
            "Model dominan": "model occupies ~70% of frame, product clearly visible but model is the hero",
        }
        parts.append(f"Composition balance: {comp_map.get(composition, composition)}.")

    parts.append(
        "The model must look natural, authentic, and relatable — not like generic stock photography. "
        "Ensure product is always clearly visible and identifiable in the frame."
    )
    return " ".join(parts)


def _extract_hex(color: str) -> str:
    """Return first #RRGGBB from a gradient string, or the value itself if already hex."""
    if not color:
        return "#000000"
    m = _re.search(r'#[0-9A-Fa-f]{6}', color)
    return m.group(0) if m else color


# ============= IMAGE GENERATION =============
def _aspect_to_size(aspect_ratio: str) -> str:
    """Map aspect ratio string to gpt-image-2 size."""
    ar = aspect_ratio.lower()
    if "1:1" in ar or "square" in ar:
        return "1024x1024"
    if "9:16" in ar or "story" in ar or "reels" in ar:
        return "1024x1536"
    if "16:9" in ar or "landscape" in ar:
        return "1536x1024"
    # default portrait (4:5)
    return "1024x1536"


def _build_natural_prompt(json_prompt: dict) -> str:
    """Convert deterministic JSON spec to natural language prompt for gpt-image-2.
    Dispatches to type-specific prompt builders for best results per dashboard."""
    task_type = json_prompt.get("task_type", "")

    if task_type == "instagram_feed_post_generation":
        return _natural_feed(json_prompt)
    elif task_type == "instagram_carousel_slide_generation":
        return _natural_carousel_slide(json_prompt)
    elif task_type == "fnb_food_photography_generation":
        return _natural_food(json_prompt)
    elif task_type == "marketplace_thumbnail_generation":
        return _natural_marketplace(json_prompt)

    # Fallback generic
    s = json_prompt.get("prompt_structure", {})
    style = s.get("visual_style_details", {})
    brand_el = s.get("branding_elements", {})
    layout = s.get("product_visual_layout", {})
    palette = style.get("color_palette", {})
    parts = [s.get("subject", "A professional promotional visual.")]
    if brand_el.get("brand_name"):
        parts.append(f'Brand: "{brand_el["brand_name"]}".')
    if brand_el.get("headline"):
        parts.append(f'Headline text: "{brand_el["headline"]}".')
    if brand_el.get("call_to_action"):
        parts.append(f'CTA: "{brand_el["call_to_action"]}".')
    if layout.get("placement_rule"):
        parts.append(layout["placement_rule"])
    if palette:
        cols = [v for k, v in palette.items() if isinstance(v, str) and v.startswith("#")]
        if cols:
            parts.append(f"Brand color palette: {', '.join(cols)}.")
    if style.get("lighting_setup"):
        parts.append(f"Lighting: {style['lighting_setup']}.")
    if style.get("aesthetic_keywords"):
        parts.append(f"Aesthetic: {style['aesthetic_keywords']}.")
    if s.get("negative_prompt"):
        parts.append(f"Avoid: {s['negative_prompt']}.")
    parts.append("Ultra-realistic, 8k, magazine-quality, social-media ready.")
    return " ".join(parts)


def _natural_feed(j: dict) -> str:
    """Natural language prompt for Instagram feed post / promotional banner."""
    s = j.get("prompt_structure", {})
    brand_el = s.get("branding_elements", {})
    style = s.get("visual_style_details", {})
    layout = s.get("product_visual_layout", {})
    info = s.get("information_layout", {})
    cat_art = s.get("category_specific_art_direction", {})
    concept_block = j.get("composition_concept", {})
    variation = j.get("variation_directive", "")
    palette = style.get("color_palette", {})

    brand_name = brand_el.get("brand_name", "the brand")
    product_name = brand_el.get("product_name", brand_name)
    headline = brand_el.get("headline", "")
    subheadline = brand_el.get("subheadline", "")
    cta = brand_el.get("call_to_action", "")
    aesthetic = style.get("aesthetic_keywords", "")
    lighting = style.get("lighting_setup", "")
    color_temp = style.get("color_temperature", "")
    category_env = style.get("category_environment", "")
    composition = layout.get("composition_style", "")
    placement = layout.get("placement_rule", "")
    features = info.get("features_to_highlight", [])
    cta_directive = info.get("cta_directive", "")
    ambient_props = cat_art.get("ambient_props", "")
    emotional_directive = cat_art.get("emotional_directive", "")
    audience_mood = cat_art.get("audience_mood", "")
    typo_instructions = s.get("typography_instructions", "")
    p_primary = palette.get("background_dominant", "") or palette.get("primary_accent", "")
    p_secondary = palette.get("accent_elements", "") or palette.get("secondary_background", "")
    p_accent = palette.get("tertiary_accent", "")
    brief = j.get("creative_brief", "")
    human_directive = j.get("human_model_directive", "")

    # Opening — establish the brief
    p = (
        f"Create a scroll-stopping, magazine-grade Instagram feed post for '{brand_name}'"
        + (f" featuring product '{product_name}'" if product_name != brand_name else "")
        + ". "
    )
    if brief:
        p += f"Creative brief: {brief}. "

    # Composition concept — specific shot execution with random sub-theme
    if concept_block:
        p += f"SHOT CONCEPT — {concept_block.get('name', '')}: {concept_block.get('directive', '')} "
        p += f"Camera angle: {concept_block.get('camera_angle', '')} "

    # Variation directive — ensures unique output each generate
    if variation:
        p += f"CREATIVE VARIATION FOR THIS GENERATION: {variation} "

    # Emotional/audience directive
    if emotional_directive:
        p += f"{emotional_directive}. "
    if audience_mood:
        p += f"Audience emotional context: {audience_mood}. "

    # Headline text
    if headline:
        p += f'Display this headline prominently in the image: "{headline}". '
    if subheadline:
        p += f'Supporting subheadline: "{subheadline}". '

    # Composition
    if composition:
        p += f"Composition approach: {composition}. "
    if placement:
        p += f"{placement} "

    # Color palette — strict
    p += (
        f"STRICT brand color palette — use ONLY these hex values: "
        f"dominant background {p_primary}, accent/highlights {p_secondary}"
        + (f", tertiary {p_accent}" if p_accent else "") + ". "
        f"{p_primary} MUST be the dominant color covering the largest surfaces and background. "
        f"{p_secondary} is used for accent elements, CTA buttons, highlights, and small details. "
        f"Never use generic white/gray/beige unless that IS one of these brand colors. "
    )

    # Aesthetic + lighting
    if aesthetic:
        p += f"Visual aesthetic: {aesthetic}. "
    if lighting:
        p += f"Lighting: {lighting}. "
    if color_temp:
        p += f"Color temperature: {color_temp}. "

    # Category-specific environment and props
    if category_env:
        p += f"Scene environment: {category_env}. "
    if ambient_props:
        p += f"Supporting visual props and ambient elements: {ambient_props}. "

    # Features
    if features:
        p += f"Display these feature callouts as floating icon badges: {', '.join(features)}. "

    # CTA
    if cta_directive:
        p += f"{cta_directive} "
    elif cta:
        p += f'CTA button text: "{cta}". '

    # Typography
    if typo_instructions:
        p += f"Typography: {typo_instructions} "
    else:
        p += (
            "Typography: modern bold sans-serif headline, clean readable body text. "
            "Intentional negative space — never crowd the layout. "
        )

    # Product integration
    p += (
        "The product (if uploaded) is the undisputed hero — seamlessly composited "
        "with accurate drop shadows and reflections matching the lighting. "
        "Product edges must look photographic, not cut-out. "
    )

    # Human model directive
    if human_directive:
        p += f" --- MODEL & TALENT DIRECTION: {human_directive} ---"

    # Quality lock
    p += (
        "Final output: ultra-realistic 8K, magazine-grade commercial photography quality. "
        "Social-media ready. No watermarks, no signatures, no text artifacts. "
        "Every element must feel intentional — this is premium brand content, not a template."
    )

    neg = s.get("negative_prompt", "")
    if neg:
        p += f" STRICTLY AVOID: {neg}."
    return p


def _natural_carousel_slide(j: dict) -> str:
    """V2: Natural language prompt for a single Instagram carousel slide using AI Director data."""
    s = j.get("prompt_structure", {})
    brand_el = s.get("branding_elements", {})
    palette = s.get("color_palette", {})
    narrative = s.get("narrative_context", {})
    layout_rules = s.get("typography_zone_rules", {})
    brand_frame = s.get("brand_frame_elements", {})
    director = s.get("ai_visual_director", {})
    consistency = s.get("consistency_engine", {})
    goal_dir = s.get("content_goal_directive", {})

    slide_idx = j.get("slide_index", 1)
    slide_total = j.get("slide_total", 5)
    role = j.get("slide_role", "content")
    directive = s.get("slide_directive", "")
    brand_name = brand_el.get("brand_name", "the brand")
    topic = narrative.get("topic", "")
    target = narrative.get("target_audience", "")
    template = narrative.get("template_type", "")
    p_primary = palette.get("background_dominant", "#0B3D2E")
    p_secondary = palette.get("accent_elements", "#FDFBF7")
    cta = brand_el.get("call_to_action_final", "")

    # ── Base ──────────────────────────────────────────────────────────────────
    p = (
        f"Create slide {slide_idx:02d} of {slide_total:02d} for an Instagram carousel by '{brand_name}'. "
        f"Topic: '{topic}'. Story template: {template}. Target audience: {target}. "
        f"Content goal: {narrative.get('content_goal', 'brand_awareness')}. "
        f"Slide role: {role.upper()} — {directive} "
    )

    # ── Role-specific visual language ─────────────────────────────────────────
    if role == "hook":
        p += (
            "HOOK SLIDE — Stop the scroll in under 0.5 seconds. "
            "Bold typography dominates 55-65% of slide area. Strong curiosity gap statement. "
            "Minimal background — brand color block is the canvas. "
            "Brand logo subtle top-left. Slide indicator '01' bottom-right. "
        )
    elif role in ("cta", "final-cta"):
        p += (
            f"FINAL CTA SLIDE — Maximum conversion intent. "
            f'Large CTA call-out: "{cta}". {goal_dir.get("cta_emphasis", "")}. '
            "Brand name and Instagram handle prominent. Product supporting but not competing. "
            "Clean, bold, zero clutter. Make viewer compelled to act NOW. "
        )
    else:
        p += (
            f"MID-CAROUSEL CONTENT SLIDE {slide_idx:02d}/{slide_total:02d} — "
            "Clear information hierarchy, readable at a glance, brand-consistent. "
            f"Slide indicator '{slide_idx:02d}/{slide_total:02d}' subtle bottom-right. "
        )

    # ── AI Visual Director layer ───────────────────────────────────────────────
    vtype = director.get("visual_type", "human_product")
    if director.get("composition"):
        p += f"COMPOSITION: {director['composition']}. "
    if director.get("camera_angle") and vtype != "graphic_design":
        p += f"CAMERA: {director['camera_angle']}. "
    if director.get("lighting") and vtype != "graphic_design":
        p += f"LIGHTING: {director['lighting']}. "
    if director.get("focal_point"):
        p += f"FOCAL POINT: {director['focal_point']}. "
    if director.get("mood"):
        p += f"MOOD & ATMOSPHERE: {director['mood']}. "
    if director.get("emotional_tone"):
        p += f"Emotional tone: {director['emotional_tone']}. "
    if director.get("prop_recommendation"):
        p += f"PROPS: {director['prop_recommendation']}. "
    if director.get("text_placement"):
        p += f"TEXT PLACEMENT: {director['text_placement']}. "
    if director.get("photo_style_directive"):
        p += f"PHOTOGRAPHY STYLE: {director['photo_style_directive']}. "
    if director.get("visual_priority"):
        p += f"VISUAL PRIORITY: {director['visual_priority']}. "

    # ── Consistency Engine (same across every slide) ──────────────────────────
    p += (
        f"CONSISTENCY LOCK — must be IDENTICAL to all other slides: "
        f"Brand frame: {consistency.get('brand_frame_lock', '6% header + 6% footer in brand color')}. "
        f"Color lock: {p_primary} dominant background, {p_secondary} accent. NEVER deviate. "
        f"Font lock: {consistency.get('font_lock', 'ONE bold sans-serif font family throughout')}. "
    )
    talent_lock = consistency.get("talent_lock", "")
    if talent_lock:
        p += f"TALENT LOCK: {talent_lock} "

    # ── Brand DNA ─────────────────────────────────────────────────────────────
    style_det = s.get("visual_style_details", {})
    if style_det.get("photography"):
        p += f"Visual style: {style_det['photography']}. "
    if style_det.get("typography"):
        p += f"Typography style: {style_det['typography']}. "

    # ── Content goal directive ────────────────────────────────────────────────
    if goal_dir.get("visual_directive"):
        p += f"Goal directive: {goal_dir['visual_directive']}. "
    if goal_dir.get("emotional_trigger"):
        p += f"Emotional trigger: {goal_dir['emotional_trigger']}. "

    # ── Layout zone ───────────────────────────────────────────────────────────
    if layout_rules:
        p += (
            f"Layout: {layout_rules.get('header_height','6%')} header strip (brand frame), "
            f"88% main content area, {layout_rules.get('footer_height','6%')} footer strip (slide indicator + handle). "
        )

    # ── Human talent ─────────────────────────────────────────────────────────
    human_directive = j.get("prompt_structure", {}).get("human_model_directive") or j.get("human_model_directive", "")
    if human_directive:
        p += f" --- TALENT DIRECTION: {human_directive} ---"

    # ── Quality lock ─────────────────────────────────────────────────────────
    p += (
        "Ultra-realistic 8K commercial photography quality. Premium Instagram-ready. "
        "Typography minimum 1/10 canvas height for mobile readability. "
        "Fully readable standalone — no dependence on caption. "
        "No watermarks, no signatures, no text artifacts, no distorted anatomy."
    )

    neg = s.get("negative_prompt", "")
    if neg:
        p += f" STRICTLY AVOID: {neg}."
    return p


def _natural_food(j: dict) -> str:
    """Natural language prompt for F&B food photography / menu visual."""
    s = j.get("prompt_structure", {})
    brand_el = s.get("branding_elements", {})
    style = s.get("visual_style_details", {})
    layout = s.get("visual_layout", {})
    palette = style.get("color_palette", {})
    food_rules = s.get("food_photography_rules", [])
    appetite = s.get("appetite_engineering", {})
    menu_items = s.get("menu_items", [])

    brand_name = brand_el.get("brand_name", "the restaurant")
    headline = brand_el.get("headline", "")
    cta = brand_el.get("call_to_action", "")
    aesthetic = style.get("aesthetic_keywords", "")
    lighting = style.get("lighting_setup", "")
    props = style.get("props_and_styling", "")
    layout_dir = layout.get("layout_directive", "")
    angle = style.get("shooting_angle", "45°")
    p_primary = palette.get("background_dominant", "") or palette.get("primary_accent", "")
    p_secondary = palette.get("accent_elements", "") or palette.get("secondary_background", "")
    p_accent = palette.get("tertiary_accent", "")
    appetite_triggers = appetite.get("triggers", [])
    hero_dish = appetite.get("hero_dish_instruction", "")
    color_temp = appetite.get("color_temperature", "warm")

    p = (
        f"Create a professional food photography image for '{brand_name}', "
        "designed for Instagram posting to drive appetite appeal and restaurant engagement. "
        "This is commercial food photography — the goal is to make viewers CRAVE the food immediately. "
    )
    if headline:
        p += f'Menu title / promo: "{headline}". '
    if layout_dir:
        p += f"Layout format: {layout_dir} "
    p += f"Shooting angle: {angle}. "
    if hero_dish:
        p += f"{hero_dish} "
    p += f"Lighting: {lighting}. Aesthetic mood: {aesthetic}. "
    if props:
        p += f"Styling props: {props}. "
    if color_temp == "warm":
        p += "Apply warm amber/golden color grading to enhance food warmth and appetite appeal. "
    elif color_temp == "cool":
        p += "Apply cool, fresh color grading — ideal for healthy food, sushi, salads, beverages. "

    if appetite_triggers:
        p += f"Appetite engineering details: {'; '.join(appetite_triggers)}. "
    else:
        p += (
            "Appetite engineering: show visible steam rising from hot food, "
            "intentional sauce drips or glaze shine, crispy texture contrast visible on edges, "
            "fresh garnish with bright herb color pop, oil sheen on proteins. "
        )
    if menu_items:
        item_descriptions = []
        for item in menu_items:
            name = item.get("name", "")
            desc = item.get("description", "")
            price = item.get("price", "")
            if name:
                item_str = name
                if desc:
                    item_str += f" ({desc})"
                if price:
                    item_str += f" — {price}"
                item_descriptions.append(item_str)
        if item_descriptions:
            p += f"Menu items to feature: {'; '.join(item_descriptions)}. "
            p += "Display menu items with elegant typography — dish name bold, price in accent color. "
    p += (
        f"Background and surface areas use brand dominant color {p_primary}. "
        f"Typography overlays and accent badges use {p_secondary or p_accent}. "
        "Food color MUST remain natural and true — do not apply brand color to food itself. "
    )
    if cta:
        p += f'CTA text: "{cta}". '
    p += (
        "Final quality: ultra-realistic food photography, 8K, Michelin-star plating level, "
        "mouth-watering composition, no plastic textures, no over-editing. "
        "No watermarks, no text artifacts."
    )
    neg = s.get("negative_prompt", "")
    if neg:
        p += f" AVOID: {neg}."
    return p


def _natural_marketplace(j: dict) -> str:
    """Natural language prompt for marketplace product thumbnail (Shopee/Tokopedia/General)."""
    s = j.get("prompt_structure", {})
    brand_el = s.get("branding_elements", {})
    style = s.get("visual_style_details", {})
    layout = s.get("product_visual_layout", {})
    price_overlay = s.get("price_overlay", {})
    platform_ctx = s.get("platform_context", "")
    badge_design = s.get("badge_design", {})
    palette = style.get("color_palette", {})

    brand_name = brand_el.get("brand_name", "")
    product_name = brand_el.get("headline", "product")
    cta = brand_el.get("call_to_action", "")
    sale_price = price_overlay.get("sale_price", "")
    orig_price = price_overlay.get("original_price", "")
    discount = price_overlay.get("discount_badge", "")
    promo_label = price_overlay.get("promo_label", "")
    bg_color = palette.get("background", "#FFFFFF")
    accent_color = palette.get("brand_accent", "") or palette.get("brand_dominant", "") or palette.get("highlight_accent", "")
    badge_color = badge_design.get("badge_color", "#FF0000")
    badge_shape = badge_design.get("shape", "pill")
    price_font = badge_design.get("price_font_style", "bold red")
    trust_signals = s.get("trust_signals", [])
    photography_style = style.get("photography_style", "pure studio white background")

    p = (
        f"Create a high-conversion marketplace product thumbnail for '{product_name}'"
        f"{f' by {brand_name}' if brand_name else ''}. "
        f"Platform context: {platform_ctx} "
        "This thumbnail must maximize click-through rate on a busy marketplace listing page — "
        "the product must be crystal-clear, price/discount must be immediately readable, "
        "and the design must look trustworthy and high-value. "
    )
    p += (
        f"Product photography style: {photography_style}. "
        f"Background: {bg_color} — pure clean professional backdrop. "
        "Product must fill 65-75% of the 1:1 square frame. "
        "Multiple angles or 3D perspective view if possible to show product fully. "
    )
    if discount:
        p += (
            f"DISCOUNT BADGE — MUST BE PROMINENT: '{discount}' displayed as a "
            f"{badge_shape}-shaped badge in {badge_color} color, "
            "positioned TOP-LEFT or TOP-RIGHT corner of the image. "
            "Make the discount percentage the largest text element on the badge. "
        )
    if sale_price or orig_price:
        p += (
            f"PRICE DISPLAY: Sale price '{sale_price}' in {price_font} large typography. "
        )
        if orig_price:
            p += f"Original price '{orig_price}' shown with red strikethrough (coret). "
    if promo_label:
        p += (
            f"PROMO LABEL: '{promo_label}' in a high-contrast chip/badge in accent color {accent_color}. "
        )
    if trust_signals:
        p += f"Trust signal elements: {'; '.join(trust_signals)}. "
    if cta:
        p += f"Bottom tagline: '{cta}'. "
    p += (
        "Typography: all text must be HIGHLY LEGIBLE at 200x200px thumbnail size — "
        "use maximum contrast between text and background. "
        "Clean, commercial, professional design. "
        "Ultra-realistic product photography, 8K, studio-quality lighting on product. "
        "No watermarks, no logos from other brands."
    )
    human_directive = j.get("human_model_directive", "")
    if human_directive:
        p += f" --- MODEL & TALENT DIRECTION: {human_directive} ---"
    neg = s.get("negative_prompt", "")
    if neg:
        p += f" AVOID: {neg}."
    return p


def _append_reference_hint(prompt: str, has_reference: bool) -> str:
    if not has_reference:
        return prompt
    return prompt + (
        " IMPORTANT: A reference image is provided as visual inspiration for composition, mood, and styling. "
        "Match the reference's composition, lighting style, framing, and overall aesthetic closely. "
        "However, replace any product/text/branding in the reference with the brand-specific elements above "
        "— keep brand colors, headline text, CTA, and product identity as specified, but adopt the reference's visual approach."
    )


async def _call_openai_image(prompt: str, aspect_ratio: str = "1:1") -> str:
    """Call OpenAI gpt-image-2. Returns base64 string (no data: prefix)."""
    try:
        from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
    except Exception as e:
        logger.error(f"OpenAIImageGeneration import failed: {e}")
        raise HTTPException(status_code=500, detail="Image generation service unavailable")

    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")

    image_gen = OpenAIImageGeneration(api_key=EMERGENT_LLM_KEY)
    # Truncate prompt if too long (OpenAI limit ~4000 chars)
    safe_prompt = prompt[:3800] if len(prompt) > 3800 else prompt
    try:
        images = await image_gen.generate_images(
            prompt=safe_prompt,
            model="gpt-image-2",
            number_of_images=1,
        )
    except Exception as e:
        logger.error(f"OpenAI image gen failed: {e}")
        raise HTTPException(status_code=500, detail=_ai_error_detail(e, "Gagal generate gambar. Coba lagi."))

    if not images or not images[0]:
        raise HTTPException(status_code=500, detail="No image returned by AI")
    import base64
    return base64.b64encode(images[0]).decode("utf-8")


async def _auto_consistency_check(user_id: str, prompt_id: str, image_base64: str, dashboard_type: str):
    """Run consistency check in background after image generated. Best-effort."""
    try:
        brand = await db.brand_profiles.find_one({"user_id": user_id}, {"_id": 0})
        if not brand:
            return
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        system = "You are a Brand Consistency Auditor. Output ONLY valid JSON (no fence). Bahasa Indonesia."
        brand_summary = (
            f"Brand: {brand.get('brand_name','')}; Palette {brand.get('color_primary','')}, "
            f"{brand.get('color_secondary','')}; "
            f"Style: {brand.get('visual_style','')}."
        )
        instruction = (
            f"Brand DNA: {brand_summary}\n"
            "Analyze image vs Brand DNA. Return JSON with keys: "
            "overall_score (0-100), color_score, mood_score, composition_score, typography_score, "
            "summary (1-2 kalimat), strengths (list), weaknesses (list), actionable_tips (list), "
            "alignment_verdict (Sangat Konsisten/Konsisten/Cukup/Kurang/Tidak Konsisten)."
        )
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"autocheck-{prompt_id}", system_message=system).with_model("gemini", "gemini-3-flash-preview")
        msg = UserMessage(text=instruction, file_contents=[ImageContent(image_base64=image_base64)])
        response = await chat.send_message(msg)
        raw = response.strip() if isinstance(response, str) else str(response)
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:-1]) if lines[-1].startswith("```") else "\n".join(lines[1:])
            raw = raw.strip()
        if raw.startswith("json"):
            raw = raw[4:].strip()
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            parsed = json.loads(raw[start:end + 1])
            await db.consistency_checks.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "prompt_id": prompt_id,
                "dashboard_type": dashboard_type,
                "result": parsed,
                "auto": True,
                "created_at": now_iso(),
            })
    except Exception as e:
        logger.warning(f"auto consistency check failed: {e}")


# ============= AUTH =============
# ─── OTP Email ───────────────────────────────────────────────────────────────

def _generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))


async def _send_otp_email(to_email: str, name: str, otp: str) -> bool:
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("SMTP not configured — OTP email not sent")
        return False

    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#FDFBF7;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FDFBF7;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(11,61,46,0.08);">
        <!-- Header -->
        <tr><td style="background:#0B3D2E;padding:32px 40px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:#FDFBF7;letter-spacing:-0.5px;">✦ Feedify</div>
          <div style="font-size:11px;color:#E5C158;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">brand studio</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px 40px 32px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0B3D2E;">Hei, {name}! 👋</p>
          <p style="margin:0 0 28px;font-size:14px;color:#6B7280;line-height:1.6;">
            Masukkan kode OTP berikut untuk verifikasi akun Feedify kamu.
            Kode berlaku selama <strong>15 menit</strong>.
          </p>
          <!-- OTP Box -->
          <div style="background:#F3F8F5;border:2px dashed #0B3D2E;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
            <div style="font-size:42px;font-weight:800;letter-spacing:12px;color:#0B3D2E;font-family:'Courier New',monospace;">{otp}</div>
            <div style="font-size:12px;color:#9CA3AF;margin-top:8px;">Kode Verifikasi 6 Digit</div>
          </div>
          <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">
            Jika kamu tidak mendaftar di Feedify, abaikan email ini.<br>
            Jangan bagikan kode ini ke siapapun.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#F9F7F3;padding:20px 40px;text-align:center;border-top:1px solid #E8E5DF;">
          <div style="font-size:12px;color:#9CA3AF;">© 2025 Feedify · Platform Konten UMKM Indonesia</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    def _send():
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"{otp} — Kode Verifikasi Feedify"
        msg["From"] = SMTP_FROM or f"Feedify <{SMTP_USER}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html, "html", "utf-8"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, to_email, msg.as_string())

    try:
        await asyncio.to_thread(_send)
        return True
    except Exception as e:
        logger.error(f"OTP email failed: {e}")
        return False


async def _create_otp(email: str) -> str:
    otp = _generate_otp()
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    await db.email_otps.delete_many({"email": email})
    await db.email_otps.insert_one({
        "email": email,
        "otp": otp,
        "expires_at": expires_at,
        "attempts": 0,
        "created_at": now_iso(),
    })
    return otp


@api_router.post("/auth/register")
async def register(payload: UserRegister):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        if not existing.get("email_verified", True):
            # Account exists but unverified — resend OTP
            otp = await _create_otp(email)
            await _send_otp_email(email, existing["name"], otp)
            return {"requires_verification": True, "email": email, "message": "OTP baru dikirim ke email"}
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": email,
        "name": payload.name,
        "password_hash": hash_password(payload.password),
        "created_at": now_iso(),
        "referral_code": user_id[:8].lower(),
        "role": "user",
        "email_verified": False,
    }
    await db.users.insert_one(doc)
    otp = await _create_otp(email)
    await _send_otp_email(email, payload.name, otp)
    return {"requires_verification": True, "email": email, "message": "Kode OTP dikirim ke email kamu"}


@api_router.post("/auth/login")
async def login(payload: UserLogin):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    if not user.get("email_verified", True):
        otp = await _create_otp(user["email"])
        await _send_otp_email(user["email"], user["name"], otp)
        raise HTTPException(
            status_code=403,
            detail="EMAIL_NOT_VERIFIED",
            headers={"X-Email": user["email"]},
        )
    has_bp = await db.brand_profiles.find_one({"user_id": user["id"]}) is not None
    token = create_jwt_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "has_brand_profile": has_bp,
            "role": user.get("role", "user"),
            "created_at": user["created_at"],
        },
    }


@api_router.post("/auth/verify-otp")
async def verify_otp(payload: dict):
    email = (payload.get("email") or "").lower().strip()
    otp_input = (payload.get("otp") or "").strip()
    if not email or not otp_input:
        raise HTTPException(status_code=400, detail="Email dan OTP wajib diisi")

    record = await db.email_otps.find_one({"email": email})
    if not record:
        raise HTTPException(status_code=400, detail="OTP tidak ditemukan, minta kode baru")

    if record.get("attempts", 0) >= 5:
        raise HTTPException(status_code=429, detail="Terlalu banyak percobaan, minta kode baru")

    expires_at = datetime.fromisoformat(record["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP sudah kedaluwarsa, minta kode baru")

    if record["otp"] != otp_input:
        await db.email_otps.update_one({"email": email}, {"$inc": {"attempts": 1}})
        remaining = 5 - record.get("attempts", 0) - 1
        raise HTTPException(status_code=400, detail=f"Kode OTP salah, sisa {remaining} percobaan")

    await db.email_otps.delete_many({"email": email})
    await db.users.update_one({"email": email}, {"$set": {"email_verified": True}})

    user = await db.users.find_one({"email": email})
    has_bp = await db.brand_profiles.find_one({"user_id": user["id"]}) is not None
    token = create_jwt_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "has_brand_profile": has_bp,
            "role": user.get("role", "user"),
            "created_at": user["created_at"],
        },
    }


@api_router.post("/auth/resend-otp")
async def resend_otp(payload: dict):
    email = (payload.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email wajib diisi")
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="Email tidak terdaftar")
    if user.get("email_verified", True):
        raise HTTPException(status_code=400, detail="Email sudah terverifikasi")
    otp = await _create_otp(email)
    await _send_otp_email(email, user["name"], otp)
    return {"message": "Kode OTP baru dikirim ke email kamu"}


@api_router.get("/auth/me")
async def me(current_user: dict = Depends(get_current_user)):
    has_bp = await db.brand_profiles.find_one({"user_id": current_user["id"]}) is not None
    current_user["has_brand_profile"] = has_bp
    return current_user


GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")

async def _google_upsert_user(email: str, name: str, google_sub: str) -> tuple:
    """Find or create user from Google info. Returns (user_id, user_doc, is_new)."""
    user = await db.users.find_one({"google_id": google_sub})
    if not user:
        user = await db.users.find_one({"email": email})
    if user:
        if not user.get("google_id"):
            await db.users.update_one({"id": user["id"]}, {"$set": {"google_id": google_sub}})
        return user["id"], user, False
    # New user
    user_id = str(uuid.uuid4())
    new_user = {
        "id": user_id,
        "email": email,
        "name": name,
        "google_id": google_sub,
        "password_hash": None,
        "referral_code": user_id[:8].lower(),
        "role": "user",
        "created_at": now_iso(),
        "email_verified": True,
    }
    await db.users.insert_one(new_user)
    return user_id, new_user, True

@api_router.post("/auth/google-token")
async def auth_google_token(body: dict):
    """Verify Google access_token via userinfo endpoint, create/find user, return JWT."""
    access_token = body.get("access_token", "")
    if not access_token:
        raise HTTPException(status_code=400, detail="Access token tidak ditemukan")

    import httpx
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Token Google tidak valid")
        info = resp.json()
    except httpx.RequestError as e:
        logger.warning(f"Google userinfo request failed: {e}")
        raise HTTPException(status_code=503, detail="Tidak bisa menghubungi server Google")

    email = info.get("email", "").lower()
    name  = info.get("name") or (email.split("@")[0] if email else "User")
    google_sub = info.get("sub", "")

    if not email or not google_sub:
        raise HTTPException(status_code=400, detail="Data akun Google tidak lengkap")

    user_id, user, _ = await _google_upsert_user(email, name, google_sub)
    has_bp = await db.brand_profiles.find_one({"user_id": user_id}) is not None
    token  = create_jwt_token(user_id, email)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": email,
            "name": name,
            "has_brand_profile": has_bp,
            "role": user.get("role", "user"),
            "created_at": user.get("created_at", now_iso()),
        },
    }


# ============= BRAND PROFILE =============
async def _get_active_brand(user_id: str) -> Optional[dict]:
    """Return the active brand profile; fall back to the first one if no active flag."""
    brand = await db.brand_profiles.find_one({"user_id": user_id, "is_active": True}, {"_id": 0})
    if not brand:
        brand = await db.brand_profiles.find_one({"user_id": user_id}, {"_id": 0})
    return brand


@api_router.get("/brand-profile")
async def get_brand_profile(current_user: dict = Depends(get_current_user)):
    bp = await _get_active_brand(current_user["id"])
    if not bp:
        return None
    if "brand_id" not in bp:
        bp["brand_id"] = bp.get("id", "legacy")
    return bp


@api_router.post("/brand-profile")
async def upsert_brand_profile(payload: BrandProfileIn, current_user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["user_id"] = current_user["id"]
    doc["updated_at"] = now_iso()
    existing = await db.brand_profiles.find_one({"user_id": current_user["id"], "is_active": True})
    if not existing:
        existing = await db.brand_profiles.find_one({"user_id": current_user["id"]})

    # Credits gate: new users must have at least 1 credit before completing onboarding (admin bypass)
    if not existing and current_user.get("role") != "admin":
        credits_doc = await db.user_credits.find_one({"user_id": current_user["id"]})
        balance = (credits_doc or {}).get("balance", 0)
        if balance <= 0:
            raise HTTPException(
                status_code=402,
                detail={"type": "no_credits", "message": "Top up kredit terlebih dahulu untuk mengaktifkan akun Anda."}
            )

    if existing:
        await db.brand_profiles.update_one(
            {"_id": existing["_id"]},
            {"$set": doc},
        )
    else:
        doc["created_at"] = now_iso()
        doc["id"] = str(uuid.uuid4())
        doc["brand_id"] = doc["id"]
        doc["is_active"] = True
        await db.brand_profiles.insert_one(doc)
    saved = await _get_active_brand(current_user["id"])
    return saved


# ============= MULTI-BRAND =============
@api_router.get("/brand-profiles/all")
async def list_all_brands(current_user: dict = Depends(get_current_user)):
    """List all brand profiles for this user."""
    brands = await db.brand_profiles.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(20)
    for b in brands:
        if "brand_id" not in b:
            b["brand_id"] = b.get("id", str(uuid.uuid4()))
        if "is_active" not in b:
            b["is_active"] = False
    return brands


@api_router.post("/brand-profiles/create")
async def create_brand_profile(payload: BrandProfileIn, current_user: dict = Depends(get_current_user)):
    """Create a new brand profile (inactive by default)."""
    brand_id = str(uuid.uuid4())
    doc = payload.model_dump()
    doc["user_id"] = current_user["id"]
    doc["brand_id"] = brand_id
    doc["id"] = brand_id
    doc["is_active"] = False
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    await db.brand_profiles.insert_one(doc)
    return {"brand_id": brand_id, "message": "Brand baru berhasil dibuat"}


@api_router.post("/brand-profiles/{brand_id}/activate")
async def activate_brand(brand_id: str, current_user: dict = Depends(get_current_user)):
    """Set a brand as active, deactivate all others."""
    await db.brand_profiles.update_many(
        {"user_id": current_user["id"]},
        {"$set": {"is_active": False}},
    )
    result = await db.brand_profiles.update_one(
        {"user_id": current_user["id"], "$or": [{"brand_id": brand_id}, {"id": brand_id}]},
        {"$set": {"is_active": True}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Brand tidak ditemukan")
    return {"message": "Brand diaktifkan"}


@api_router.put("/brand-profiles/{brand_id}")
async def update_brand_profile(brand_id: str, payload: BrandProfileIn, current_user: dict = Depends(get_current_user)):
    """Update a specific brand profile."""
    doc = payload.model_dump()
    doc["updated_at"] = now_iso()
    result = await db.brand_profiles.update_one(
        {"user_id": current_user["id"], "$or": [{"brand_id": brand_id}, {"id": brand_id}]},
        {"$set": doc},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Brand tidak ditemukan")
    return {"message": "Brand diperbarui"}


@api_router.delete("/brand-profiles/{brand_id}")
async def delete_brand_profile(brand_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a non-active brand profile."""
    brand = await db.brand_profiles.find_one(
        {"user_id": current_user["id"], "$or": [{"brand_id": brand_id}, {"id": brand_id}]}
    )
    if not brand:
        raise HTTPException(status_code=404, detail="Brand tidak ditemukan")
    if brand.get("is_active"):
        raise HTTPException(status_code=400, detail="Tidak bisa hapus brand yang sedang aktif. Aktifkan brand lain dulu.")
    count = await db.brand_profiles.count_documents({"user_id": current_user["id"]})
    if count <= 1:
        raise HTTPException(status_code=400, detail="Minimal harus ada 1 brand")
    await db.brand_profiles.delete_one({"_id": brand["_id"]})
    return {"message": "Brand dihapus"}


# ============= PHOTO ANALYZE (Gemini Vision) =============
@api_router.post("/photo/analyze")
async def analyze_photo(payload: PhotoAnalyzeIn, current_user: dict = Depends(get_current_user)):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    except Exception as e:
        logger.error(f"emergentintegrations import failed: {e}")
        raise HTTPException(status_code=500, detail="AI vision service unavailable")

    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")

    system = (
        "Anda adalah AI Art Director profesional yang menganalisis foto produk untuk konten marketing. "
        "Berikan output JSON valid dengan format yang diminta. Bahasa: Indonesia."
    )

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"photo-{current_user['id']}-{uuid.uuid4()}",
        system_message=system,
    ).with_model("gemini", "gemini-3-flash-preview")

    instruction = (
        "Analisis foto produk ini. Kembalikan HANYA JSON valid (tanpa markdown fence) dengan struktur:\n"
        "{\n"
        '  "detected_object": "nama objek/produk utama",\n'
        '  "category": "kategori (mis. fashion, F&B, kosmetik, gadget, retail)",\n'
        '  "dominant_colors": ["#hex1", "#hex2", "#hex3"],\n'
        '  "mood": "mood/aesthetic foto (mis. minimalist, vibrant, premium)",\n'
        '  "recommended_layout": "Saran komposisi (1 kalimat)",\n'
        '  "recommended_lighting": "Saran lighting (1 kalimat)",\n'
        '  "recommended_style": "Saran style preset (Minimal Clean / Editorial / Vibrant Pop / Lifestyle / Luxury)",\n'
        '  "improvement_tips": ["tip 1", "tip 2"]\n'
        "}"
    )

    image_content = ImageContent(image_base64=payload.image_base64)
    user_msg = UserMessage(text=instruction, file_contents=[image_content])

    try:
        response = await chat.send_message(user_msg)
    except Exception as e:
        logger.error(f"Gemini vision call failed: {e}")
        raise HTTPException(status_code=500, detail=_ai_error_detail(e, "Analisis AI gagal. Coba lagi."))

    # Parse JSON from response
    raw = response.strip() if isinstance(response, str) else str(response)
    # Strip markdown fences if any
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1]) if lines[-1].startswith("```") else "\n".join(lines[1:])
        raw = raw.strip()
    if raw.startswith("json"):
        raw = raw[4:].strip()

    try:
        parsed = json.loads(raw)
    except Exception:
        # Try to extract JSON substring
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            try:
                parsed = json.loads(raw[start:end + 1])
            except Exception:
                parsed = {
                    "detected_object": "produk",
                    "category": "umum",
                    "dominant_colors": ["#0B3D2E", "#E5C158", "#FDFBF7"],
                    "mood": "professional",
                    "recommended_layout": "Single hero product, centered composition",
                    "recommended_lighting": "Diffused softbox lighting",
                    "recommended_style": "Minimal Clean",
                    "improvement_tips": ["Gunakan latar polos", "Pastikan pencahayaan merata"],
                    "_raw": raw[:500],
                }
        else:
            parsed = {"_raw": raw[:500]}

    return parsed


# ============= PROMPT GENERATION (Template-based, deterministic) =============
VISUAL_STYLE_KEY_MAP = {
    # slug keys
    "minimal-clean": "Minimal Clean",
    "minimal-korean": "Minimal Korean",
    "editorial-bold": "Editorial Bold",
    "vibrant-pop": "Vibrant Pop",
    "neon-street": "Neon Street",
    "lifestyle-natural": "Lifestyle Natural",
    "lifestyle-social": "Lifestyle Social",
    "luxury-editorial": "Luxury Editorial",
    "luxury-spa": "Luxury Spa",
    "luxury-korean": "Luxury Korean",
    "dark-moody": "Dark Moody",
    "warm-artisan": "Warm Artisan",
    # legacy passthrough
    "editorial": "Editorial Bold",
    "lifestyle": "Lifestyle Natural",
    "luxury": "Luxury Editorial",
    # display-name passthrough
    "Minimal Clean": "Minimal Clean",
    "Minimal Korean": "Minimal Korean",
    "Editorial Bold": "Editorial Bold",
    "Vibrant Pop": "Vibrant Pop",
    "Neon Street": "Neon Street",
    "Lifestyle Natural": "Lifestyle Natural",
    "Lifestyle Social": "Lifestyle Social",
    "Luxury Editorial": "Luxury Editorial",
    "Luxury Spa": "Luxury Spa",
    "Luxury Korean": "Luxury Korean",
    "Dark Moody": "Dark Moody",
    "Warm Artisan": "Warm Artisan",
    # legacy display passthrough
    "Editorial": "Editorial Bold",
    "Lifestyle": "Lifestyle Natural",
    "Luxury": "Luxury Editorial",
}

# ── Visual Style detailed directives (12 styles) ─────────────────────────────
VISUAL_STYLE_DIRECTIVES = {
    "Minimal Clean": {
        "photography": "Ultra-clean studio, pure white or off-white background, even diffused lighting, maximum negative space, product centred with generous breathing room.",
        "typography": "Ultra-light or regular weight sans-serif, generous letter-spacing, small type scale except headline.",
        "colour_use": "Brand colours used sparingly as single accent elements only.",
        "mood": "serene, confident, premium without trying — timeless and modern",
    },
    "Minimal Korean": {
        "photography": "Soft pastel backgrounds (blush, sage, lavender, milk white), gentle diffused natural light, delicate botanical props, slight overexposure for 'glass skin' quality.",
        "typography": "Thin-medium weight rounded sans-serif, soft letter-spacing, K-beauty clean layout grid.",
        "colour_use": "Pastel tones + brand colour as single warm accent highlight.",
        "mood": "soft, delicate, feminine, dreamy, aspirational K-beauty aesthetic",
    },
    "Editorial Bold": {
        "photography": "Strong directional lighting, high contrast, dramatic shadows, magazine-editorial composition, unexpected angles, model or hands optional.",
        "typography": "Mix of ultra-bold headline + thin subtext, strong typographic hierarchy, type as design element.",
        "colour_use": "High contrast brand colours, single neon or metallic accent pop.",
        "mood": "powerful, sophisticated, editorial, international magazine-worthy",
    },
    "Vibrant Pop": {
        "photography": "Bold solid colour backgrounds matching brand palette, bright even lighting, product as colour-pop focal point, joyful energy.",
        "typography": "Bold rounded sans-serif, playful scale variation, tight tracking on headers.",
        "colour_use": "Brand colours at full saturation, complementary colour pops.",
        "mood": "fun, energetic, youthful, social-media-native, Gen Z friendly",
    },
    "Neon Street": {
        "photography": "Urban nighttime or studio with neon lighting rigs, backlit rim lights in electric colours, wet surface reflections, strong coloured shadows.",
        "typography": "Strong condensed or display type, electric colour headlines, glow text effect implied.",
        "colour_use": "Neon accents (electric blue, hot pink, lime) against deep dark backgrounds.",
        "mood": "electric, urban, after-dark, Gen Z, edgy premium, streetwear energy",
    },
    "Lifestyle Natural": {
        "photography": "Natural outdoor or indoor settings, golden hour or soft window daylight, organic textures (stone, wood, linen), earthy warm colour palette.",
        "typography": "Organic-feeling serif or humanist sans-serif, warm tones, slightly hand-crafted feel.",
        "colour_use": "Earthy neutrals + brand accent as nature-complementary warm highlight.",
        "mood": "natural, honest, organic, grounded, sustainable, wholesome",
    },
    "Lifestyle Social": {
        "photography": "Slightly candid warm energy, human presence prominent, slightly warmer exposure, less clinical than studio, feels like a friend took the photo.",
        "typography": "Friendly medium-weight sans-serif, conversational layout, quote or speech-bubble elements.",
        "colour_use": "Warm brand colours + natural whites and creams.",
        "mood": "authentic, warm, relatable, community, user-generated quality",
    },
    "Luxury Editorial": {
        "photography": "Extreme precision studio lighting, deep rich shadows, negative space as luxury signal, fashion-editorial composition, couture-level art direction — Vogue or Harper's Bazaar standard.",
        "typography": "Ultra-thin serif or display type, extreme letter-spacing on headlines, small elegant type scale — never crowded.",
        "colour_use": "Deep brand primary + pure white or black + single gold metallic accent.",
        "mood": "aspirational, exclusive, couture, international luxury, Vogue-level premium",
    },
    "Luxury Spa": {
        "photography": "Bright clean whites, minimal warm wooden or stone props, soft overhead diffused lighting, serene atmosphere, maximum breathing room — every element deliberate.",
        "typography": "Delicate thin serif or sans-serif, quiet small type, gold accent highlights, ample white space.",
        "colour_use": "White + cream + single warm gold or sage green accent.",
        "mood": "calm, pure, premium wellness, spa-like serenity, mindful luxury",
    },
    "Luxury Korean": {
        "photography": "Immaculate precision, slightly cool white backgrounds, dewy light quality, perfect symmetry, glass-skin photography lighting for product surfaces.",
        "typography": "Ultra-precision thin-medium sans-serif, balanced Korean-luxury layout grid, clean proportions.",
        "colour_use": "Pristine whites + cool pastels + brand colour as refined minimal accent.",
        "mood": "pristine, K-luxury, glass-like quality, clinical premium, Seoul chic",
    },
    "Dark Moody": {
        "photography": "Dark backgrounds (deep emerald, navy, near-black), strong single-source dramatic lighting, deep shadows, chiaroscuro, product lit as cinematic hero.",
        "typography": "Bold or medium weight sans-serif or serif on dark, gold or cream coloured headlines.",
        "colour_use": "Deep dark backgrounds + brand gold/cream as highlight accent lights.",
        "mood": "sophisticated, mysterious, dramatic, high-end, gender-neutral premium",
    },
    "Warm Artisan": {
        "photography": "Warm amber-toned natural light, handcrafted props (pottery, woven baskets, wood, linen), imperfect-perfect aesthetic, human-made quality feel.",
        "typography": "Warm humanist or slab serif, earthy tones, calligraphy or handcrafted lettering feel.",
        "colour_use": "Warm ochre, terracotta, cream + brand accent as craft highlight.",
        "mood": "artisan, warm, handmade, local premium, craft culture, pasar-seni quality",
    },
}

# ── Campaign Goal directives — the single biggest lever for output quality ────
CAMPAIGN_GOAL_DIRECTIVES = {
    "launch": {
        "name": "Launch",
        "visual_directive": (
            "NEW LAUNCH ENERGY: This is a product REVEAL moment — the first impression that must stop the scroll. "
            "Communicate excitement, newness, and anticipation. Bold 'unveil' composition — product emerging dramatically. "
            "Typography must feel like a headline announcement: 'HADIR SEKARANG' or equivalent energy. "
            "Gold/accent highlights emphasise premiere quality. The image must make viewers think 'what is this — I need it NOW'."
        ),
        "copy_hook": "First impression hook — create intrigue and launch excitement.",
        "cta_style": "Discover / Pesan Sekarang / Coba Sekarang",
        "emotional_trigger": "Excitement, curiosity, FOMO of missing the first batch",
    },
    "promo": {
        "name": "Promo",
        "visual_directive": (
            "CONVERSION PROMO: This image MUST drive immediate purchase. "
            "Price or offer information is a key visual element — not an afterthought. "
            "Urgency cues: limited-time feel, bold discount number. High contrast product vs background. "
            "Warm accent colours (gold, red) signal deal urgency. "
            "Product looks both desirable AND accessible — the ideal combination for conversion."
        ),
        "copy_hook": "Urgency and value hook — limited time, can't miss this deal.",
        "cta_style": "Beli Sekarang / Klaim Promo / Dapatkan Sekarang",
        "emotional_trigger": "Urgency, value, fear of missing out",
    },
    "testimonial": {
        "name": "Testimonial",
        "visual_directive": (
            "SOCIAL PROOF CONTENT: Authentic, human, trustworthy energy. "
            "Avoid overly polished studio look — slightly warmer, more candid atmosphere. "
            "Product shown in real use context. Review text or star rating as a prominent visual element. "
            "Natural lighting preferred over dramatic studio. "
            "This should feel like a genuine friend recommendation, not an advertisement."
        ),
        "copy_hook": "Trust hook — real result, real person, real story.",
        "cta_style": "Coba Juga / Join Ribuan Pelanggan / Baca Review",
        "emotional_trigger": "Trust, social proof, belonging, peer validation",
    },
    "edukasi": {
        "name": "Edukasi",
        "visual_directive": (
            "EDUCATIONAL CONTENT: Clear, informative, trust-building. "
            "Clean well-organised visual hierarchy — information has a clear reading order. "
            "Ingredient highlights, process steps, or key facts as visual hero elements. "
            "Slightly clinical/precise aesthetic reinforces expertise and knowledge. "
            "Brand colours used for information hierarchy, not just decoration. "
            "Image should make viewers feel they learned something valuable from just one glance."
        ),
        "copy_hook": "Education hook — teach one valuable thing, make them feel smarter.",
        "cta_style": "Pelajari Lebih / Lihat Ingredients / Baca Selengkapnya",
        "emotional_trigger": "Knowledge, trust, expertise, empowerment",
    },
    "best_seller": {
        "name": "Best Seller",
        "visual_directive": (
            "BEST SELLER PROOF: This image radiates popularity, proven quality, and social trust. "
            "'TERLARIS' badge, sales numbers, or ranking must be a prominent visual element. "
            "Product looks premium and undeniably desirable — the gold standard of its category. "
            "Warmth and confidence in the visual — this is a winner. "
            "Typography bold and celebratory. Image communicates: 'this is what everyone is choosing — join the movement'."
        ),
        "copy_hook": "Popularity hook — most loved, most ordered, crowd favourite.",
        "cta_style": "Pesan Sekarang / #1 Pilihan / Dapatkan Sekarang",
        "emotional_trigger": "Social proof, FOMO, confidence in the right choice",
    },
    "brand_awareness": {
        "name": "Brand Awareness",
        "visual_directive": (
            "BRAND STORYTELLING: This image is about WHO the brand IS, not just what it sells. "
            "Values, personality, and emotional identity are the hero. "
            "Product present but not the only focus — the brand world, aesthetic, and feeling matters most. "
            "Strong visual consistency with brand DNA throughout. "
            "This is the image that makes people FOLLOW and feel they 'get' the brand. "
            "Aspirational lifestyle or brand values, not product features."
        ),
        "copy_hook": "Brand story hook — share values, vision, or philosophy.",
        "cta_style": "Follow / Pelajari Brand Kami / Bergabung",
        "emotional_trigger": "Identity, aspiration, belonging, brand love",
    },
    "restock": {
        "name": "Restok",
        "visual_directive": (
            "RESTOCK URGENCY: Communicate 'IT'S BACK — don't miss it again'. "
            "FOMO of the previous sellout is the emotional engine. "
            "Product looks premium and desirable — emphasise why people waited for its return. "
            "'KEMBALI HADIR' or similar restocked messaging as a key visual element. "
            "Urgency cues: limited stock, first-come-first-served energy. "
            "Warm, excited energy — this is a celebration of return."
        ),
        "copy_hook": "FOMO hook — it sold out before, it will again.",
        "cta_style": "Klaim Sekarang / Jangan Sampai Kehabisan / Pre-order",
        "emotional_trigger": "FOMO, urgency, relief of availability",
    },
}

# ── Shared Brand DNA lookup tables (used by all prompt builders) ───────────────

CATEGORY_VISUAL = {
    "F&B / Kuliner": {
        "props": "steam wisps, fresh ingredient garnishes, rustic wood or marble surface, artisan drips or condensation on glass",
        "environment": "warm food-studio environment — herbs, textures, bokeh background",
        "color_temp": "warm 3200K golden tones that make food look irresistible",
        "emotion": "appetite, craving, comfort, delight",
    },
    "Kosmetik / Skincare": {
        "props": "botanical leaves, clean dropper bottles, dewy water droplets, soft petals, lab glass textures",
        "environment": "ultra-clean clinical-meets-nature set — white marble, soft botanical accents",
        "color_temp": "cool 5500K daylight, clean whites, natural skin tones",
        "emotion": "purity, transformation, self-care ritual, trust",
    },
    "Fashion / Pakaian": {
        "props": "fabric textures, thread details, lifestyle accessories, subtle shadow plays",
        "environment": "fashion editorial environment — minimal studio or stylized lifestyle scene",
        "color_temp": "neutral balanced daylight with intentional mood shifts",
        "emotion": "confidence, identity, self-expression, aspiration",
    },
    "Retail / Toko": {
        "props": "product arrangement with depth, price tag elements as design feature, brand badges",
        "environment": "clean retail display aesthetic or lifestyle usage context",
        "color_temp": "bright even 6500K showroom lighting",
        "emotion": "desire, value, accessibility, excitement",
    },
    "Jasa / Service": {
        "props": "subtle process icons, service outcome imagery, human touch elements, trust badges",
        "environment": "professional yet approachable — human-centered composition",
        "color_temp": "neutral warm, professional, trustworthy",
        "emotion": "trust, expertise, reliability, care",
    },
    "Edukasi": {
        "props": "clean geometric knowledge symbols, paper textures, growth motifs",
        "environment": "clean modern educational context — focus, clarity, growth",
        "color_temp": "bright clean neutrals, inspiring accent colors",
        "emotion": "curiosity, growth, empowerment, clarity",
    },
    "Teknologi": {
        "props": "glowing screen reflections, clean circuit-inspired geometry, soft digital light leaks",
        "environment": "dark or ultra-light tech-forward environment, neon accents optional",
        "color_temp": "cool blue-white 7000K with intentional glows",
        "emotion": "innovation, precision, speed, future",
    },
}
CATEGORY_VISUAL_DEFAULT = {
    "props": "tasteful decorative brand-colored geometric shapes",
    "environment": "clean professional product display environment",
    "color_temp": "balanced 5500K neutral light",
    "emotion": "quality, trust, brand identity",
}

TONE_TYPOGRAPHY = {
    "professional": "Clean bold sans-serif. Controlled weight hierarchy. No decorative fonts. Precision spacing.",
    "friendly": "Rounded approachable sans-serif. Warm weight. Slightly informal kerning. Inviting and human.",
    "playful": "Bold display or rounded sans. Unexpected angles. Text can be tilted ±5°. Energetic font weights.",
    "premium": "High-contrast serif or ultra-thin/ultra-bold sans. Extreme weight contrast. Generous letter-spacing. Luxury fashion typesetting.",
    "urgent": "Heavy condensed bold. Accent color on key words. ALL CAPS for headline. Maximum contrast. Action-forcing weight.",
}

# Maps brand archetype → tone key for typography/voice inference (replaces manual tone field)
ARCHETYPE_VOICE = {
    "expert":    "professional",
    "friend":    "friendly",
    "rebel":     "playful",
    "caregiver": "friendly",
    "luxury":    "premium",
    "innovator": "professional",
    "everyman":  "friendly",
}

# Maps copywriting content_purpose → auto tone (replaces manual tone selector)
PURPOSE_TONE = {
    "awareness":   "friendly",
    "soft_selling":"friendly",
    "hard_selling":"urgent",
    "education":   "professional",
    "engagement":  "playful",
}

AUDIENCE_MOOD = {
    "Wanita 20–35 th": "Empowering aspirational femininity. Sophisticated but accessible. Warm accent tones.",
    "Pria urban 25–40 th": "Confident, clean, modern masculine. Strong contrast. Authoritative composition.",
    "Ibu rumah tangga": "Warm, trusting, practical value. Soft warm tones, relatable human elements.",
    "Pelajar / Mahasiswa": "Energetic, youthful, bold. High contrast, vibrant. Social-first energy.",
    "Pelaku bisnis": "Professional authority. Minimal, data-driven feel. Precise typography.",
    "Semua kalangan": "Universal appeal. Balanced warm-neutral palette. Inclusive imagery cues.",
}

# ── Composition Concepts for Feed Post ────────────────────────────────────────
# ── Composition Concept Pool System ──────────────────────────────────────────
# Each concept has dimension pools. _pick_concept_variation() randomly samples
# one option from each pool per generate call → hundreds of unique sub-themes.
CONCEPT_POOLS = {
    "hero_studio": {
        "name": "Hero Studio",
        "desc": "Produk sebagai bintang utama, background bersih premium",
        "base": "HERO STUDIO SHOT: Product is the undisputed star. Clean premium environment, product occupies 50–65% of frame. Perfect symmetry. Studio lighting renders every texture detail with precision.",
        "camera": "Eye-level or slight low-angle (10°) to give product gravity and presence.",
        "pools": {
            "surface": [
                "polished white Carrara marble with subtle grey veins",
                "dark obsidian black stone slab",
                "brushed 24k gold metal sheet",
                "aged copper patina plate with verdigris",
                "raw grey concrete slab industrial",
                "pale blonde Scandinavian oak wood plank",
                "black crushed velvet cloth",
                "warm sandstone travertine",
                "matte white honed ceramic tile",
                "frosted translucent glass panel",
                "mirror-polished chrome surface",
                "sage green painted plaster wall",
                "dusty rose woven linen fabric",
                "burnt sienna terracotta tile",
                "navy blue watered silk fabric",
                "pale walnut wood with fine grain",
                "speckled emerald terrazzo",
                "bleached white linen canvas",
                "dark forest green velvet",
                "raw brushed brass metal",
            ],
            "lighting": [
                "dramatic Rembrandt split — 70% lit / 30% deep shadow side",
                "ultra-soft 120cm octabox — near-shadowless even diffusion",
                "warm neon accent backlight fill from behind at 10°",
                "golden hour 3200K tungsten warmth — amber-kissed shadows",
                "cool 7500K daylight — crisp clinical precision",
                "bilateral symmetrical two-softbox butterfly portrait",
                "narrow 10cm strip light rim from directly behind",
                "overhead single pin-spot top-down key light",
                "window sidelight — natural afternoon sun pattern",
                "ring light flat frontal fill — glossy product catch-lights",
                "cross-lighting from opposing 45° angles — sculptural depth",
                "under-product upward bounce fill — ethereal floating quality",
                "three-point studio: key + fill + hair separation",
                "single candle-warm soft box — intimate mood 2700K",
                "hard theatrical fresnel spotlight — sharp shadow edges",
            ],
            "atmosphere": [
                "morning mist wisps drifting gently across surface",
                "smoke tendrils with light rays cutting through air",
                "floating macro particle dust suspended in light beam",
                "water droplet mist scattered on surface",
                "floating dried flower petals mid-air",
                "soft bokeh light orb spheres in background",
                "geometric neon light reflection patterns on surface",
                "sparkle particle glitter catch-lights",
                "thin fog haze atmosphere — dreamy diffusion",
                "floating translucent soap bubbles",
                "delicate down feather drift",
                "crystalline ice fragment scatter on surface",
                "fine gold dust particles suspended in light",
                "rain droplets frozen mid-air",
                "wisp of steam or breath in cold air",
            ],
            "depth_effect": [
                "extreme shallow DOF f/1.4 — background completely dissolved into bokeh",
                "everything tack-sharp deep focus — technical precision f/11",
                "circular vignette darkening progressively to edges",
                "foreground out-of-focus blur element — cinematic depth plane",
                "reflective floor mirror plane beneath product",
                "subtle warm radial background glow falloff to black",
                "product floats above surface with cast drop shadow below",
                "background gradient from brand secondary to brand primary",
            ],
        },
    },
    "flat_lay": {
        "name": "Flat Lay",
        "desc": "Bird's-eye top-down dengan props tersusun artistik",
        "base": "FLAT LAY: Strict overhead 90° bird's-eye view. Product is the anchor; curated props arranged with intentional asymmetric balance tell a lifestyle story. Rule of odds. Textured surface adds warmth.",
        "camera": "Directly overhead 90° — no perspective distortion.",
        "pools": {
            "surface": [
                "white Carrara marble top-down with dramatic veins",
                "warm honey pine wood grain overhead",
                "dark walnut wood overhead",
                "speckled terrazzo multicolour overhead",
                "handmade rough ceramic tile top-down",
                "natural linen canvas fabric overhead",
                "kraft brown paper textured overhead",
                "matte slate chalkboard surface",
                "mirror glass perfectly flat reflective",
                "brushed concrete top-down",
                "woven rattan mat tropical",
                "aged newspaper print texture",
                "brand-accent coloured fabric swatch",
                "clean white sand scattered surface",
                "soft grey cashmere fabric overhead",
                "pastel pink plaster overhead",
                "dark green tropical leaf surface",
                "pale blue painted wood plank",
                "raw jute burlap texture overhead",
                "hand-thrown clay pottery surface",
            ],
            "prop_cluster": [
                "morning coffee ritual — ceramic cup, artisan beans, vintage spoon",
                "fresh botanical — eucalyptus stems, dried cotton flowers, linen ribbon",
                "coastal beach — shells, driftwood fragment, sea glass pebbles",
                "fashion accessories — minimalist watch, sunglasses, silk scarf corner",
                "artist studio — watercolour brush, paint swatches, sketchbook corner",
                "kitchen baking — wooden rolling pin, spice jars, flour dusting",
                "desert minimal — small cactus, smooth pebbles, warm sand",
                "mountain hike — pine cone, dried lichen, hand-drawn map corner",
                "Tokyo minimal — origami crane, bamboo chopsticks, small ceramic",
                "vintage nostalgia — antique brass key, pocket watch, aged postcard",
                "wellness ritual — raw crystal, taper candle, pressed herb bundle",
                "tech minimal — AirPod case, charging cable coil, clean notepad",
                "garden fresh — herb bundle, garden scissors, twine spool",
                "travel story — passport corner, map fold, airline tag",
                "reading corner — book pages, reading glasses, pressed flower",
            ],
            "arrangement_style": [
                "ultra-minimal — product + 2 hero props only, maximum negative space",
                "curated editorial — 4–6 intentionally placed props with breathing room",
                "abundant garden — fully styled rich composition filling frame",
                "geometric grid — props in precise geometric arrangement",
                "diagonal scatter — props arranged along strong diagonal axis",
            ],
            "light_direction": [
                "soft overhead diffused — shadowless flat light",
                "angled window side light — soft props shadows cast left",
                "window side light casting soft shadows right",
                "mixed: bright top + very slight warm fill from below",
                "high-key bright editorial look",
                "moody low-key — darker corners, dramatic depth",
            ],
        },
    },
    "lifestyle_scene": {
        "name": "Lifestyle Scene",
        "desc": "Produk dalam konteks kehidupan nyata target audience",
        "base": "LIFESTYLE SCENE: Product shown in authentic real-world use context. Environment tells the brand story — where and how customers engage with this product in their daily life. Feels like a stolen authentic moment, not a staged shoot.",
        "camera": "Eye-level 35mm perspective — natural, intimate, real. Slight crop for energy.",
        "pools": {
            "time_of_day": [
                "golden hour sunrise — 3200K amber warmth, long soft shadows",
                "bright midday clear natural daylight — crisp and fresh",
                "blue hour dusk — 8000K cool lavender twilight",
                "rainy afternoon — grey overcast, wet surfaces, cozy mood",
                "neon night urban glow — artificial colour fills",
                "warm evening indoor lamp — 2700K amber intimate",
                "early morning golden slant — first light through window",
                "overcast cloudy bright — soft even shadowless daylight",
            ],
            "location": [
                "minimalist modern Jakarta apartment — marble, monstera, terrazzo",
                "cozy Bandung artisan coffee shop — wooden table, latte art",
                "lush tropical Bali garden — frangipani, stone, water feature",
                "urban Sudirman rooftop — city skyline background at golden hour",
                "beachfront deck at Lombok sunset — warm tones, woven texture",
                "boutique concept store Kemang interior — curated display",
                "airy co-working space with floor plants — productive mood",
                "pasar art market aesthetic — hand-made goods, woven baskets",
                "mountain Puncak resort wooden cabin — pine, fire, warm light",
                "coastal Belitung seafront promenade — turquoise background",
                "luxury Menteng colonial mansion garden — heritage texture",
                "creative studio loft — exposed brick, pendant lights, plants",
                "hotel rooftop pool — blue water, white cabana, sun",
                "night market lantern glow — warm red-orange ambient",
                "rice terrace Ubud — green tiered landscape, misty morning",
            ],
            "human_element": [
                "hands delicately holding or interacting with product — manicured",
                "forearm and wrist detail with product — accessory framing",
                "partial torso silhouette in background — lifestyle implied",
                "mirror reflection partial view — editorial POV",
                "product shadow on scene surface — poetic presence only",
                "no human — pure environmental lifestyle storytelling",
                "friend group energy blurred background — social context",
                "solo contemplative energy — quiet personal moment",
            ],
            "depth_of_field": [
                "tight portrait — only product sharp, background fully dissolved",
                "medium scene — product + immediate environment sharp, far blur",
                "environmental wide — full scene in focus, product contextualised",
                "foreground bokeh — out-of-focus element in front adds depth",
            ],
        },
    },
    "shadow_drama": {
        "name": "Shadow Drama",
        "desc": "Cahaya dramatis, bayangan bold yang artistik",
        "base": "SHADOW DRAMA: Single narrow directional light source creates bold graphic shadows. Chiaroscuro technique — extreme contrast between light and shadow zones. The shadow is as important as the product itself. Cinematic and premium.",
        "camera": "Slight low angle (15°) to elongate product shadow dramatically across surface.",
        "pools": {
            "light_source": [
                "hard narrow spotlight — 90° directly from hard left side",
                "strong cross-light — 45° from right, deep shadow left",
                "overhead pin-spot from directly above — product lit, surface in shadow",
                "backlit rim light only from behind — product silhouette with glowing edges",
                "under-lit upward floor bounce — unsettling ethereal feel",
                "diagonal key 45° overhead-front — classic cinematic Hollywood",
                "dual opposing side lights — two crossing shadows on surface",
                "slit light through narrow gap — high contrast dramatic stripe",
                "hard left 45° — textbook Rembrandt dramatic",
                "harsh afternoon sun simulation — sharp defined shadow",
            ],
            "shadow_pattern": [
                "venetian blind horizontal stripe shadows across product and surface",
                "tropical leaf silhouette projected onto background and product",
                "geometric grid lattice shadow overlay — architectural quality",
                "circular porthole cutout shadow frame on background",
                "abstract organic freeform shadow shape",
                "pure clean product shadow only — no pattern, maximum drama",
                "arch doorway shadow frame — theatrical stage quality",
                "palm frond shadow projection — tropical drama",
                "wire mesh shadow pattern — urban industrial texture",
                "rose branch with petals shadow — romantic drama",
                "paper cut architectural shadow — precise and graphic",
                "candlelight flicker shadow — warm intimate drama",
            ],
            "shadow_density": [
                "extreme 85% shadow coverage — product barely revealed in darkness",
                "dramatic 65% coverage — powerful moody balance",
                "artistic 45% — intentional shadow accent depth",
                "subtle 30% — shadow enhancement, product still dominant",
            ],
            "accent_light": [
                "single brand gold accent catch-light on product edge",
                "cool crisp blue rim backlight contrast from behind",
                "warm amber hair-light from above-behind",
                "neon brand-accent colour rim light — vibrant accent",
                "pure white specular catch-light — product surface detail",
                "no accent — pure silhouette and darkness",
            ],
        },
    },
    "abstract_brand": {
        "name": "Abstract Brand",
        "desc": "Bentuk geometris bold, konsep visual brand-forward",
        "base": "ABSTRACT BRAND CONCEPT: Bold geometric or abstract graphic shapes dominate the composition. Product shares visual weight with the graphic concept. Strong colour blocking in brand palette. Shapes create visual rhythm and brand identity statement.",
        "camera": "Flat 2D-feeling perspective — product at slight angle for dimensional tension.",
        "pools": {
            "shape_language": [
                "bold oversized circles and arc segments — brand identity rings",
                "hard rectangular blocks and squares — grid system architecture",
                "dynamic diagonal slashing lines — kinetic energy movement",
                "organic blob fluid amoeba forms — soft modern design",
                "sharp triangular angular geometry — precision and edge",
                "concentric ring pattern radiating from product centre",
                "overlapping translucent layered colour panels — depth",
                "modular tile grid system — systematic and modern",
                "hexagonal honeycomb tile pattern — structural premium",
                "flowing wave curves — elegant movement",
                "starburst radial energy lines from centre",
                "scattered random small geometric confetti",
                "large half-circle arch frame — monumental architecture",
                "irregular polygon mosaic — broken tile premium",
                "thin line art contour sketch overlay — artistic layer",
            ],
            "shape_scale": [
                "one single dominant massive shape — fills 70%+ of background",
                "two to three balanced shapes — composed tension",
                "complex multi-layer overlapping shapes — rich graphic depth",
                "small repeating pattern texture — subtle system",
            ],
            "product_treatment": [
                "product fully revealed — shapes as background system",
                "product partially masked by bold foreground shape",
                "product as negative space cutout through shape",
                "product very small 20% of frame — graphic concept completely dominates",
                "product centred in geometric frame/window shape",
            ],
            "color_application": [
                "shapes in brand primary colour only — monochromatic bold",
                "smooth gradient from brand primary to accent on shapes",
                "brand accent yellow/gold shapes only — warm statement",
                "duotone brand primary + secondary flat fill",
                "neon glow outline-only shapes — luminous dark background",
                "split complementary two-hue high contrast shapes",
                "white shapes on brand primary background — inverse",
                "black shapes on brand-cream background — stark minimal",
            ],
        },
    },
    "texture_surface": {
        "name": "Texture & Surface",
        "desc": "Produk di atas permukaan premium bertekstur tinggi",
        "base": "TEXTURE & SURFACE: Product placed on a premium textured surface that amplifies brand identity. The surface material should feel aspirational and brand-appropriate. Shallow depth of field makes surface texture sensuous and tactile.",
        "camera": "Low 20-30° angle — surface depth and product in the same frame simultaneously.",
        "pools": {
            "surface_material": [
                "Carrara white marble with dramatic grey-gold veins — Italian luxury",
                "Nero Marquinia black marble with stark white veins — bold prestige",
                "distressed aged reclaimed oak wood — warm heritage craft",
                "raw industrial brushed concrete — urban premium",
                "dark forest green velvet fabric — rich tactile luxury",
                "natural unbleached linen canvas woven — artisan texture",
                "brushed antique brass metal sheet — warm metallic premium",
                "matte hand-thrown terracotta ceramic — organic warmth",
                "crushed watered silk fabric — iridescent luxury",
                "rough warm sandstone desert texture — natural earthiness",
                "speckled emerald terrazzo composite — modern luxury",
                "rose quartz crystal slab — mineral luxury",
                "futuristic cast resin with embedded dried flowers — avant-garde",
                "woven natural rattan surface — tropical artisan",
                "patinated oxidised copper — aged premium warmth",
                "bleached white limestone flat — architectural minimal",
                "fine dark slate stone — cool precision",
                "sage green rough plaster — artisan matte",
                "hammered sterling silver sheet — reflective luxury",
                "hand-painted ceramic mosaic tile — artisan colour",
            ],
            "surface_angle": [
                "15° barely visible surface — almost completely flat ground-level",
                "22° standard elegant low product photography angle",
                "30° balanced environment and product equally shown",
                "42° dramatic showing full texture environment context",
                "55° high angle — more texture visible than usual",
            ],
            "surface_lighting": [
                "raking light at 10° — surface texture maximally revealed",
                "soft front fill — surface colour accurate, texture moderate",
                "backlit from behind — surface translucency glows",
                "side-lit 45° — deep texture shadow definition",
                "overhead diffused — even clean surface tone",
                "dramatic hard side — extreme texture shadow depth",
            ],
            "product_placement": [
                "product elevated on small invisible riser — floating with drop shadow",
                "product lying flat directly on surface — fully integrated",
                "product leaning gently supported against background",
                "product partially submerged in soft surface material",
                "product with packaging material artfully arranged around it",
            ],
        },
    },
    "nature_botanical": {
        "name": "Nature & Botanical",
        "desc": "Produk dikelilingi elemen alam dan tanaman hidup",
        "base": "NATURE & BOTANICAL: Product immersed in lush organic natural environment. Living plants, botanical elements, natural light. Feels fresh, sustainable, alive. The nature backdrop amplifies the product's organic premium quality.",
        "camera": "Eye-level or slight high angle — natural intimate perspective.",
        "pools": {
            "plant_type": [
                "giant tropical monstera deliciosa split leaves",
                "dried pampas grass plumes — soft beige cream billows",
                "cherry blossom branches in full pink bloom",
                "eucalyptus silver-dollar sprigs with blue-grey leaves",
                "lush fern and moss ground cover — deep green forest floor",
                "desert cactus and assorted succulents — minimal sculptural",
                "silver-green olive branch with small olives",
                "purple lavender bundle — aromatic Provençal mood",
                "tall bamboo stalks — Japanese zen minimal",
                "tropical palm fronds — resort vacation energy",
                "wildflower meadow mix — romantic countryside",
                "Japanese pine branch with miniature cones",
                "tropical banana leaf broad emerald green",
                "dried wheat stalks golden — harvest warmth",
                "tropical heliconia exotic flowers — bold colour",
                "dark green tropical rubber fig leaves — modern interior",
                "white calla lily elegant — pure minimal drama",
                "tropical bird of paradise flower — bold statement",
                "cascading pothos vine — trailing lush green",
                "dried lunaria honesty seed pods — translucent silver",
            ],
            "nature_setting": [
                "bright greenhouse interior — white iron frame, dappled glass light",
                "forest floor with golden dappled light beams through canopy",
                "floating on water surface surrounded by floating petals",
                "botanical garden moss stone path — heritage garden feel",
                "tropical jungle close-up leaf backdrop — immersive green",
                "desert landscape rock and warm sand — minimal arid beauty",
                "seaside cliff wild herb coastal — salt air feeling",
                "mountain meadow soft morning mist — ethereal",
                "rain forest misty atmosphere — humid lush green world",
                "zen garden raked sand and moss stones",
                "wildflower field open horizon — open air freedom",
                "koi pond water reflection — Japanese tranquility",
            ],
            "light_quality": [
                "soft dappled light filtering through leaf canopy — organic pattern",
                "bright clear outdoor natural midday light — fresh clean",
                "warm golden magic hour backlight — rim-lit nature glow",
                "overcast soft diffused even grey-white — colour accurate",
                "blue hour cool twilight — magical transition",
                "shaft of light cutting through forest gap — cinematic divine",
                "studio-lit placed nature element — controlled premium",
                "rain droplets on leaves with overcast light — fresh after rain",
            ],
            "integration_style": [
                "product centred in natural bower of plants — nature frames product",
                "product on natural surface — plants in background bokeh",
                "plants as foreground blur frame — product in sharp middle ground",
                "product partially nestled among plant elements — grown-in quality",
                "product and plants in equal visual weight balanced composition",
            ],
        },
    },
    "urban_context": {
        "name": "Urban Context",
        "desc": "Produk dalam konteks kota urban dan street aesthetic",
        "base": "URBAN CONTEXT: Product placed in authentic urban street context. City textures — concrete, steel, glass, neon, pavement — create a modern edge. Brand feels relevant, current, street-credible.",
        "camera": "Street-level 35mm eye-level — candid urban documentary feel.",
        "pools": {
            "urban_element": [
                "bold street art graffiti mural wall — colour and energy",
                "neon sign glow reflections on wet pavement below product",
                "rain puddle mirror reflection — product and city both visible",
                "brutalist concrete architecture facade — raw texture backdrop",
                "steel and glass modern skyscraper curtain wall reflection",
                "traditional warung shop front painted wood — local culture",
                "café window interior with city street visible beyond",
                "underground parking structure geometric pillar lines",
                "industrial warehouse raw interior — exposed brick and beam",
                "mosaic staircase street steps — colourful art",
                "bus stop advertising panel context — urban at scale",
                "underpass tunnel with light at end — urban dramatic",
                "night market stall glow — street food lantern energy",
                "metro commuter rail platform edge — commuter culture",
                "rooftop with city antenna skyline behind — urban above-it-all",
                "printed concrete floor pattern — geometric street art",
                "painted traffic crossing bold lines — graphic urban",
            ],
            "time_atmosphere": [
                "harsh midday sun — hard urban shadows, vibrant colour",
                "golden hour warm building wall glow — city turned amber",
                "rainy night neon reflections on wet street — cinematic",
                "blue hour twilight city glow — transition magic",
                "overcast grey urban moody — stark contemporary",
                "full night black dramatic — lit windows sparkle background",
                "foggy morning city haze — atmospheric moody",
                "magic hour post-rain — wet streets, steam rising",
            ],
            "depth_framing": [
                "foreground city element in bokeh frames sharp product — layered",
                "product sharp and clear — urban environment behind equally sharp",
                "extreme background blur — city only as colour impression",
                "symmetrical urban architecture frames product on both sides",
                "product small in large urban environment — scale contrast",
            ],
            "mood": [
                "gritty authentic raw energy — unpolished real street",
                "sleek premium urban — glass and steel cool luxury",
                "warm local community market energy",
                "night life neon electric energy — after-dark city",
                "morning commuter hustle — productive urban life",
            ],
        },
    },
    "cutout_pop": {
        "name": "Cut-Out Pop",
        "desc": "Produk melayang di atas background warna bold graphic",
        "base": "CUT-OUT POP: Product cleanly cut out and floating against a bold flat graphic background. Maximum colour contrast. Design-led, graphic, social-media-native. Product feels iconic and statement-making.",
        "camera": "Straight-on frontal — product fully revealed, no angle distortion.",
        "pools": {
            "bg_treatment": [
                "brand primary solid bold — maximum brand statement",
                "brand accent yellow/gold bold — vibrant warm energy",
                "complementary opposite hue to product — high contrast pop",
                "vibrant saturated neon — electric social native energy",
                "pastel soft tint of brand secondary — approachable gentle",
                "deep dark near-black dramatic — luxury premium",
                "pure clean white minimal — uncluttered modern",
                "diagonal split two-colour brand primary + accent",
                "radial gradient burst from product centre — energetic",
                "bold horizontal stripe brand palette stripes",
                "colour-blocked sections brand full palette",
                "halftone dot pattern in brand primary — retro graphic",
            ],
            "shadow_treatment": [
                "hard geometric 45° cast shadow on background wall — graphic",
                "long dramatic floor shadow extending horizontally — cinematic",
                "no shadow clean float — pure graphic cutout",
                "multiple crossing shadows from multiple light sources",
                "subtle soft shadow beneath product — gentle float",
                "neon glow halo around product edges — electric premium",
                "double shadow — slight colour difference two sources",
                "3D extrusion shadow — product gains physical depth",
            ],
            "graphic_overlay": [
                "bold outline stroke around product edges — comic art style",
                "halftone print pattern fills background",
                "brand name as giant background typographic element",
                "completely clean no overlay — product only",
                "simple geometric shape behind product — context frame",
                "starburst radial energy lines from product centre",
                "confetti scatter pattern on background",
                "grid crosshatch lines background pattern",
                "abstract colour shapes scattered on background",
            ],
            "product_scale": [
                "product fills 70%+ of frame — maximum impact",
                "product at 50% — balanced graphic composition",
                "product small 30% — graphic and text dominant",
                "product off-centre bleeding at edge — dynamic crop",
            ],
        },
    },
    "duotone_mood": {
        "name": "Duotone Mood",
        "desc": "Filter dua warna brand membungkus seluruh foto",
        "base": "DUOTONE MOOD: The entire image treated with duotone colour mapping — shadows map to one brand colour, highlights to another. Creates a cohesive, mood-drenched, instantly recognisable brand aesthetic.",
        "camera": "Any angle — duotone treatment is the dominant visual element.",
        "pools": {
            "color_pair": [
                "brand primary dark + brand cream light — brand signature duo",
                "deep gold + forest dark — warm premium contrast",
                "cobalt blue + warm amber — cool/warm high contrast",
                "monochromatic single brand hue — shadows dark, highlights light",
                "brand primary + pure complementary opposite hue",
                "blush rose pink + deep burgundy — feminine luxury",
                "seafoam mint + deep navy — coastal calm",
                "burnt orange + cool slate grey — contemporary craft",
                "bright emerald + pale gold — rich and vibrant",
                "deep purple + warm copper — regal warmth",
                "electric neon pink + near black — night energy",
                "sky blue + warm sand — open optimistic",
            ],
            "duotone_technique": [
                "full saturated classic duotone — both colours completely replace tones",
                "subtle tinted — natural colours preserved 40% through toned wash",
                "halftone dot duotone — screen print vintage graphic look",
                "gradient map blend — smooth tonal remap across luminance",
                "split-toned — shadows one hue, highlights different hue",
                "colour wash overlay partial — 60% saturation treatment",
                "risograph print texture — grainy offset-print quality",
                "high-contrast solarise duotone — pushed drama",
            ],
            "product_treatment": [
                "product fully duotone treated — fully colour-mapped",
                "product natural colour only — background and frame duotone",
                "product partially treated — fading from natural to duotone",
                "product in white channel — clean product on duotone scene",
            ],
            "grain_texture": [
                "fine grain texture over entire image — film quality",
                "heavy grain — lo-fi editorial aesthetic",
                "clean smooth no grain — digital precision",
                "paper texture grain overlay — printed quality",
            ],
        },
    },
    "minimal_type": {
        "name": "Minimal & Type",
        "desc": "Tipografi bold mendominasi, produk sebagai aksen",
        "base": "MINIMAL TYPE-DOMINANT: Typography is the hero of this composition. Bold, confident type fills the majority of the frame. Product is present but plays a supporting accent role. Graphic design-forward, magazine editorial quality.",
        "camera": "Flat 2D perspective — typographic layout clarity is priority.",
        "pools": {
            "type_dominance": [
                "typography 70% — product 30% visual weight — balanced type-led",
                "typography 80% extreme — product as small corner accent only",
                "typography 55% — product 45% — near-equal tension",
                "full-bleed type background — product overlaid as layer",
            ],
            "type_treatment": [
                "single massive word ultra-bold full bleed — one word statement",
                "stacked multi-line statement bold type — rhythmic",
                "single elegant word ultra-thin light weight — refined",
                "mixed weight — one word ultra-bold, second thin light",
                "all caps condensed tight tracking — maximum density",
                "loose generous open letter-spacing airy and breathing",
                "oversized initial letter drop-cap — editorial book quality",
                "outlined stroke type — hollow letters on colour field",
                "italic expressive diagonal energy — dynamic motion",
                "serif editorial classic — refined heritage typography",
                "sans-serif Swiss grid precision — modern systematic",
                "hand-lettered brushstroke calligraphy feel — artisan warmth",
            ],
            "background": [
                "solid brand primary colour flat — maximum brand statement",
                "smooth gradient sweep brand primary to accent",
                "subtle linen paper texture behind type — editorial print",
                "pure white maximum negative space — breathing room",
                "deep dark brand colour dramatic — luxury night mode",
                "brand cream background — warm approachable foundation",
                "textured concrete behind type — urban editorial",
                "blurred soft photo behind type — photography as texture",
            ],
            "layout_structure": [
                "centred symmetrical axis — formal editorial authority",
                "strong left-aligned flush left — Swiss design rigour",
                "asymmetric right-heavy tension — dynamic imbalance",
                "diagonal axis 15° tilt — kinetic energy layout",
                "overlapping layered type planes — depth and dimension",
                "isolated single word maximum negative space — confident",
            ],
        },
    },
    "behind_glass": {
        "name": "Behind Glass",
        "desc": "Efek kaca atau cermin yang dramatis dan premium",
        "base": "BEHIND GLASS: Product interacts with a glass surface — frosted, clear, reflective, or textured. The glass creates mystery, depth, and premium tension. Part concealed, part revealed. Elegant and editorial.",
        "camera": "Eye-level or slight angle — glass effects most dramatic at eye-level.",
        "pools": {
            "glass_type": [
                "frosted acid-etched glass panel — product softly blurred behind",
                "clear float glass — sharp product reflection doubles the image",
                "textured shower ripple glass — strong refraction distortion",
                "multi-faceted geometric crystal glass prism — spectral refraction",
                "rain droplets on clear glass — fresh organic natural",
                "half-mirror silver — one side sees product, one sees reflection",
                "glass block architectural brick — multiple refracted images",
                "wine glass curved reflection — distorted magnification",
                "broken cracked glass panel — dramatic tension and drama",
                "antique aged mirror — mercury patina aged silver",
                "frosted gradient glass — clear at top, opaque at bottom",
                "carved etched pattern glass — decorative arts luxury",
                "smoked grey tinted glass — dark premium contemporary",
                "textured hammered glass — artisan quality",
                "aquarium water glass — product inside or beside",
            ],
            "scene_behind": [
                "abstract brand colour wash — pure hue visible through glass",
                "lifestyle environment glimpsed through glass — context story",
                "pure bright white void behind — minimal dramatic",
                "deep dark black void behind — luxury night mode",
                "garden botanical visible — lush green blur through glass",
                "city lights bokeh visible — urban glamour",
                "warm amber interior — cozy domestic beyond glass",
            ],
            "glass_position": [
                "glass as close foreground frame — product sharp behind glass",
                "glass as background — product in front clear, glass behind",
                "product half-emerging through broken glass plane — dramatic",
                "product reflected in glass surface — double presence",
                "product and glass in equal middle ground — glass conversation",
            ],
            "atmospheric_quality": [
                "cold wet condensation mist on glass — fresh temperature contrast",
                "steamy heat condensation — warm product hot quality",
                "clean dry crystal clarity — precision premium",
                "fingerprint smudge traces — human touch evidence",
                "water rivulets running down glass — rain effect",
                "frost ice crystal formation on glass — winter premium",
            ],
        },
    },
}

# ── Variation angles — randomly injected per generate call (carousel + food) ──
VARIATION_ANGLES = [
    "Introduce one unexpected bold graphic element from brand palette as foreground frame.",
    "Use a circular or arch crop shape to reveal the product — architectural framing.",
    "Add a subtle colour gradient wash from brand primary to transparent over background.",
    "Place product with slight tilt (5-8°) — dynamic tension without looking careless.",
    "Use negative space aggressively — product occupies only 35% of frame, bold text dominates.",
    "Add a thin brand-coloured ruled line as typographic element separating content zones.",
    "Foreground blur element (out-of-focus prop) creates cinema-style depth field.",
    "Symmetrical mirror-style composition — product centre, equal visual weight both sides.",
    "Use a strong diagonal composition line — product at intersection of two visual planes.",
    "Add unexpected scale play — one tiny element beside one very large element for contrast.",
    "Use a restricted colour palette — only three colours total in entire image.",
    "Create visual tension with asymmetric off-centre composition deliberately unbalanced.",
    "Apply strong vignette — edges darkened drawing eyes to bright product centre.",
    "Incorporate a graphic printed element (stamp, seal, badge) that frames the product.",
    "Use repetition — product or an element appears multiple times in decreasing size.",
    "Add a single striking reflective surface underneath product — floor mirror plane.",
    "Create a layered composition with foreground, middle, background clearly distinct.",
    "Bold typography treatment — one word in massive scale near product as design element.",
    "Use a complementary colour accent that appears only once as deliberate pop.",
    "Frame the product inside a real-world object — window frame, doorway arch, or round portal.",
]

import random as _random


def _pick_concept_variation(concept_key: str) -> dict:
    """Randomly sample dimension pools to build a unique sub-theme each call.
    With pools of ~15 options × 4–5 dimensions, there are tens of thousands
    of combinations per concept — making every generate call visually unique."""
    concept = CONCEPT_POOLS.get(concept_key)
    if not concept:
        concept_key = _random.choice(list(CONCEPT_POOLS.keys()))
        concept = CONCEPT_POOLS[concept_key]

    picks = {dim: _random.choice(opts) for dim, opts in concept["pools"].items()}

    # Build combined directive: base concept + each randomly-picked dimension
    directive_parts = [concept["base"]]
    for dim_label, pick in picks.items():
        directive_parts.append(f"[{dim_label.upper().replace('_', ' ')}]: {pick}.")

    return {
        "name": concept["name"],
        "key": concept_key,
        "directive": " ".join(directive_parts),
        "camera": concept.get("camera", ""),
        "variation_picks": picks,
    }

def _build_banner_prompt(payload: BannerPromptIn, brand: Optional[dict]) -> dict:
    brand = brand or {}
    color_primary = _extract_hex(brand.get("color_primary", "#0B3D2E"))
    color_secondary = _extract_hex(brand.get("color_secondary", "#FDFBF7"))
    brand_name = brand.get("brand_name", payload.product_name or "Brand")
    brand_archetype = brand.get("archetype", "")
    brand_personality = ARCHETYPE_VOICE.get(brand.get("archetype", "expert"), "professional")
    category = brand.get("category", "")
    target_audience = brand.get("target_audience", "")
    words_always = brand.get("words_always", []) or []
    proof_points = brand.get("proof_points", []) or []
    signature_phrase = brand.get("signature_phrase", "")

    # Use module-level Brand DNA lookup tables
    cat_visual = CATEGORY_VISUAL.get(category, CATEGORY_VISUAL_DEFAULT)
    tone_typo = TONE_TYPOGRAPHY.get(brand_personality, TONE_TYPOGRAPHY["professional"])
    audience_mood = AUDIENCE_MOOD.get(target_audience, "")

    # ── Composition concept: user-chosen or random each generate call ──────────
    concept = _pick_concept_variation(payload.composition_concept or "")
    variation_hint = _random.choice(VARIATION_ANGLES)

    # ── Auto-derive creative brief from product_name + headline + brand DNA ───
    product_name = payload.product_name or brand_name
    headline = payload.headline or f"Kenali {product_name}"

    # Smart auto-subheadline: derive from tone + category if user left blank
    effective_subheadline = payload.subheadline
    if not effective_subheadline and brand_personality and category:
        tone_sub_hints = {
            "professional": f"Kualitas terpercaya untuk kebutuhan {category.split('/')[0].strip().lower()} Anda",
            "friendly": f"Karena {product_name} hadir untuk memudahkan harimu",
            "playful": f"Coba {product_name} — sekali coba, ketagihan!",
            "premium": f"Eksklusif. Presisi. {product_name}.",
            "urgent": f"Stok terbatas — dapatkan {product_name} sekarang",
        }
        effective_subheadline = tone_sub_hints.get(brand_personality, "")

    # Smart creative brief: the 'why this product matters to this audience'
    creative_brief = f"Product '{product_name}' by {brand_name}"
    if category:
        creative_brief += f" in the {category} category"
    if target_audience:
        creative_brief += f", targeting {target_audience}"
    if brand_personality:
        creative_brief += f", brand voice is {brand_personality}"
    if cat_visual.get("emotion"):
        creative_brief += f". The desired emotional response: {cat_visual['emotion']}"

    # Normalize stored visual_style slug ("minimal-clean" or legacy "luxury") to display name
    resolved_style = VISUAL_STYLE_KEY_MAP.get(brand.get("visual_style", ""), "Minimal Clean")
    effective_style = VISUAL_STYLE_KEY_MAP.get(payload.style_preset, resolved_style)
    style_info = VISUAL_STYLE_DIRECTIVES.get(effective_style, VISUAL_STYLE_DIRECTIVES["Minimal Clean"])

    # Campaign goal — dramatically changes prompt output direction
    goal_key = payload.campaign_goal if payload.campaign_goal in CAMPAIGN_GOAL_DIRECTIVES else "brand_awareness"
    goal = CAMPAIGN_GOAL_DIRECTIVES[goal_key]

    placement_rules = {
        "center": (
            "COMPOSITION: Product as center hero, perfectly centered. "
            "Generous equal negative space on all sides. Typography floats above or below with clear separation zone. "
            "Background extends uniformly around product."
        ),
        "left": (
            "COMPOSITION: Product anchored LEFT side (occupying left 45% of frame). "
            "RIGHT side is clean typography zone — headline, subheadline, features, CTA from top to bottom. "
            "Clear invisible dividing line between visual and text zones."
        ),
        "right": (
            "COMPOSITION: Product anchored RIGHT side (occupying right 45% of frame). "
            "LEFT side is clean typography zone — headline, subheadline, features, CTA stacked vertically. "
        ),
        "top": (
            "COMPOSITION: Product in UPPER 55% of frame — dominant visual presence. "
            "LOWER 45%: brand color band with headline, CTA, brand name. Clean separation."
        ),
        "bottom": (
            "COMPOSITION: UPPER 50%: bold headline and brand messaging in clean zone. "
            "LOWER 50%: product hero shot as visual anchor. "
        ),
    }
    placement = placement_rules.get(payload.placement_rule, placement_rules["center"])

    cta_text = payload.call_to_action or "Pesan Sekarang"

    features_detail = ""
    if payload.features:
        feat_lines = [f"• {f}" for f in payload.features]
        features_detail = "Features to callout as floating UI badges: " + ", ".join(payload.features)

    brand_positioning = brand.get("brand_positioning", "")
    brand_personality_list = brand.get("brand_personality", [])
    brand_donts = brand.get("brand_donts", [])

    brand_context = ""
    if brand_positioning:
        brand_context += f"Brand positioning: {brand_positioning}. "
    if brand_personality_list:
        brand_context += f"Brand personality: {', '.join(brand_personality_list)}. "
    if brand_donts:
        brand_context += f"STRICT VISUAL RESTRICTIONS — absolutely do NOT include any of these: {', '.join(brand_donts)}. "
    if brand_archetype:
        brand_context += f"Brand archetype: {brand_archetype}. "
    if brand_personality:
        brand_context += f"Brand tone of voice: {brand_personality}. "
    if category:
        brand_context += f"Product category: {category}. "
    if target_audience:
        brand_context += f"Target audience: {target_audience}. "
    if words_always:
        brand_context += f"Brand keywords to reflect visually: {', '.join(words_always)}. "
    if proof_points:
        brand_context += f"Key brand proof points: {'; '.join(proof_points)}. "
    if signature_phrase:
        brand_context += f"Brand signature phrase: '{signature_phrase}'. "

    return {
        "task_type": "instagram_feed_post_generation",
        "system_directive": (
            "You are an elite Instagram Art Director and Commercial Photographer at a top Indonesian creative agency. "
            "Create a premium, scroll-stopping Instagram feed post that communicates brand value within 0.3 seconds. "
            "Every visual decision — color, light, prop, typography weight — must serve the brand DNA and target audience. "
            "The result must be indistinguishable from content produced by Wunderman Thompson, TBWA, or top Jakarta brand studios."
        ),
        "creative_brief": creative_brief,
        "composition_concept": {
            "key": concept["key"],
            "name": concept["name"],
            "directive": concept["directive"],
            "camera_angle": concept["camera"],
            "variation_picks": concept["variation_picks"],
        },
        "variation_directive": variation_hint,
        "model_parameters": {
            "aspect_ratio": payload.aspect_ratio,
            "style_preset": effective_style,
            "quality": "high",
            "photorealism": "ultra-realistic, 8K, magazine-grade commercial photography",
        },
        "prompt_structure": {
            "subject": f"Instagram feed post for {brand_name} — {effective_style} style, {brand_personality or 'professional'} tone",
            "brand_context": brand_context,
            "branding_elements": {
                "brand_name": brand_name,
                "product_name": product_name,
                "headline": headline,
                "subheadline": effective_subheadline,
                "description": payload.description,
                "call_to_action": cta_text,
            },
            "campaign_goal_directive": {
                "goal": goal_key,
                "name": goal["name"],
                "visual_directive": goal["visual_directive"],
                "emotional_trigger": goal["emotional_trigger"],
                "cta_style_hint": goal["cta_style"],
            },
            "product_visual_layout": {
                "expected_images_count": payload.expected_images_count,
                "composition_style": payload.composition_style,
                "placement_rule": placement,
                "integration_directive": (
                    "The product must be seamlessly composited — accurate drop shadow and reflection matching the lighting setup. "
                    "Product edges must look natural, not cut-out. "
                    f"{'Single product as sole hero subject.' if payload.expected_images_count == 1 else f'Arrange all {payload.expected_images_count} products in unified grouped composition.'}"
                ),
            },
            "information_layout": {
                "features_to_highlight": payload.features,
                "features_display": features_detail,
                "cta_directive": (
                    f"Add a prominent CTA element with text: '{cta_text}'. "
                    f"Style: pill-shaped button in brand primary color {color_primary}. "
                    "Position: lower third of the typography zone. "
                    "Must be immediately readable on mobile at 375px width."
                ) if cta_text else "",
            },
            "visual_style_details": {
                "color_palette": {
                    "background_dominant": color_primary,
                    "accent_elements": color_secondary,
                    "palette_rule": (
                        f"STRICT: Use ONLY these brand hex colors throughout the entire composition. "
                        f"Background and largest surfaces MUST use {color_primary} as the dominant color — "
                        "NEVER use generic white/gray/beige unless that IS the brand color. "
                        f"Accent elements, highlights, CTA buttons, and small details use {color_secondary}. "
                        "Color consistency is non-negotiable — this is the brand identity."
                    ),
                },
                "lighting_setup": payload.lighting or style_info.get("photography", "Diffused softbox lighting"),
                "color_temperature": cat_visual.get("color_temp", "5500K balanced daylight"),
                "aesthetic_keywords": style_info.get("mood", ""),
                "style_photography": style_info.get("photography", ""),
                "style_typography": style_info.get("typography", ""),
                "style_colour_use": style_info.get("colour_use", ""),
                "category_environment": cat_visual.get("environment", ""),
            },
            "category_specific_art_direction": {
                "ambient_props": cat_visual.get("props", ""),
                "emotional_directive": f"The image must evoke: {cat_visual.get('emotion', 'quality and trust')}",
                "audience_mood": audience_mood,
                "category": category,
            },
            "typography_instructions": (
                f"Typography style: {tone_typo} "
                "Hierarchy: 1) Main headline (largest, boldest — 2–5 impactful words), "
                "2) Subheadline (supporting context, 60% of headline size), "
                "3) Feature callouts (compact icon badges if applicable), "
                "4) CTA (high-contrast pill button). "
                "Minimum 5% canvas-edge padding on all text. "
                "Every word must be immediately readable on a 375px mobile screen."
            ),
            "scroll_stopping_rules": [
                "First 0.3s: viewer instantly reads brand color, mood, and product category",
                "Visual hierarchy is strict: product hero → headline → supporting info → CTA",
                f"Emotional trigger for target audience '{target_audience or 'general'}': {cat_visual.get('emotion', 'quality')}",
                "Maximum 3 font sizes in the entire composition — no more",
                "Intentional negative space — crowded = amateur, breathing room = premium",
                "Every decorative element must reinforce brand personality, not distract",
                "CTA must be visible without scrolling, contrast ratio ≥ 4.5:1",
            ],
            "negative_prompt": (
                "ugly, deformed, blurry, noisy, pixelated, distorted product shape, "
                "warped text, misspelled words, text artifacts, unreadable typography, "
                "cluttered chaotic background, random unrelated objects, generic stock-photo look, "
                "white studio void background (unless brand secondary IS white), "
                "watermarks, signatures, artist name overlays, "
                "oversaturated neon (unless Vibrant Pop style), HDR artifacts, "
                "plastic-looking product render, cheap clipart decorations, "
                "mismatched fonts, more than 3 different font families"
            ),
        },
        "human_model_directive": _build_human_directive(payload, brand) or None,
    }


# ── Carousel V2: Creative Brief Builder ───────────────────────────────────────

_VISUAL_TYPE_DIRECTIVES = {
    "product_only": {
        "composition": "Hero product center-frame, clean minimal background, strong shadow or reflection",
        "camera": "Medium close-up or macro, slight low-angle for premium feel",
        "lighting": "Softbox studio lighting, controlled highlights, no harsh shadows",
        "focal_point": "Product as 100% hero, zero human presence",
        "prop_recommendation": "Minimal brand-colored props or natural elements matching product category",
    },
    "human_product": {
        "composition": "Human occupies 55-65% of frame, product clearly visible and branded",
        "camera": "Medium portrait, slight telephoto compression",
        "lighting": "Natural window light or studio with diffusion, flattering skin tones",
        "focal_point": "Eyes first, product second — both must be sharp",
        "prop_recommendation": "Minimal lifestyle context props, product in hand or nearby",
    },
    "human_only": {
        "composition": "Full lifestyle portrait, environment tells the brand story",
        "camera": "Medium to wide, environmental context",
        "lighting": "Golden hour or soft natural, lifestyle mood",
        "focal_point": "Human expression and body language as primary narrative",
        "prop_recommendation": "Lifestyle props matching brand category and target audience",
    },
    "graphic_design": {
        "composition": "Typography-dominant layout, 60-70% text area, geometric or grid-based",
        "camera": "N/A — graphic composition",
        "lighting": "N/A — flat design or gradient brand colors",
        "focal_point": "Headline text or key data point",
        "prop_recommendation": "Brand icons, geometric shapes, data visualizations",
    },
    "mixed": {
        "composition": "Dynamic balance of product, human, and graphic elements per slide role",
        "camera": "Varies per slide — hook uses wide, solution uses close-up",
        "lighting": "Consistent lighting family across slides despite composition changes",
        "focal_point": "Shifts per slide: hook = human, solution = product, cta = brand",
        "prop_recommendation": "Rich lifestyle context with prominent product integration",
    },
}

_PHOTO_STYLE_MAP = {
    "studio": "Controlled studio environment, seamless backdrop, professional lighting setup, commercial grade",
    "lifestyle": "Real-life environment, authentic moments, natural light, candid yet styled",
    "ugc": "User-generated content aesthetic, lo-fi quality, authentic imperfect, raw and relatable",
    "editorial": "Magazine-quality, dramatic lighting, artistic composition, high concept",
    "commercial": "Clean commercial photography, product-forward, bright and inviting",
    "flatlay": "Overhead bird's-eye view, flat arrangement, styled product and props on surface",
    "auto": "",
}

_VISUAL_PRIORITY_MAP = {
    "product_first": "Product must occupy the dominant visual real estate (60%+). Human or lifestyle elements are supporting only.",
    "human_first": "Human subject is the hero (60%+). Product is present but secondary — emotionally in background.",
    "balanced": "Product and human share equal visual weight. Neither dominates — harmonious tension.",
}

_CONTENT_GOAL_VISUAL = {
    "promo": {"emotional_tone": "urgent, exciting, deal-driven", "cta_emphasis": "price + discount badge + deadline"},
    "launch": {"emotional_tone": "fresh, innovative, anticipatory", "cta_emphasis": "new product reveal + shop now"},
    "best_seller": {"emotional_tone": "trusted, proven, popular", "cta_emphasis": "social proof + buy now"},
    "restock": {"emotional_tone": "relief, urgency, FOMO", "cta_emphasis": "back in stock + limited quantity"},
    "testimoni": {"emotional_tone": "trustworthy, warm, credible", "cta_emphasis": "real results + community"},
    "edukasi": {"emotional_tone": "helpful, expert, informative", "cta_emphasis": "learn more + follow for tips"},
    "brand_awareness": {"emotional_tone": "aspirational, authentic, brand-first", "cta_emphasis": "follow + explore brand"},
}

_TALENT_ETHNICITY_DIRECTIVE = {
    "korean": "Korean or East Asian talent, clear skin emphasis, minimal makeup or K-beauty aesthetic",
    "indonesian": "Indonesian talent, warm skin tone, relatable Southeast Asian features",
    "asian": "Asian talent (any nationality), natural and authentic",
    "western": "Western/Caucasian talent",
    "auto": "Southeast Asian talent by default, matching brand's target audience demographics",
}

_TALENT_AGE_DIRECTIVE = {
    "teen": "15-19 years old, youthful energy",
    "young_adult": "20-30 years old, modern lifestyle",
    "adult": "30-45 years old, professional and confident",
    "mature": "45+ years old, sophisticated and experienced",
}

_VALIDATION_RULES = [
    # (condition_fn, auto_fix_fn, warning_msg)
    (
        lambda b: b["content_goal"] in ("promo", "restock") and b["photo_style"] == "ugc" and b["style_preset"] in ("Luxury Editorial", "Luxury Spa", "Luxury Korean"),
        lambda b: {**b, "photo_style": "commercial"},
        "Promo/Restock + Luxury preset + UGC style konflik → photo_style diubah ke commercial",
    ),
    (
        lambda b: b["visual_type"] == "product_only" and b["human_enabled"],
        lambda b: {**b, "human_enabled": False},
        "visual_type=product_only tidak kompatibel dengan human talent → talent dinonaktifkan",
    ),
    (
        lambda b: b["content_goal"] == "testimoni" and b["visual_type"] == "graphic_design",
        lambda b: {**b, "visual_type": "human_product"},
        "Testimoni + graphic_design konflik → visual_type diubah ke human_product",
    ),
    (
        lambda b: b["ai_director_mode"] == "simple" and any([b["mood_override"], b["lighting_override"], b["composition_override"], b["camera_style_override"]]),
        lambda b: {**b, "mood_override": "", "lighting_override": "", "composition_override": "", "camera_style_override": ""},
        "Mode simple: advanced overrides diabaikan — AI Director mengambil alih sepenuhnya",
    ),
]


def _build_carousel_creative_brief(payload: "CarouselPromptIn", brand: dict) -> dict:
    """Build the central creative brief object that drives the entire carousel generation."""
    brand = brand or {}
    effective_goal = payload.content_goal if payload.content_goal in _CONTENT_GOAL_VISUAL else payload.campaign_goal
    effective_cta = payload.final_cta or payload.call_to_action or "Swipe ke kanan!"
    effective_product = payload.product_name or brand.get("brand_name", "")
    effective_audience = payload.target_audience or brand.get("target_audience", "")

    brand_personality = ARCHETYPE_VOICE.get(brand.get("archetype", "expert"), "professional")
    cat_visual = CATEGORY_VISUAL.get(brand.get("category", ""), CATEGORY_VISUAL_DEFAULT)
    goal_vis = _CONTENT_GOAL_VISUAL.get(effective_goal, _CONTENT_GOAL_VISUAL["brand_awareness"])
    resolved_style = VISUAL_STYLE_KEY_MAP.get(brand.get("visual_style", ""), "Minimal Clean")
    effective_style = VISUAL_STYLE_KEY_MAP.get(payload.style_preset, resolved_style)

    brief = {
        # ── Input layer ──
        "topic": payload.topic,
        "audience": effective_audience,
        "content_goal": effective_goal,
        "cta": effective_cta,
        "product": effective_product,
        "storytelling": payload.template,
        "slide_count": payload.slide_count,
        "aspect_ratio": payload.aspect_ratio,

        # ── Visual layer ──
        "visual_type": payload.visual_type,
        "visual_priority": payload.visual_priority,
        "photo_style": payload.photo_style,
        "style_preset": effective_style,
        "human_enabled": payload.human_enabled,

        # ── Talent layer ──
        "talent": {
            "gender": payload.talent_gender,
            "ethnicity": payload.talent_ethnicity,
            "age_group": payload.talent_age_group,
            "role": payload.talent_role,
        },

        # ── Reference ──
        "has_reference": bool(payload.reference_image_base64),

        # ── AI Director mode ──
        "ai_director_mode": payload.ai_director_mode,
        "mood_override": payload.mood_override,
        "lighting_override": payload.lighting_override,
        "composition_override": payload.composition_override,
        "camera_style_override": payload.camera_style_override,

        # ── Brand DNA snapshot ──
        "brand_profile": {
            "brand_name": brand.get("brand_name", effective_product or "Brand"),
            "category": brand.get("category", ""),
            "color_primary": _extract_hex(brand.get("color_primary", "#0B3D2E")),
            "color_secondary": _extract_hex(brand.get("color_secondary", "#FDFBF7")),
            "archetype": brand.get("archetype", "expert"),
            "personality": brand_personality,
            "positioning": brand.get("brand_positioning", ""),
            "brand_personality_tags": brand.get("brand_personality", []) or [],
            "brand_donts": brand.get("brand_donts", []) or [],
            "words_always": brand.get("words_always", []) or [],
            "proof_points": brand.get("proof_points", []) or [],
            "signature_phrase": brand.get("signature_phrase", ""),
            "target_audience": brand.get("target_audience", ""),
            "visual_style": brand.get("visual_style", "minimal-clean"),
        },

        # ── Derived visual system ──
        "goal_visual": goal_vis,
        "style_info": VISUAL_STYLE_DIRECTIVES.get(effective_style, VISUAL_STYLE_DIRECTIVES["Minimal Clean"]),
        "cat_visual": cat_visual,
        "audience_mood": AUDIENCE_MOOD.get(effective_audience, ""),
        "tone_typography": TONE_TYPOGRAPHY.get(brand_personality, TONE_TYPOGRAPHY["professional"]),
        "campaign_goal_directive": CAMPAIGN_GOAL_DIRECTIVES.get(effective_goal, CAMPAIGN_GOAL_DIRECTIVES["brand_awareness"]),
    }
    return brief


def _validate_carousel_brief(brief: dict) -> tuple:
    """Apply validation rules, auto-fix conflicts. Returns (fixed_brief, list_of_warnings)."""
    warnings = []
    for condition, auto_fix, msg in _VALIDATION_RULES:
        try:
            if condition(brief):
                brief = auto_fix(brief)
                warnings.append(msg)
        except Exception:
            pass
    return brief, warnings


def _run_ai_visual_director(brief: dict) -> dict:
    """
    Enrich creative brief with AI Visual Director outputs:
    composition, camera, lighting, focal_point, mood, text_placement, cta_emphasis.
    Uses brief data to derive optimal decisions. Advanced mode overrides apply on top.
    """
    vtype = brief["visual_type"]
    vd = _VISUAL_TYPE_DIRECTIVES.get(vtype, _VISUAL_TYPE_DIRECTIVES["mixed"])
    goal_vis = brief["goal_visual"]
    style_info = brief["style_info"]
    cat_vis = brief["cat_visual"]
    mode = brief["ai_director_mode"]

    # Base director decisions from visual type
    composition   = vd["composition"]
    camera        = vd["camera"]
    lighting      = vd["lighting"]
    focal_point   = vd["focal_point"]
    props         = vd["prop_recommendation"]
    mood          = style_info.get("mood", "clean and confident")
    text_placement = "Upper third for headline, lower third for subtext — keep center clear for visual"
    cta_emphasis  = goal_vis["cta_emphasis"]
    emotional_tone = goal_vis["emotional_tone"]

    # Photo style layer
    photo_directive = _PHOTO_STYLE_MAP.get(brief["photo_style"], "")
    if photo_directive:
        lighting = f"{lighting} — {photo_directive}"

    # Visual priority layer
    priority_directive = _VISUAL_PRIORITY_MAP.get(brief["visual_priority"], "")

    # Advanced overrides (only applied in smart/advanced mode if set)
    if mode in ("smart", "advanced"):
        if brief.get("mood_override"):      mood = brief["mood_override"]
        if brief.get("lighting_override"):  lighting = brief["lighting_override"]
        if brief.get("composition_override"): composition = brief["composition_override"]
        if brief.get("camera_style_override"): camera = brief["camera_style_override"]

    # Consistency engine anchors — all slides lock to these values
    consistency_anchor = {
        "lighting_family": lighting,
        "color_primary": brief["brand_profile"]["color_primary"],
        "color_secondary": brief["brand_profile"]["color_secondary"],
        "font_system": "Bold modern sans-serif headline + regular weight body — ONE font family across all slides",
        "brand_frame": "6% header strip + 6% footer strip in brand primary color on EVERY slide",
        "logo_position": "top-left corner on EVERY slide",
        "slide_indicator": "bottom-right on EVERY slide",
        "visual_style": brief["style_preset"],
    }

    # Talent consistency anchor
    if brief["human_enabled"]:
        talent = brief["talent"]
        ethnicity_dir = _TALENT_ETHNICITY_DIRECTIVE.get(talent["ethnicity"], _TALENT_ETHNICITY_DIRECTIVE["auto"])
        age_dir = _TALENT_AGE_DIRECTIVE.get(talent["age_group"], "20-30 years old")
        gender_str = talent["gender"] if talent["gender"] != "auto" else "best fit for brand audience"
        consistency_anchor["talent_lock"] = (
            f"SAME talent across ALL slides: {gender_str} model, {age_dir}, {ethnicity_dir}. "
            f"SAME outfit, SAME wardrobe, SAME hair style throughout the carousel. "
            f"Talent role: {talent['role']}."
        )

    director_output = {
        "composition": composition,
        "camera_angle": camera,
        "lighting": lighting,
        "focal_point": focal_point,
        "visual_hierarchy": f"Priority order: {brief['visual_priority'].replace('_', ' ')}. {priority_directive}",
        "mood": mood,
        "prop_recommendation": props,
        "text_placement": text_placement,
        "cta_emphasis": cta_emphasis,
        "emotional_tone": emotional_tone,
        "photo_style_directive": photo_directive,
        "consistency_anchor": consistency_anchor,
    }

    return {**brief, "director": director_output}


def _build_talent_directive_v2(brief: dict) -> str:
    """Build human talent directive from V2 creative brief."""
    if not brief.get("human_enabled"):
        return ""

    anchor = brief.get("director", {}).get("consistency_anchor", {})
    talent_lock = anchor.get("talent_lock", "")
    if talent_lock:
        return f"INCLUDE A HUMAN MODEL IN THIS IMAGE. {talent_lock} The model must look authentic and relatable — not generic stock photography. Ensure product is always clearly visible."

    # Fallback: auto from brand DNA
    brand = brief["brand_profile"]
    return (
        "INCLUDE A HUMAN MODEL IN THIS IMAGE. "
        f"Brand category '{brand['category']}', target audience '{brand['target_audience']}'. "
        "Choose ideal model: Southeast Asian representation preferred, matching brand demographic. "
        "Authentic, relatable — not generic stock photo. Product must be clearly visible."
    )


_CAROUSEL_TEMPLATES = {
    "problem-solution": ["hook", "problem", "agitation", "solution", "benefit", "social-proof", "cta"],
    "listicle":         ["hook", "intro", "point-1", "point-2", "point-3", "point-4", "cta"],
    "story":            ["hook", "context", "challenge", "turning-point", "result", "lesson", "cta"],
    "testimonial":      ["hook", "credibility", "testimonial-1", "testimonial-2", "social-proof", "offer", "cta"],
}

_ROLE_DIRECTIVES = {
    "hook": (
        "HOOK SLIDE — Must stop the scroll in under 0.5 seconds. "
        "ONE bold statement or question that creates massive curiosity gap. "
        "Typography takes 60-70% of slide — largest text element in entire carousel. "
        "Minimal background: clean brand color block. Brand logo small at corner. "
        "Visual teaser: small product or icon hint only — main story starts next slide."
    ),
    "problem": (
        "PROBLEM SLIDE — Make viewer feel understood and seen. "
        "Visualize or describe the frustration/pain point clearly. "
        "Relatable scene or bold empathetic statement. "
        "Color: darker/more intense tone from brand palette to match emotional weight. "
        "Text: describe the problem in 2-3 short punchy sentences."
    ),
    "agitation": (
        "AGITATION SLIDE — Amplify the problem, make it feel urgent. "
        "Show consequences of NOT solving it. Use contrast or before/after imagery hint. "
        "Text-heavy, impactful short sentences. Brand accent color for emphasis words."
    ),
    "intro": (
        "INTRO SLIDE — Brand introduction and context setting. "
        "Clean brand-forward design. Brand name/logo prominent but not overwhelming. "
        "1-2 sentence brand promise or carousel purpose. Inviting, credible tone."
    ),
    "context": (
        "CONTEXT SLIDE — Establish the background story. "
        "Lifestyle or environment scene with product subtly present. "
        "Narrative text describing the starting situation. Warm storytelling tone."
    ),
    "challenge": (
        "CHALLENGE SLIDE — The obstacle or struggle in the story. "
        "Dramatic but empathetic composition. Darker brand tones. "
        "Text: short, powerful, relatable description of the challenge."
    ),
    "turning-point": (
        "TURNING POINT SLIDE — The moment of change/realization. "
        "Visual shift — lighter, more hopeful color tone. "
        "Product begins to enter the scene as the catalyst. "
        "Text: pivotal decision or discovery moment."
    ),
    "solution": (
        "SOLUTION SLIDE — Product as the clear HERO. "
        "Product photography dominant (50-60% of slide). "
        "Clean, confident composition. Brand primary color as background. "
        "Text: product name + one-line solution statement."
    ),
    "benefit": (
        "BENEFIT SLIDE — Showcase ONE specific key benefit. "
        "Feature callout cards or icon badges floating around product. "
        "Specific, concrete, measurable benefit stated clearly. "
        "Layout: split — visual left, benefit text right OR centered with callouts."
    ),
    "result": (
        "RESULT SLIDE — Show the aspirational end outcome. "
        "Uplifting, positive, bright composition. Real lifestyle result or data visualization. "
        "Text: specific result number/outcome."
    ),
    "lesson": (
        "LESSON SLIDE — Key takeaway distilled into one quotable insight. "
        "Bold single-insight layout. Brand primary color block. "
        "Design it to be screenshot-worthy and shareable."
    ),
    "point-1": (
        "POINT 1 SLIDE — First key point. Number '01' large, brand accent color. "
        "Concise point title bold, 3-5 word explanation below. "
        "Icon or small visual element supporting the point."
    ),
    "point-2": (
        "POINT 2 SLIDE — Second key point. Number '02' prominent. "
        "Same grid layout as point-1 for visual rhythm. New icon different from point-1."
    ),
    "point-3": (
        "POINT 3 SLIDE — Third key point. Number '03' prominent. "
        "Same grid layout — consistent visual rhythm. Progress momentum visible."
    ),
    "point-4": (
        "POINT 4 SLIDE — Fourth key point. Number '04' prominent. "
        "Building to the CTA — this slide should hint at the conclusion coming."
    ),
    "summary": (
        "SUMMARY SLIDE — Recap all points in compact format. "
        "Small 2x2 or numbered list grid. Icons for each point. "
        "Text: 'Jadi intinya:' then compact list."
    ),
    "social-proof": (
        "SOCIAL PROOF SLIDE — Numbers, awards, results that build trust. "
        "Data visualization: large number (e.g., '10.000+ pembeli puas'), star ratings, media logos. "
        "Clean, credibility-focused layout."
    ),
    "credibility": (
        "CREDIBILITY SLIDE — Establish trust. Years in business, certifications, media features, "
        "expert endorsements. Professional, authoritative visual design."
    ),
    "testimonial-1": (
        "TESTIMONIAL 1 SLIDE — Real customer quote. Large quotation mark (brand accent color). "
        "Quote in italics. Customer avatar placeholder. Star rating 5★ in gold. Customer name below."
    ),
    "testimonial-2": (
        "TESTIMONIAL 2 SLIDE — Second customer quote. Different layout from testimonial-1 for variety. "
        "Same trust elements: stars, name, quote. Brand secondary background."
    ),
    "offer": (
        "SPECIAL OFFER SLIDE — Bold price or offer displayed prominently. "
        "Urgency elements: 'Hanya hari ini', 'Stok terbatas'. Product image. Value stack display."
    ),
    "cta": (
        "FINAL CTA SLIDE — Strongest possible closing. One clear action. "
        "CTA text dominant on slide. Brand logo and Instagram handle visible. "
        "Product image supporting — not competing. Clean, bold, zero clutter."
    ),
}


def _build_carousel_prompts(payload: CarouselPromptIn, brand: Optional[dict]) -> dict:
    """V2 pipeline: CreativeBriefBuilder → ValidationLayer → AIVisualDirector → SlideBuilder."""
    brand = brand or {}

    # ── Step 1: Build Creative Brief ──────────────────────────────────────────
    brief = _build_carousel_creative_brief(payload, brand)

    # ── Step 2: Creative Validation Layer ─────────────────────────────────────
    brief, validation_warnings = _validate_carousel_brief(brief)

    # ── Step 3: AI Visual Director ────────────────────────────────────────────
    brief = _run_ai_visual_director(brief)

    # ── Derived values ────────────────────────────────────────────────────────
    bp = brief["brand_profile"]
    brand_name      = bp["brand_name"]
    color_primary   = bp["color_primary"]
    color_secondary = bp["color_secondary"]
    brand_personality = bp["personality"]
    director        = brief["director"]
    anchor          = director["consistency_anchor"]
    goal_directive  = brief["campaign_goal_directive"]
    cat_visual      = brief["cat_visual"]
    style_info      = brief["style_info"]
    tone_typo       = brief["tone_typography"]

    roles = _CAROUSEL_TEMPLATES.get(brief["storytelling"], _CAROUSEL_TEMPLATES["problem-solution"])[: brief["slide_count"]]
    bg_alternator = [color_primary, color_secondary]

    brand_frame = {
        "corner_logo_position": anchor["logo_position"],
        "slide_indicator_position": anchor["slide_indicator"],
        "header_strip": f"6% height strip at top in {color_primary}",
        "footer_strip": f"6% height strip at bottom in {color_primary} — slide number + @{brand_name.lower().replace(' ', '')}",
        "font_consistency": anchor["font_system"],
    }

    slides = []
    for idx, role in enumerate(roles, start=1):
        is_hook = role == "hook"
        is_cta  = role in ("cta", "final-cta")
        alt_bg  = bg_alternator[idx % 2]

        slide_prompt = {
            "task_type": "instagram_carousel_slide_generation",
            "slide_index": idx,
            "slide_role": role,
            "slide_total": len(roles),
            "system_directive": (
                "You are an elite Instagram Carousel Art Director at a top-tier social media creative agency. "
                f"Create slide {idx} of {len(roles)} for brand '{brand_name}'. "
                "This slide MUST be visually consistent with all other slides in the carousel — "
                "same brand frame, same font system, same color rules, same talent identity, same product appearance. "
                "The carousel must feel like ONE coherent campaign, not a collection of random images. "
                + (f"Brand positioning: {bp['positioning']}. " if bp.get('positioning') else "")
                + (f"Brand personality: {', '.join(bp['brand_personality_tags'])}. " if bp.get('brand_personality_tags') else "")
                + (f"STRICT VISUAL RESTRICTIONS — do NOT include: {', '.join(bp['brand_donts'])}. " if bp.get('brand_donts') else "")
                + f"Brand tone of voice: {brand_personality}. "
                + f"Brand archetype: {bp['archetype']}. "
                + (f"Target audience: {brief['audience']}. " if brief.get('audience') else "")
                + (f"Brand keywords: {', '.join(bp['words_always'])}. " if bp.get('words_always') else "")
                + (f"Brand proof points: {'; '.join(bp['proof_points'])}. " if bp.get('proof_points') else "")
                + (f"Signature phrase: '{bp['signature_phrase']}'. " if bp.get('signature_phrase') else "")
                + (f"Product reference: {brief['product']}. " if brief.get('product') else "")
            ),
            "model_parameters": {
                "aspect_ratio": brief["aspect_ratio"],
                "style_preset": brief["style_preset"],
                "quality": "high",
                "photorealism": "ultra-realistic 8K, premium Instagram commercial photography",
            },
            "prompt_structure": {
                "subject": f"Slide {idx:02d}/{len(roles):02d} — {role.upper()} — '{brief['topic']}' by {brand_name}",
                "slide_directive": _ROLE_DIRECTIVES.get(role, f"Brand-consistent content slide #{idx}."),
                "narrative_context": {
                    "topic": brief["topic"],
                    "target_audience": brief["audience"],
                    "content_goal": brief["content_goal"],
                    "template_type": brief["storytelling"],
                    "slide_narrative_position": (
                        "OPENING — maximum hook energy" if is_hook else
                        "CLOSING — maximum conversion intent" if is_cta else
                        f"MIDDLE (slide {idx}/{len(roles)}) — educational flow"
                    ),
                },
                "branding_elements": {
                    "brand_name": brand_name,
                    "call_to_action_final": brief["cta"] if is_cta else "",
                    "show_brand_handle": is_cta or is_hook,
                    "instagram_handle_hint": f"@{brand_name.lower().replace(' ', '')}",
                },
                "brand_frame_elements": brand_frame,
                "typography_zone_rules": {
                    "header_height": "6%",
                    "footer_height": "6%",
                    "content_zone": "88%",
                    "slide_indicator": f"{idx:02d}/{len(roles):02d}",
                    "text_placement": director["text_placement"],
                    "minimum_font_size": "1/10 of canvas height (mobile readability)",
                },
                "color_palette": {
                    "background_dominant": color_primary,
                    "accent_elements": color_secondary,
                    "slide_background": color_primary if is_hook or is_cta else alt_bg,
                    "alternation_rule": f"Alternate {color_primary}/{color_secondary} per slide. {color_primary} always dominant.",
                },
                "ai_visual_director": {
                    "visual_type": brief["visual_type"],
                    "visual_type_directive": _VISUAL_TYPE_DIRECTIVES.get(brief["visual_type"], {}).get("composition", ""),
                    "visual_priority": director["visual_hierarchy"],
                    "composition": director["composition"],
                    "camera_angle": director["camera_angle"],
                    "lighting": director["lighting"],
                    "focal_point": director["focal_point"],
                    "mood": director["mood"],
                    "emotional_tone": director["emotional_tone"],
                    "prop_recommendation": director["prop_recommendation"],
                    "photo_style_directive": director["photo_style_directive"],
                    "cta_emphasis": director["cta_emphasis"] if is_cta else "",
                    "director_mode": brief["ai_director_mode"],
                },
                "consistency_engine": {
                    "lighting_family": anchor["lighting_family"],
                    "color_lock": f"STRICT palette: ONLY {color_primary} and {color_secondary}. Never deviate.",
                    "brand_frame_lock": anchor["brand_frame"],
                    "font_lock": anchor["font_system"],
                    "talent_lock": anchor.get("talent_lock", ""),
                    "rules": [
                        f"IDENTICAL brand frame on EVERY slide — {anchor['brand_frame']}",
                        f"IDENTICAL lighting family — {anchor['lighting_family']}",
                        "IDENTICAL font system throughout",
                        "IDENTICAL talent: same person, same outfit, same wardrobe across all slides",
                        "IDENTICAL product: same product, same packaging, same placement logic",
                        f"IDENTICAL color palette: {color_primary} dominant, {color_secondary} accent",
                    ],
                },
                "visual_style_details": {
                    "style_name": brief["style_preset"],
                    "photography": style_info.get("photography", ""),
                    "typography": style_info.get("typography", ""),
                    "mood": style_info.get("mood", ""),
                    "colour_use": style_info.get("colour_use", ""),
                    "typography_system": tone_typo,
                    "color_temperature": cat_visual.get("color_temp", "5500K neutral"),
                    "category_environment": cat_visual.get("environment", ""),
                },
                "content_goal_directive": {
                    "goal": brief["content_goal"],
                    "name": goal_directive.get("name", ""),
                    "visual_directive": goal_directive.get("visual_directive", ""),
                    "emotional_trigger": goal_directive.get("emotional_trigger", ""),
                    "cta_emphasis": director["cta_emphasis"],
                },
                "brand_dna_directives": {
                    "category_props": cat_visual.get("props", ""),
                    "emotional_target": cat_visual.get("emotion", "quality, trust"),
                    "audience_mood": brief["audience_mood"],
                    "tone": brand_personality,
                    "brand_snapshot": {
                        "archetype": bp["archetype"],
                        "visual_style": bp["visual_style"],
                        "signature_phrase": bp["signature_phrase"],
                    },
                },
                "negative_prompt": (
                    "inconsistent talent appearance between slides, different outfit per slide, "
                    "inconsistent brand colors, broken typography, cluttered layout, "
                    "mismatched font styles, generic stock photo look, "
                    "missing slide number, random decorative elements, "
                    "blurry text, misspelled words, watermarks, low resolution, "
                    "distorted anatomy, unnatural poses"
                ),
                "human_model_directive": _build_talent_directive_v2(brief) or None,
            },
        }
        slides.append(slide_prompt)

    return {
        "carousel_meta": {
            "brand_name": brand_name,
            "topic": brief["topic"],
            "template": brief["storytelling"],
            "total_slides": len(roles),
            "aspect_ratio": brief["aspect_ratio"],
            "style_preset": brief["style_preset"],
            "content_goal": brief["content_goal"],
            "visual_type": brief["visual_type"],
            "ai_director_mode": brief["ai_director_mode"],
            "brand_personality": brand_personality,
            "target_audience": brief["audience"],
            "validation_warnings": validation_warnings,
        },
        "slides": slides,
    }


@api_router.post("/prompt/preview-banner")
async def preview_banner_prompt(payload: BannerPromptIn, current_user: dict = Depends(get_current_user)):
    """Return the structured prompt JSON + natural language prompt without generating an image. No credits consumed."""
    brand = await db.brand_profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    prompt_json = _build_banner_prompt(payload, brand)
    natural_prompt = _build_natural_prompt(prompt_json)
    natural_prompt = _append_reference_hint(natural_prompt, bool(payload.reference_image_base64))
    return {
        "prompt_json": prompt_json,
        "natural_prompt": natural_prompt,
        "has_reference_image": bool(payload.reference_image_base64),
    }


@api_router.post("/prompt/generate-banner")
async def generate_banner(payload: BannerPromptIn, current_user: dict = Depends(get_current_user)):
    # Content moderation — before consuming any credit
    _raise_if_banned(payload.headline, payload.subheadline, payload.description, payload.product_name, payload.call_to_action)

    # Consume credit first (refund on failure)
    if not await _consume_credit(current_user["id"], 1, current_user.get("role", "user")):
        raise HTTPException(status_code=402, detail="Kredit tidak cukup. Beli kredit di halaman pricing.")

    brand = await db.brand_profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    prompt_obj = _build_banner_prompt(payload, brand)

    # Generate real image
    try:
        natural_prompt = _build_natural_prompt(prompt_obj)
        natural_prompt = _append_reference_hint(natural_prompt, bool(payload.reference_image_base64))
        image_b64 = await _call_openai_image(natural_prompt, payload.aspect_ratio)
    except HTTPException:
        # Refund
        await _refund_credit(current_user["id"], 1, "Refund banner gagal generate")
        raise

    saved_id = str(uuid.uuid4())
    doc = {
        "id": saved_id,
        "user_id": current_user["id"],
        "dashboard_type": "banner",
        "campaign_goal": payload.campaign_goal,
        "title": payload.headline or "Untitled Banner",
        "input_payload": payload.model_dump(),
        "prompt_json": prompt_obj,
        "image_base64": image_b64,
        "aspect_ratio": payload.aspect_ratio,
        "created_at": now_iso(),
    }
    await db.generated_prompts.insert_one(doc)

    # Auto consistency check (background, best-effort, don't block)
    asyncio.create_task(_auto_consistency_check(current_user["id"], saved_id, image_b64, "banner"))

    credits_doc = await db.user_credits.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return {
        "id": saved_id,
        "image_base64": image_b64,
        "aspect_ratio": payload.aspect_ratio,
        "prompt_json": prompt_obj,
        "credits": _credits_summary(credits_doc),
    }


@api_router.post("/prompt/preview-carousel")
async def preview_carousel_prompt(payload: CarouselPromptIn, current_user: dict = Depends(get_current_user)):
    """Return structured prompt JSON for all slides without generating images. No credits consumed."""
    brand = await db.brand_profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    prompt_obj = _build_carousel_prompts(payload, brand)
    # Inject natural_prompt into each slide so frontend can copy directly
    for slide in prompt_obj.get("slides", []):
        slide["natural_prompt"] = _build_natural_prompt(slide)
    return {"prompt_json": prompt_obj}


@api_router.post("/prompt/generate-carousel")
async def generate_carousel(payload: CarouselPromptIn, current_user: dict = Depends(get_current_user)):
    if payload.slide_count < 3 or payload.slide_count > 7:
        raise HTTPException(status_code=400, detail="Jumlah slide harus 3-7")

    # Content moderation — before consuming any credit
    _raise_if_banned(payload.topic, payload.product_name, payload.call_to_action, payload.target_audience)

    n_slides = payload.slide_count
    # Need n credits
    if not await _consume_credit(current_user["id"], n_slides, current_user.get("role", "user")):
        raise HTTPException(status_code=402, detail=f"Butuh {n_slides} kredit, tidak cukup. Upgrade paket atau top-up.")

    brand = await db.brand_profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    prompt_obj = _build_carousel_prompts(payload, brand)

    # Generate image per slide
    images = []
    try:
        for slide in prompt_obj["slides"]:
            natural = _build_natural_prompt(slide)
            natural = _append_reference_hint(natural, bool(payload.reference_image_base64))
            img = await _call_openai_image(natural, payload.aspect_ratio)
            images.append(img)
    except HTTPException:
        # Refund unused credits
        refund = n_slides - len(images)
        if refund > 0:
            await _refund_credit(current_user["id"], refund, f"Refund carousel {refund} slide gagal")
        if not images:
            raise

    saved_id = str(uuid.uuid4())
    doc = {
        "id": saved_id,
        "user_id": current_user["id"],
        "dashboard_type": "carousel",
        "campaign_goal": payload.campaign_goal,
        "title": payload.topic or "Untitled Carousel",
        "input_payload": payload.model_dump(),
        "prompt_json": prompt_obj,
        "slide_images": images,  # list of base64
        "aspect_ratio": payload.aspect_ratio,
        "created_at": now_iso(),
    }
    await db.generated_prompts.insert_one(doc)

    # Auto consistency check on first slide
    if images:
        asyncio.create_task(_auto_consistency_check(current_user["id"], saved_id, images[0], "carousel"))

    credits_doc = await db.user_credits.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return {
        "id": saved_id,
        "slide_images": images,
        "aspect_ratio": payload.aspect_ratio,
        "prompt_json": prompt_obj,
        "credits": _credits_summary(credits_doc),
    }


@api_router.post("/prompt/generate-carousel-stream")
async def generate_carousel_stream(payload: CarouselPromptIn, current_user: dict = Depends(get_current_user)):
    """
    Progressive carousel generation via Server-Sent Events.
    Streams one event per slide as it completes, rather than waiting for all slides.
    Frontend reads the streaming response with fetch() + ReadableStream.
    """
    import json as _json

    if payload.slide_count < 3 or payload.slide_count > 7:
        raise HTTPException(status_code=400, detail="Jumlah slide harus 3-7")

    _raise_if_banned(payload.topic, payload.product_name, payload.call_to_action, payload.target_audience)

    n_slides = payload.slide_count
    if not await _consume_credit(current_user["id"], n_slides, current_user.get("role", "user")):
        raise HTTPException(status_code=402, detail=f"Butuh {n_slides} kredit, tidak cukup.")

    brand = await db.brand_profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})

    # Build prompt object upfront (pipeline runs synchronously before streaming)
    prompt_obj = _build_carousel_prompts(payload, brand)
    carousel_id = str(uuid.uuid4())
    roles = [s["slide_role"] for s in prompt_obj["slides"]]

    # Create DB document placeholder immediately so we can update it per slide
    doc = {
        "id": carousel_id,
        "user_id": current_user["id"],
        "dashboard_type": "carousel",
        "campaign_goal": payload.campaign_goal,
        "title": payload.topic or "Untitled Carousel",
        "input_payload": payload.model_dump(),
        "prompt_json": prompt_obj,
        "slide_images": [""] * len(roles),
        "slide_statuses": ["waiting"] * len(roles),
        "aspect_ratio": payload.aspect_ratio,
        "created_at": now_iso(),
    }
    await db.generated_prompts.insert_one(doc)

    async def _sse_stream():
        def evt(data: dict) -> str:
            return f"data: {_json.dumps(data)}\n\n"

        # ── Phase 1: Brief ready ───────────────────────────────────────────
        yield evt({"type": "brief_ready", "carousel_id": carousel_id, "total_slides": len(roles)})
        yield evt({"type": "planning", "roles": roles,
                   "meta": prompt_obj.get("carousel_meta", {})})

        slide_images = [""] * len(roles)
        credits_refunded = 0

        for idx, slide in enumerate(prompt_obj["slides"]):
            role = slide["slide_role"]

            # ── Phase 2: Slide start ───────────────────────────────────────
            yield evt({"type": "slide_start", "index": idx, "role": role, "total": len(roles)})
            await db.generated_prompts.update_one(
                {"id": carousel_id},
                {"$set": {f"slide_statuses.{idx}": "generating"}}
            )

            # Build prompt for this slide
            natural = _build_natural_prompt(slide)
            natural = _append_reference_hint(natural, bool(payload.reference_image_base64))

            # ── Phase 3: Generate with retry ──────────────────────────────
            img = None
            last_error = ""
            for attempt in range(3):  # initial + 2 retries
                try:
                    if attempt > 0:
                        yield evt({"type": "slide_retry", "index": idx, "attempt": attempt})
                    img = await _call_openai_image(natural, payload.aspect_ratio)
                    break
                except Exception as e:
                    last_error = str(e)[:200]
                    if attempt < 2:
                        await asyncio.sleep(2)

            if img:
                # ── Success ───────────────────────────────────────────────
                slide_images[idx] = img
                await db.generated_prompts.update_one(
                    {"id": carousel_id},
                    {"$set": {
                        f"slide_images.{idx}": img,
                        f"slide_statuses.{idx}": "completed",
                    }}
                )
                yield evt({"type": "slide_complete", "index": idx, "role": role,
                           "image_base64": img})
            else:
                # ── Failed after retries → refund 1 credit ─────────────────
                await _refund_credit(current_user["id"], 1, f"Refund slide {idx+1} gagal generate")
                credits_refunded += 1
                await db.generated_prompts.update_one(
                    {"id": carousel_id},
                    {"$set": {f"slide_statuses.{idx}": "failed"}}
                )
                yield evt({"type": "slide_failed", "index": idx, "role": role,
                           "error": last_error, "refunded": True})

        # ── Phase 4: Done ──────────────────────────────────────────────────
        success_count = sum(1 for img in slide_images if img)
        failed_count = len(roles) - success_count

        # Auto consistency check on first successful slide
        first_img = next((img for img in slide_images if img), None)
        if first_img:
            asyncio.create_task(_auto_consistency_check(
                current_user["id"], carousel_id, first_img, "carousel"
            ))

        credits_doc = await db.user_credits.find_one({"user_id": current_user["id"]}, {"_id": 0})
        validation_warnings = prompt_obj.get("carousel_meta", {}).get("validation_warnings", [])
        yield evt({
            "type": "carousel_complete",
            "carousel_id": carousel_id,
            "total": len(roles),
            "success": success_count,
            "failed": failed_count,
            "credits_refunded": credits_refunded,
            "credits": _credits_summary(credits_doc),
            "validation_warnings": validation_warnings,
        })

    return StreamingResponse(
        _sse_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@api_router.post("/prompt/regenerate-slide")
async def regenerate_slide(payload: RegenerateIn, current_user: dict = Depends(get_current_user)):
    """Regenerate single carousel slide."""
    if payload.slide_index is None:
        raise HTTPException(status_code=400, detail="slide_index required")
    existing = await db.generated_prompts.find_one({"id": payload.prompt_id, "user_id": current_user["id"]})
    if not existing or existing.get("dashboard_type") != "carousel":
        raise HTTPException(status_code=404, detail="Carousel not found")
    if payload.slide_index < 0 or payload.slide_index >= len(existing["prompt_json"]["slides"]):
        raise HTTPException(status_code=400, detail="Invalid slide_index")

    if not await _consume_credit(current_user["id"], 1, current_user.get("role", "user")):
        raise HTTPException(status_code=402, detail="Kredit tidak cukup. Beli kredit di halaman pricing.")

    try:
        slide_prompt = existing["prompt_json"]["slides"][payload.slide_index]
        natural = _build_natural_prompt(slide_prompt)
        new_img = await _call_openai_image(natural, existing.get("aspect_ratio", "1:1 (Square Feed)"))
    except HTTPException:
        await _refund_credit(current_user["id"], 1, "Refund regenerate slide gagal")
        raise

    slide_images = existing.get("slide_images", [])
    if payload.slide_index < len(slide_images):
        slide_images[payload.slide_index] = new_img
    else:
        while len(slide_images) <= payload.slide_index:
            slide_images.append("")
        slide_images[payload.slide_index] = new_img

    await db.generated_prompts.update_one(
        {"id": payload.prompt_id, "user_id": current_user["id"]},
        {"$set": {"slide_images": slide_images}},
    )
    credits_doc = await db.user_credits.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return {
        "id": payload.prompt_id,
        "slide_index": payload.slide_index,
        "image_base64": new_img,
        "credits": _credits_summary(credits_doc),
    }


@api_router.post("/prompt/regenerate")
async def regenerate(payload: RegenerateIn, current_user: dict = Depends(get_current_user)):
    """Regenerate banner/food-menu using same prompt_json."""
    existing = await db.generated_prompts.find_one({"id": payload.prompt_id, "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    if existing.get("dashboard_type") == "carousel":
        raise HTTPException(status_code=400, detail="Use /prompt/regenerate-slide for carousel")

    if not await _consume_credit(current_user["id"], 1, current_user.get("role", "user")):
        raise HTTPException(status_code=402, detail="Kredit tidak cukup. Beli kredit di halaman pricing.")

    try:
        natural = _build_natural_prompt(existing["prompt_json"])
        img = await _call_openai_image(natural, existing.get("aspect_ratio", "1:1 (Square Feed)"))
    except HTTPException:
        await _refund_credit(current_user["id"], 1, "Refund regenerate food gagal")
        raise

    await db.generated_prompts.update_one(
        {"id": payload.prompt_id, "user_id": current_user["id"]},
        {"$set": {"image_base64": img, "regenerated_at": now_iso()}},
    )
    asyncio.create_task(_auto_consistency_check(current_user["id"], payload.prompt_id, img, existing.get("dashboard_type", "banner")))
    credits_doc = await db.user_credits.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return {"id": payload.prompt_id, "image_base64": img, "credits": _credits_summary(credits_doc)}


@api_router.post("/prompt/generate-copywriting")
async def generate_copywriting(payload: CopywritingIn, current_user: dict = Depends(get_current_user)):
    # Content moderation
    _raise_if_banned(payload.product_name, payload.product_description, payload.target_audience, payload.main_problem)

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        logger.error(f"emergentintegrations import failed: {e}")
        raise HTTPException(status_code=500, detail="AI service unavailable")

    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")

    brand = await db.brand_profiles.find_one({"user_id": current_user["id"]}, {"_id": 0}) or {}
    brand_name = brand.get("brand_name", "brand Anda")
    auto_tone = PURPOSE_TONE.get(payload.content_purpose, "friendly")
    archetype = brand.get("archetype", "expert")
    words_always = ", ".join(brand.get("words_always", []) or []) or "(tidak ada)"
    words_avoid = ", ".join(brand.get("words_avoid", []) or []) or "(tidak ada)"
    signature_phrase = brand.get("signature_phrase", "")
    proof_points = ", ".join(brand.get("proof_points", []) or []) or "(tidak ada)"

    purpose_map = {
        "awareness": "Awareness/Perkenalan — fokus membangun awareness, ringan, intriguing",
        "soft_selling": "Soft Selling — menyajikan value tanpa hard CTA",
        "hard_selling": "Hard Selling/Promo — direct, urgent CTA",
        "education": "Edukasi — informatif, mengajarkan",
        "engagement": "Engagement — mengundang interaksi, pertanyaan, polling",
    }
    purpose_label = purpose_map.get(payload.content_purpose, purpose_map["soft_selling"])

    system = (
        "Anda adalah copywriter senior spesialis konten Instagram/sosial media untuk UMKM Indonesia. "
        "Anda menulis dalam Bahasa Indonesia yang natural, persuasif, dan sesuai brand. "
        "Output HARUS dalam format JSON valid tanpa markdown fence."
    )

    user_prompt = f"""Buat copywriting konten {payload.platform} untuk brand "{brand_name}".

Detail produk:
- Nama produk: {payload.product_name}
- Deskripsi: {payload.product_description}
- Target audiens: {payload.target_audience}
- Masalah utama yang diselesaikan: {payload.main_problem or '(tidak disebutkan)'}
- Tone of voice: {auto_tone} (dari tujuan konten: {purpose_label})
- Brand archetype: {archetype}
- Tujuan konten: {purpose_label}

Brand-specific guardrails:
- Kata-kata yang SELALU dipakai brand: {words_always}
- Kata-kata yang DIHINDARI brand: {words_avoid}
- Signature phrase: {signature_phrase or '(tidak ada)'}
- Proof points / bukti konkret: {proof_points}

WAJIB: gunakan minimal 1 proof point di salah satu caption. Hindari kata yang masuk daftar 'dihindari'.

Kembalikan HANYA JSON valid (tanpa fence) dengan struktur:
{{
  "headlines": ["...", "...", "..."],
  "captions": [
    {{"style": "Storytelling", "text": "..."}},
    {{"style": "Punchy & Singkat", "text": "..."}},
    {{"style": "Edukasi", "text": "..."}}
  ],
  "cta_options": ["...", "...", "..."],
  "hashtags": ["#...", "..."],
  "hook_lines": ["...", "...", "..."]
}}"""

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"copy-{current_user['id']}-{uuid.uuid4()}",
        system_message=system,
    ).with_model("gemini", "gemini-3-flash-preview")

    try:
        response = await chat.send_message(UserMessage(text=user_prompt))
    except Exception as e:
        logger.error(f"Gemini copy call failed: {e}")
        raise HTTPException(status_code=500, detail=_ai_error_detail(e, "Gagal generate copywriting. Coba lagi."))

    raw = response.strip() if isinstance(response, str) else str(response)
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1]) if lines[-1].startswith("```") else "\n".join(lines[1:])
        raw = raw.strip()
    if raw.startswith("json"):
        raw = raw[4:].strip()

    try:
        parsed = json.loads(raw)
    except Exception:
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            try:
                parsed = json.loads(raw[start:end + 1])
            except Exception:
                parsed = {"_raw": raw[:1500], "error": "Failed to parse JSON"}
        else:
            parsed = {"_raw": raw[:1500], "error": "No JSON found"}

    saved_id = None
    if payload.save and "error" not in parsed:
        saved_id = str(uuid.uuid4())
        doc = {
            "id": saved_id,
            "user_id": current_user["id"],
            "dashboard_type": "copywriting",
            "title": payload.product_name or "Untitled Copy",
            "input_payload": payload.model_dump(),
            "prompt_json": parsed,
            "created_at": now_iso(),
        }
        await db.generated_prompts.insert_one(doc)

    return {"id": saved_id, "result": parsed}


# ============= CAPTION BUNDLE =============
@api_router.post("/prompt/generate-caption-bundle")
async def generate_caption_bundle(payload: CaptionBundleIn, current_user: dict = Depends(get_current_user)):
    """Generate 4 caption variants + hooks + hashtags via Gemini. No credits consumed."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        raise HTTPException(status_code=500, detail="AI service unavailable")

    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")

    brand = await _get_active_brand(current_user["id"]) or {}
    brand_name = brand.get("brand_name", "brand Anda")
    auto_tone = PURPOSE_TONE.get(payload.content_purpose, "friendly")
    words_always = ", ".join(brand.get("words_always", []) or []) or "-"
    words_avoid = ", ".join(brand.get("words_avoid", []) or []) or "-"

    purpose_map = {
        "awareness": "Awareness/Perkenalan",
        "soft_selling": "Soft Selling",
        "hard_selling": "Hard Selling/Promo",
        "education": "Edukasi",
        "engagement": "Engagement",
    }
    purpose_label = purpose_map.get(payload.content_purpose, "Soft Selling")

    system = (
        "Anda adalah copywriter senior UMKM Indonesia spesialis Instagram. "
        "Tulis caption natural, persuasif, dan sesuai karakter brand. "
        "Output HANYA JSON valid tanpa markdown fence."
    )

    user_prompt = f"""Buat caption bundle Instagram untuk brand "{brand_name}".

Konteks konten:
- Headline: {payload.headline or payload.product_name or 'konten brand'}
- Produk: {payload.product_name or '-'}
- Deskripsi: {payload.product_description or '-'}
- Target audiens: {payload.target_audience or '-'}
- Tone of voice: {auto_tone} (dari tujuan: {purpose_label})
- Kata selalu dipakai: {words_always}
- Kata dihindari: {words_avoid}

Kembalikan HANYA JSON valid (tanpa fence):
{{
  "captions": [
    {{"style": "Storytelling", "label": "Panjang · Engagement", "text": "caption 150-200 karakter, emotional, bercerita..."}},
    {{"style": "Minimalis Aesthetic", "label": "Pendek · Clean", "text": "caption 40-60 karakter, estetik, impactful..."}},
    {{"style": "Soft Selling", "label": "Value-based", "text": "caption 100-130 karakter, highlight value tanpa hard sell..."}},
    {{"style": "Hard Selling", "label": "Promo · CTA Langsung", "text": "caption 80-100 karakter, urgency, direct CTA..."}}
  ],
  "hook_lines": ["hook pendek 1 (max 60 karakter)", "hook 2", "hook 3"],
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7", "#tag8", "#tag9", "#tag10"]
}}"""

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"caption-{current_user['id']}-{uuid.uuid4()}",
        system_message=system,
    ).with_model("gemini", "gemini-3-flash-preview")

    try:
        response = await chat.send_message(UserMessage(text=user_prompt))
    except Exception as e:
        logger.error(f"Caption bundle call failed: {e}")
        raise HTTPException(status_code=500, detail=_ai_error_detail(e, "Gagal generate caption. Coba lagi."))

    raw = response.strip() if isinstance(response, str) else str(response)
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1]) if lines[-1].startswith("```") else "\n".join(lines[1:])
        raw = raw.strip()
    if raw.startswith("json"):
        raw = raw[4:].strip()

    try:
        parsed = json.loads(raw)
    except Exception:
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            try:
                parsed = json.loads(raw[start:end + 1])
            except Exception:
                parsed = {"error": "parse_failed"}
        else:
            parsed = {"error": "no_json"}

    return parsed


# ============= PROMPT HISTORY =============
@api_router.get("/prompts")
async def list_prompts(current_user: dict = Depends(get_current_user), dashboard_type: Optional[str] = None):
    query = {"user_id": current_user["id"]}
    if dashboard_type:
        query["dashboard_type"] = dashboard_type
    items = await db.generated_prompts.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


@api_router.get("/prompts/{prompt_id}")
async def get_prompt(prompt_id: str, current_user: dict = Depends(get_current_user)):
    item = await db.generated_prompts.find_one({"id": prompt_id, "user_id": current_user["id"]}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    return item


@api_router.delete("/prompts/{prompt_id}")
async def delete_prompt(prompt_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.generated_prompts.delete_one({"id": prompt_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": True}


# ============= CONTENT RECOMMENDATION =============
@api_router.get("/content-recommendation")
async def content_recommendation(current_user: dict = Depends(get_current_user)):
    """Recommend next campaign_goal based on feed rotation history. Works for new users too."""
    user_id = current_user["id"]

    # Check if user has ANY content at all
    total_content = await db.generated_prompts.count_documents({"user_id": user_id})

    # For brand-new users with zero content — give a welcoming starter recommendation
    if total_content == 0:
        goal_info = CAMPAIGN_GOAL_DIRECTIVES["launch"]
        return {
            "recommended_goal": "launch",
            "recommended_name": goal_info["name"],
            "reason": "Belum ada konten — mulai dengan memperkenalkan brand kamu ke audiens. Konten launch adalah langkah pertama yang paling powerful.",
            "tip": goal_info["copy_hook"],
            "recent_distribution": {},
            "is_new_user": True,
        }

    recent = await db.generated_prompts.find(
        {"user_id": user_id, "campaign_goal": {"$exists": True}},
        {"campaign_goal": 1, "dashboard_type": 1}
    ).sort("created_at", -1).limit(10).to_list(10)

    goal_order = ["launch", "promo", "testimonial", "edukasi", "best_seller", "brand_awareness", "restock"]
    goal_counts = {g: 0 for g in goal_order}
    for doc in recent:
        g = doc.get("campaign_goal", "")
        if g in goal_counts:
            goal_counts[g] += 1

    # Find goals not used recently (count == 0), prefer by strategic rotation order
    unused = [g for g in goal_order if goal_counts[g] == 0]
    least_used = sorted(goal_order, key=lambda g: goal_counts[g])

    recommended = unused[0] if unused else least_used[0]
    goal_info = CAMPAIGN_GOAL_DIRECTIVES[recommended]

    # Build a human-readable reason
    top_used = sorted(goal_counts.items(), key=lambda x: -x[1])
    top_name = CAMPAIGN_GOAL_DIRECTIVES[top_used[0][0]]["name"] if top_used[0][1] > 0 else None

    reason = (
        f"Feed kamu belum ada konten tipe '{goal_info['name']}' — "
        f"variasikan agar audiens makin percaya." if goal_counts[recommended] == 0
        else f"Konten '{top_name}' sudah dominan — seimbangkan feed dengan '{goal_info['name']}'."
    )

    return {
        "recommended_goal": recommended,
        "recommended_name": goal_info["name"],
        "reason": reason,
        "recent_distribution": goal_counts,
        "tip": goal_info["copy_hook"],
        "is_new_user": False,
    }


# ============= STATS =============
@api_router.get("/stats")
async def stats(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    # Only count items WITH images (real generated content) or copywriting result
    total = await db.generated_prompts.count_documents({
        "user_id": user_id,
        "$or": [{"image_base64": {"$exists": True}}, {"slide_images": {"$exists": True}}, {"dashboard_type": "copywriting"}],
    })
    banner = await db.generated_prompts.count_documents({"user_id": user_id, "dashboard_type": "banner", "image_base64": {"$exists": True}})
    carousel = await db.generated_prompts.count_documents({"user_id": user_id, "dashboard_type": "carousel", "slide_images": {"$exists": True}})
    copy = await db.generated_prompts.count_documents({"user_id": user_id, "dashboard_type": "copywriting"})
    food = await db.generated_prompts.count_documents({"user_id": user_id, "dashboard_type": "food-menu", "image_base64": {"$exists": True}})
    return {
        "total": total,
        "banner": banner,
        "carousel": carousel,
        "copywriting": copy,
        "food_menu": food,
    }


# ============= F&B MENU VISUAL (template-based) =============
def _build_food_menu_prompt(payload: FoodMenuIn, brand: Optional[dict]) -> dict:
    brand = brand or {}
    color_primary = _extract_hex(brand.get("color_primary", "#0B3D2E"))
    color_secondary = _extract_hex(brand.get("color_secondary", "#FDFBF7"))
    brand_name = brand.get("brand_name", "Restaurant")
    category = brand.get("category", "")
    brand_archetype = brand.get("archetype", "")
    brand_personality = ARCHETYPE_VOICE.get(brand.get("archetype", "expert"), "professional")
    target_audience = brand.get("target_audience", "")
    words_always = brand.get("words_always", []) or []
    signature_phrase = brand.get("signature_phrase", "")

    # Brand DNA injection from module-level tables
    tone_typo = TONE_TYPOGRAPHY.get(brand_personality, TONE_TYPOGRAPHY["professional"])
    audience_mood = AUDIENCE_MOOD.get(target_audience, "")
    variation_hint = _random.choice(VARIATION_ANGLES)
    goal_key = payload.campaign_goal if payload.campaign_goal in CAMPAIGN_GOAL_DIRECTIVES else "best_seller"
    goal = CAMPAIGN_GOAL_DIRECTIVES[goal_key]

    # Detect Indonesian cuisine context for specialized props
    is_indonesian = any(w in category.lower() for w in ["indonesian", "indonesia", "nasi", "warung", "masakan", "kuliner"])

    mood_map = {
        "cozy": {
            "lighting": "Warm golden-amber lighting (3200K), soft diffused window light, intimate restaurant atmosphere — feels like evening dining",
            "aesthetic": "Rustic warmth: worn wooden table surface, linen cloth, candlelight reflection, hygge coffee-shop mood",
            "props": "Linen napkin loosely folded, vintage brass cutlery, small fresh herb sprig, ceramic mug if applicable, wooden serving board",
            "shooting_angle": "45-degree angle — shows depth and height of dish",
            "color_temp": "warm",
            "appetite_triggers": [
                "Steam wisps rising from hot dishes",
                "Soft specular highlight on sauce or glaze surface",
                "Fresh herb garnish with bright green color pop",
                "Warm wooden surface texture visible in background",
            ],
        },
        "modern": {
            "lighting": "Clean even directional lighting, controlled soft-box, minimal shadows — gallery restaurant aesthetics",
            "aesthetic": "Minimalist: white marble or matte concrete surface, geometric negative space, monochromatic with single brand color accent",
            "props": "Matte white or black plate, minimalist single-piece cutlery, one perfect garnish only, zero clutter",
            "shooting_angle": "Overhead flat-lay 90° OR strict 45° — no in-between angles",
            "color_temp": "neutral",
            "appetite_triggers": [
                "Perfect plating precision — geometric arrangement",
                "Single accent garnish perfectly placed",
                "High contrast between food and clean background",
                "Texture detail close-up feel",
            ],
        },
        "rustic": {
            "lighting": "Natural daylight from side window, soft dappled light, farm-to-table ambiance",
            "aesthetic": "Aged weathered wood, hand-thrown ceramic bowls, artisanal unpolished beauty — feels handcrafted",
            "props": "Stoneware ceramic bowls, rough linen cloth, fresh whole vegetables/herbs as context, terracotta tiles, twine",
            "shooting_angle": "45-degree — emphasizes the rustic depth and texture of ingredients",
            "color_temp": "warm",
            "appetite_triggers": [
                "Imperfect artisanal plating — intentionally unpretentious",
                "Fresh herbs directly from garden look",
                "Rustic sauce drizzle",
                "Visible natural ingredient textures",
            ],
        },
        "luxury": {
            "lighting": "Low-key cinematic lighting: single narrow spotlight on hero dish, deep shadows, rim light from behind",
            "aesthetic": "Dark, moody, fine-dining: obsidian/slate/charcoal background, gold accent details, haute cuisine precision plating",
            "props": "Gold or matte black premium cutlery, dark slate stone plate, edible flower garnish, micro-herbs, gold leaf accent",
            "shooting_angle": "45-degree with slight front-low angle — dramatic and imposing composition",
            "color_temp": "cool-dark",
            "appetite_triggers": [
                "Precise fine-dining plating with tweezers-level detail",
                "Sauce artistically swiped on plate",
                "Edible flower or gold leaf as luxury signal",
                "Perfect protein sear with golden-brown Maillard reaction visible",
                "Micro-green precision placement",
            ],
        },
        "vibrant": {
            "lighting": "Bright even overexposed-slightly lighting, high saturation, energetic food scene",
            "aesthetic": "Bold colors, fresh ingredients exploding with life, dynamic composition — café/street food energy",
            "props": "Colorful ceramic or paper packaging, fresh sliced fruits, sauce splash or drizzle mid-action, fun vibrant napkins",
            "shooting_angle": "Mix: some overhead flat-lay + some 45° — energetic variety",
            "color_temp": "warm-bright",
            "appetite_triggers": [
                "Sauce splash or pour mid-motion",
                "Cross-section cut showing colorful interior of food",
                "Fresh fruit or vegetable slice with vivid internal color",
                "Melting cheese pull or chocolate drip",
                "Condensation on cold drinks",
            ],
        },
    }
    mood_info = mood_map.get(payload.mood, mood_map["cozy"])

    layout_map = {
        "menu-board": {
            "directive": (
                "MENU BOARD LAYOUT: Create a branded menu poster. "
                "Upper 35%: hero food photography (full-bleed, appetite-focused). "
                "Lower 65%: menu board in brand colors — items listed with clear hierarchy: "
                "dish name (bold, largest), description (smaller, lighter weight), price (brand accent color). "
                "Brand logo at top-center. Headline/promo name prominent."
            ),
            "angle": "45° for hero dish, other items as supporting smaller shots or illustrated icons",
            "text_heavy": True,
        },
        "hero-single": {
            "directive": (
                "HERO SINGLE DISH LAYOUT: One magnificent dish is the sole star. "
                "Dish fills 60-70% of frame — close enough to see texture and steam. "
                "Typography in elegant thin overlay: dish name, price, brand name subtle at corner. "
                "Background context props add depth without competing. "
                "This is food porn — make viewer NEED to order this right now."
            ),
            "angle": "45° to 60° angle — shows height and layers of the dish beautifully",
            "text_heavy": False,
        },
        "multi-grid": {
            "directive": (
                "MULTI-ITEM FLAT-LAY GRID: 2x2 or 3x3 overhead grid of dishes — equal visual weight. "
                "All dishes photographed from directly above (90° flat-lay). "
                "Consistent spacing between dishes. "
                "Brand color background or neutral surface as grid base. "
                "Each dish has small text label below (dish name + price). "
                "Overall composition should feel curated and Instagram-scroll-worthy."
            ),
            "angle": "90° overhead flat-lay — all items",
            "text_heavy": False,
        },
        "magazine-spread": {
            "directive": (
                "MAGAZINE EDITORIAL LAYOUT: Large hero dish photography LEFT 60% of frame (full-bleed, dramatic). "
                "RIGHT 40%: editorial typography zone — restaurant name large, featured dish name, "
                "3-4 menu items listed, price range, tagline. "
                "Feels like a high-end food magazine spread or restaurant lookbook."
            ),
            "angle": "45° editorial angle for hero, overhead for smaller supporting shots",
            "text_heavy": True,
        },
    }
    layout_info = layout_map.get(payload.layout, layout_map["menu-board"])

    cta_text = payload.call_to_action or "Pesan Sekarang"
    headline = payload.headline or payload.menu_name or "Today's Special"

    items_block = []
    for item in payload.items:
        items_block.append({
            "name": item.get("name", ""),
            "description": item.get("description", ""),
            "price": item.get("price", ""),
        })

    indonesian_context = ""
    if is_indonesian:
        indonesian_context = (
            "INDONESIAN CUISINE CONTEXT: This is Indonesian food — emphasize rich, flavorful qualities. "
            "Typical Indonesian palette: deep brown rendang, golden fried textures, bright sambal red, "
            "turmeric yellow rice, fresh green vegetables. "
            "Props can include banana leaf, traditional ceramic, rattan tray, or batik cloth element (subtle). "
            "Food should look abundant and generous — Indonesian culture values portion generosity."
        )

    return {
        "task_type": "fnb_food_photography_generation",
        "campaign_goal_directive": {
            "goal": goal_key,
            "name": goal["name"],
            "visual_directive": goal["visual_directive"],
            "emotional_trigger": goal["emotional_trigger"],
            "cta_style_hint": goal["cta_style"],
        },
        "system_directive": (
            "You are a James Beard Award-level Food Photographer and F&B Art Director specializing in Indonesian restaurant content. "
            "Create a commercial food photography image that makes viewers IMMEDIATELY crave the food. "
            "This image will be posted on Instagram to drive restaurant foot traffic and food delivery orders. "
            "Every element serves one goal: maximum appetite appeal. "
            + (f"Brand positioning: {brand.get('brand_positioning', '')}. " if brand.get('brand_positioning') else "")
            + (f"Brand personality: {', '.join(brand.get('brand_personality', []))}. " if brand.get('brand_personality') else "")
            + (f"STRICT VISUAL RESTRICTIONS — do NOT include: {', '.join(brand.get('brand_donts', []))}. " if brand.get('brand_donts') else "")
            + (f"Brand archetype: {brand_archetype}. " if brand_archetype else "")
            + (f"Brand tone: {brand_personality}. " if brand_personality else "")
            + (f"Target audience: {target_audience}. " if target_audience else "")
            + (f"Visual keywords: {', '.join(words_always)}. " if words_always else "")
            + (f"Signature phrase: '{signature_phrase}'." if signature_phrase else "")
        ),
        "model_parameters": {
            "aspect_ratio": payload.aspect_ratio,
            "style_preset": payload.mood,
            "quality": "high",
            "photorealism": "ultra-realistic commercial food photography, 8K resolution, Michelin-star level",
        },
        "prompt_structure": {
            "subject": f"Premium food photography for {brand_name}",
            "branding_elements": {
                "brand_name": brand_name,
                "headline": headline,
                "menu_name": payload.menu_name,
                "call_to_action": cta_text,
            },
            "menu_items": items_block,
            "visual_layout": {
                "layout_directive": layout_info["directive"],
                "integration_and_blending": (
                    "Blend uploaded food photo(s) seamlessly — match the exact lighting setup specified. "
                    "Maintain accurate shadows and surface reflections. "
                    "Food must look like it was photographed in this exact environment — not pasted in."
                ),
            },
            "visual_style_details": {
                "color_palette": {
                    "background_dominant": color_primary,
                    "accent_elements": color_secondary,
                    "palette_rule": f"Background and surface areas use {color_primary} as dominant. {color_secondary} for text overlays, price badges, and UI accents ONLY. Food color remains 100% natural.",
                },
                "lighting_setup": mood_info["lighting"],
                "aesthetic_keywords": mood_info["aesthetic"],
                "props_and_styling": mood_info["props"],
                "shooting_angle": mood_info.get("shooting_angle", "45°"),
                "color_temperature": mood_info["color_temp"],
            },
            "appetite_engineering": {
                "triggers": mood_info.get("appetite_triggers", []),
                "hero_dish_instruction": (
                    "The main dish must be the undisputed visual star — "
                    "if multiple dishes shown, one must clearly dominate as hero. "
                    "Hero dish should have: perfect temperature indicators (steam for hot, condensation for cold), "
                    "optimal sauce/glaze presence, and fresh garnish."
                ),
                "color_temperature": mood_info["color_temp"],
            },
            "indonesian_context": indonesian_context,
            "food_photography_rules": [
                f"Primary shooting angle: {layout_info['angle']}",
                "Steam must be visible on hot dishes — use warm fill light to enhance steam visibility",
                "Sauce/glaze/dressing should have intentional drips or artistic application — not accidental",
                "Garnish: fresh, bright, intentionally placed — never random or wilted",
                "Protein (meat/fish): show perfect Maillard reaction (golden-brown sear) or precise cooking point",
                "Avoid: plastic-looking sheen, over-saturation, fake HDR glow, unnatural food colors",
                "Depth of field: slight background blur (f/2.8-4.0 equivalent) for hero shots",
            ],
            "typography_instructions": (
                f"{tone_typo} "
                "Typography must NOT compete with the food — it is secondary to appetite appeal. "
                f"Brand color {color_primary} for headlines and prices. "
                "Dish names: bold, clean sans-serif or elegant serif. "
                f"Leave clear zone for text — {'right or bottom overlay' if not layout_info['text_heavy'] else 'dedicated text panel'}."
            ),
            "brand_dna_directives": {
                "tone": brand_personality,
                "audience_mood": audience_mood,
                "emotional_target": f"Evoke: appetite, craving, and {audience_mood or 'delight'} in the target audience.",
            },
            "variation_directive": variation_hint,
            "composition_rules": [
                "Rule of thirds with hero dish at strong focal intersection",
                "Foreground interest: small prop or ingredient detail to create depth",
                "Background: soft, out-of-focus restaurant ambiance (not black void)",
                "Visual hierarchy: hero food → supporting elements → text → brand mark (smallest)",
            ],
            "negative_prompt": (
                "plastic-looking food, unappetizing colors, bad lighting, overcooked appearance, "
                "blurry food, artificial food colors, over-edited HDR, fake steam overlay, "
                "empty plate, missing food, cluttered mess, watermarks, logos, low resolution, "
                "misspelled menu text, text artifacts"
            ),
        },
    }


@api_router.post("/prompt/preview-food-menu")
async def preview_food_menu_prompt(payload: FoodMenuIn, current_user: dict = Depends(get_current_user)):
    """Return structured prompt JSON without generating image. No credits consumed."""
    brand = await db.brand_profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    prompt_obj = _build_food_menu_prompt(payload, brand)
    natural_prompt = _build_natural_prompt(prompt_obj)
    return {"prompt_json": prompt_obj, "natural_prompt": natural_prompt}


@api_router.post("/prompt/generate-food-menu")
async def generate_food_menu(payload: FoodMenuIn, current_user: dict = Depends(get_current_user)):
    # Content moderation
    item_texts = " ".join(str(i.get("name", "")) + " " + str(i.get("description", "")) for i in (payload.items or []))
    _raise_if_banned(payload.menu_name, payload.headline, payload.call_to_action, item_texts)

    if not await _consume_credit(current_user["id"], 1, current_user.get("role", "user")):
        raise HTTPException(status_code=402, detail="Kredit tidak cukup. Beli kredit di halaman pricing.")

    brand = await db.brand_profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    prompt_obj = _build_food_menu_prompt(payload, brand)

    try:
        natural = _build_natural_prompt(prompt_obj)
        natural = _append_reference_hint(natural, bool(payload.reference_image_base64))
        img = await _call_openai_image(natural, payload.aspect_ratio)
    except HTTPException:
        await _refund_credit(current_user["id"], 1, "Refund F&B generate gagal")
        raise

    saved_id = str(uuid.uuid4())
    doc = {
        "id": saved_id,
        "user_id": current_user["id"],
        "dashboard_type": "food-menu",
        "campaign_goal": payload.campaign_goal,
        "title": payload.menu_name or payload.headline or "Food Menu",
        "input_payload": payload.model_dump(),
        "prompt_json": prompt_obj,
        "image_base64": img,
        "aspect_ratio": payload.aspect_ratio,
        "created_at": now_iso(),
    }
    await db.generated_prompts.insert_one(doc)
    asyncio.create_task(_auto_consistency_check(current_user["id"], saved_id, img, "food-menu"))
    credits_doc = await db.user_credits.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return {
        "id": saved_id,
        "image_base64": img,
        "aspect_ratio": payload.aspect_ratio,
        "prompt_json": prompt_obj,
        "credits": _credits_summary(credits_doc),
    }


# ============= MARKETPLACE THUMBNAIL =============
def _build_marketplace_prompt(payload: MarketplaceIn, brand: Optional[dict]) -> dict:
    brand = brand or {}
    brand_name = brand.get("brand_name", "")
    category = brand.get("category", "")

    # Platform-specific design systems
    platform_configs = {
        "shopee": {
            "context": (
                "Shopee Indonesia marketplace thumbnail. "
                "Shopee's visual language: high energy, warm orange-red accent, bold discounts prominent. "
                "Indonesian shoppers on Shopee respond to: large % discount badge, strikethrough original price, "
                "bright warm background (white or very light orange tint), product as clear hero. "
                "Flash Sale badge in Shopee orange (#EE4D2D) if applicable."
            ),
            "badge_color": "#EE4D2D",
            "badge_style": "Shopee orange pill badge with white bold text",
            "trust_signals": ["⭐ rating badge", "Terjual 1rb+ label", "Shopee Mall badge if applicable"],
            "bg_color": "#FFFFFF",
            "accent_override": "#EE4D2D",
            "photography_style": "Pure studio white background with slight warm tint, product professionally lit with no harsh shadows",
        },
        "tokopedia": {
            "context": (
                "Tokopedia Indonesia marketplace thumbnail. "
                "Tokopedia's visual language: clean, trustworthy, green accent, official store feel. "
                "Indonesian shoppers on Tokopedia respond to: 'Gratis Ongkir' badge, official store indicator, "
                "clean professional composition, green (#42B549) as accent. "
                "More restrained design vs Shopee — quality over quantity signals."
            ),
            "badge_color": "#42B549",
            "badge_style": "Tokopedia green badge with white text",
            "trust_signals": ["Official Store badge", "Gratis Ongkir bubble", "COD available label"],
            "bg_color": "#FFFFFF",
            "accent_override": "#42B549",
            "photography_style": "Clean white studio background, product sharp and well-lit, professional commercial photography",
        },
        "general": {
            "context": (
                "General e-commerce marketplace thumbnail — works across Shopee, Tokopedia, Instagram Shop, TikTok Shop. "
                "Universal high-conversion design: product crystal-clear, pricing visible, brand consistent. "
                "Optimized for scroll performance — must grab attention among 50+ competitor listings."
            ),
            "badge_color": "#E2323D",
            "badge_style": "High-contrast pill badge",
            "trust_signals": ["Star rating", "Sales count"],
            "bg_color": "#FFFFFF",
            "accent_override": None,
            "photography_style": "Professional studio product photography, white or soft gradient background, 360-quality lighting",
        },
    }

    platform_cfg = platform_configs.get(payload.platform, platform_configs["general"])

    # Use platform accent for badges, brand colors for brand elements
    color_primary = _extract_hex(brand.get("color_primary", "#1A1A1A"))
    badge_color = platform_cfg["badge_color"]
    bg_color = platform_cfg["bg_color"]

    discount_text = f"{payload.discount_percent}% OFF" if payload.discount_percent else ""
    has_discount = bool(payload.discount_percent and payload.discount_percent > 0)
    has_strikethrough = bool(payload.original_price and payload.product_price)

    # Determine badge size instruction based on discount magnitude
    if has_discount:
        if payload.discount_percent >= 50:
            badge_prominence = "MEGA BADGE — discount must be the LARGEST element in the image after the product itself"
        elif payload.discount_percent >= 30:
            badge_prominence = "LARGE badge — discount very prominent, second most visible element"
        else:
            badge_prominence = "STANDARD badge — clearly visible but not overwhelming"
    else:
        badge_prominence = "No discount badge needed"

    return {
        "task_type": "marketplace_thumbnail_generation",
        "system_directive": (
            "You are an expert Indonesian E-Commerce Conversion Specialist and Product Photographer. "
            f"Create a high-converting {payload.platform.capitalize()} product thumbnail for '{payload.product_name}'. "
            "Your goal: maximize click-through rate (CTR) among Indonesian shoppers. "
            "Study what makes Indonesian marketplace buyers click: clear product, visible savings, trust signals. "
            "The thumbnail must look professional and trustworthy — not cheap or chaotic."
        ),
        "model_parameters": {
            "aspect_ratio": "1:1 (Square Feed)",
            "quality": "high",
            "photorealism": "professional e-commerce product photography, studio-quality, 8K",
        },
        "prompt_structure": {
            "subject": f"Marketplace product thumbnail: {payload.product_name}{f' by {brand_name}' if brand_name else ''}",
            "platform_context": platform_cfg["context"],
            "visual_style_details": {
                "photography_style": platform_cfg["photography_style"],
                "aesthetic_keywords": "high-conversion, product-hero, e-commerce-professional, trust-building",
                "color_palette": {
                    "background": bg_color,
                    "brand_dominant": color_primary,
                    "brand_accent": color_secondary,
                    "platform_badge_color": badge_color,
                },
                "lighting_setup": (
                    "Professional 3-point studio lighting: key light front-left, fill light front-right, "
                    "rim/hair light from behind to separate product from background. "
                    "Result: product looks expensive, sharp, and premium."
                ),
            },
            "branding_elements": {
                "brand_name": brand_name,
                "headline": payload.product_name,
                "call_to_action": payload.tagline or "",
            },
            "product_visual_layout": {
                "product_frame_rule": (
                    "Product occupies 65-75% of the 1:1 square frame. "
                    "Show product from its BEST ANGLE — the angle that clearly shows the key feature. "
                    "If possible, show 2-3 angles/variants arranged in appealing composition. "
                    "Product must be PERFECTLY SHARP — maximum focus on product, slight background softness."
                ),
                "composition_style": "Product centered-slightly-above center, leaving room for price badge at bottom",
                "placement_rule": "Top 70%: product hero. Bottom 30%: pricing and badge zone.",
            },
            "price_overlay": {
                "sale_price": payload.product_price,
                "original_price": payload.original_price,
                "discount_badge": discount_text,
                "promo_label": payload.promo_label,
                "badge_color": badge_color,
                "badge_design": {
                    "shape": "rounded rectangle or pill badge",
                    "badge_color": badge_color,
                    "text_color": "#FFFFFF",
                    "price_font_style": f"bold, large, high-contrast on {badge_color} background",
                    "position": "bottom-left corner OR top-left corner of image",
                },
                "discount_badge_prominence": badge_prominence,
                "strikethrough_price": has_strikethrough,
                "price_psychology": (
                    f"Display '{payload.original_price}' with clear red strikethrough (coret), "
                    f"then '{payload.product_price}' in large bold text below. "
                    "This price anchoring is critical for Indonesian marketplace conversion."
                ) if has_strikethrough else "",
            },
            "trust_signals": platform_cfg["trust_signals"],
            "category_context": f"Product category: {category}" if category else "",
            "composition_rules": [
                "Product must be the undisputed visual hero — all other elements are supporting cast",
                "Price/discount must be INSTANTLY readable at 200x200px thumbnail size",
                "Zero visual clutter — every element has purpose",
                "Background must be clean: pure white, very light gradient, or soft brand color",
                f"Discount badge: {badge_prominence}",
                "Brand name: small but visible, bottom area",
                "Text contrast ratio minimum 4.5:1 for all price text",
            ],
            "negative_prompt": (
                "cluttered background, multiple competing visual centers, text too small to read at thumbnail, "
                "dark background (unless luxury product), watermarks, competitor logos, "
                "blurry product, poorly lit product, crowded chaotic layout, "
                "fake reviews, misleading imagery, low resolution"
            ),
            "human_model_directive": _build_human_directive(payload, brand) or None,
        },
    }


@api_router.post("/prompt/preview-marketplace")
async def preview_marketplace_prompt(payload: MarketplaceIn, current_user: dict = Depends(get_current_user)):
    """Return structured prompt JSON for marketplace thumbnail. No credits consumed."""
    brand = await _get_active_brand(current_user["id"])
    prompt_json = _build_marketplace_prompt(payload, brand)
    natural_prompt = _build_natural_prompt(prompt_json)
    natural_prompt = _append_reference_hint(natural_prompt, bool(payload.product_photo_base64))
    return {
        "prompt_json": prompt_json,
        "natural_prompt": natural_prompt,
    }


@api_router.post("/prompt/generate-marketplace")
async def generate_marketplace(payload: MarketplaceIn, current_user: dict = Depends(get_current_user)):
    # Content moderation
    _raise_if_banned(payload.product_name, payload.tagline, payload.promo_label)

    if not await _consume_credit(current_user["id"], 1, current_user.get("role", "user")):
        raise HTTPException(status_code=402, detail="Kredit tidak cukup. Beli kredit di halaman pricing.")

    brand = await _get_active_brand(current_user["id"])
    prompt_obj = _build_marketplace_prompt(payload, brand)

    try:
        natural_prompt = _build_natural_prompt(prompt_obj)
        natural_prompt = _append_reference_hint(natural_prompt, bool(payload.product_photo_base64))
        img = await _call_openai_image(natural_prompt, "1:1 (Square Feed)")
    except HTTPException:
        await _refund_credit(current_user["id"], 1, "Refund marketplace generate gagal")
        raise

    saved_id = str(uuid.uuid4())
    doc = {
        "id": saved_id,
        "user_id": current_user["id"],
        "dashboard_type": "marketplace",
        "title": payload.product_name or "Marketplace Thumbnail",
        "input_payload": payload.model_dump(),
        "prompt_json": prompt_obj,
        "image_base64": img,
        "aspect_ratio": "1:1 (Square Feed)",
        "created_at": now_iso(),
    }
    if payload.save:
        await db.generated_prompts.insert_one(doc)

    asyncio.create_task(_auto_consistency_check(current_user["id"], saved_id, img, "marketplace"))
    credits_doc = await db.user_credits.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return {
        "id": saved_id,
        "image_base64": img,
        "prompt_json": prompt_obj,
        "credits": _credits_summary(credits_doc),
    }


# ============= BRAND CONSISTENCY CHECKER (Gemini Vision) =============
@api_router.post("/consistency/check")
async def consistency_check(payload: ConsistencyCheckIn, current_user: dict = Depends(get_current_user)):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    except Exception as e:
        logger.error(f"emergentintegrations import failed: {e}")
        raise HTTPException(status_code=500, detail="AI vision service unavailable")

    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")

    brand = await db.brand_profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=400, detail="Brand profile belum dibuat")

    brand_summary = (
        f"Brand: {brand.get('brand_name', '')}\n"
        f"Kategori: {brand.get('category', '')}\n"
        f"Warna primer: {brand.get('color_primary', '')}\n"
        f"Warna sekunder: {brand.get('color_secondary', '')}\n"
        f"Gaya visual: {brand.get('visual_style', '')}\n"
        + (f"Brand positioning: {brand.get('brand_positioning', '')}\n" if brand.get('brand_positioning') else "")
        + (f"Brand personality: {', '.join(brand.get('brand_personality', []))}\n" if brand.get('brand_personality') else "")
    )

    system = (
        "Anda adalah Brand Consistency Auditor profesional yang menilai konsistensi visual antara hasil gambar dengan Brand DNA. "
        "Output HARUS JSON valid (tanpa markdown fence). Berikan skor 0-100 dan saran perbaikan yang actionable. Bahasa: Indonesia."
    )

    instruction = (
        f"Brand DNA pengguna:\n{brand_summary}\n"
        f"Catatan user (opsional): {payload.note or '-'}\n\n"
        "Analisis gambar terlampir dan bandingkan dengan Brand DNA di atas. "
        "Kembalikan HANYA JSON valid dengan struktur:\n"
        "{\n"
        '  "overall_score": 0-100,\n'
        '  "color_score": 0-100,\n'
        '  "mood_score": 0-100,\n'
        '  "composition_score": 0-100,\n'
        '  "typography_score": 0-100,\n'
        '  "summary": "ringkasan 1-2 kalimat",\n'
        '  "strengths": ["kekuatan 1", "kekuatan 2"],\n'
        '  "weaknesses": ["kelemahan 1", "kelemahan 2"],\n'
        '  "actionable_tips": ["saran konkret 1 untuk prompt berikutnya", "saran 2", "saran 3"],\n'
        '  "detected_dominant_colors": ["#hex1", "#hex2", "#hex3"],\n'
        '  "alignment_verdict": "Sangat Konsisten | Konsisten | Cukup | Kurang Konsisten | Tidak Konsisten"\n'
        "}"
    )

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"consistency-{current_user['id']}-{uuid.uuid4()}",
        system_message=system,
    ).with_model("gemini", "gemini-3-flash-preview")

    image_content = ImageContent(image_base64=payload.image_base64)
    user_msg = UserMessage(text=instruction, file_contents=[image_content])

    try:
        response = await chat.send_message(user_msg)
    except Exception as e:
        logger.error(f"Consistency check failed: {e}")
        raise HTTPException(status_code=500, detail=_ai_error_detail(e, "Consistency check gagal. Coba lagi."))

    raw = response.strip() if isinstance(response, str) else str(response)
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1]) if lines[-1].startswith("```") else "\n".join(lines[1:])
        raw = raw.strip()
    if raw.startswith("json"):
        raw = raw[4:].strip()

    try:
        parsed = json.loads(raw)
    except Exception:
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            try:
                parsed = json.loads(raw[start:end + 1])
            except Exception:
                parsed = {"error": "parse_failed", "_raw": raw[:1500]}
        else:
            parsed = {"error": "no_json", "_raw": raw[:1500]}

    # Save consistency check log
    if "error" not in parsed:
        await db.consistency_checks.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "result": parsed,
            "note": payload.note,
            "created_at": now_iso(),
        })

    return parsed


# ============= GRID PLANNER =============
@api_router.get("/grid-planner")
async def get_grid_layout(current_user: dict = Depends(get_current_user)):
    layout = await db.grid_layouts.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return layout  # may be None


@api_router.post("/grid-planner")
async def save_grid_layout(payload: GridLayoutIn, current_user: dict = Depends(get_current_user)):
    if len(payload.slots) > 9:
        raise HTTPException(status_code=400, detail="Maksimal 9 slot")
    doc = {
        "user_id": current_user["id"],
        "name": payload.name,
        "slots": [s.model_dump() for s in payload.slots],
        "updated_at": now_iso(),
    }
    existing = await db.grid_layouts.find_one({"user_id": current_user["id"]})
    if existing:
        await db.grid_layouts.update_one({"user_id": current_user["id"]}, {"$set": doc})
    else:
        doc["id"] = str(uuid.uuid4())
        doc["created_at"] = now_iso()
        await db.grid_layouts.insert_one(doc)
    return await db.grid_layouts.find_one({"user_id": current_user["id"]}, {"_id": 0})


# ============= NOTIFICATION HELPERS =============

async def _send_telegram(chat_id: str, text: str) -> bool:
    """Send a Telegram message to a chat_id via Bot API."""
    if not TELEGRAM_BOT_TOKEN or not _HTTPX_AVAILABLE:
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
            )
            return r.status_code == 200
    except Exception as e:
        logger.warning(f"Telegram send failed: {e}")
        return False



def _make_reminder_message(post: dict, brand_name: str = "") -> str:
    post_date = post.get("post_date", "")
    title = post.get("title", "Konten kamu")
    platform = post.get("platform", "Instagram")
    caption_preview = post.get("caption", "")[:120]
    hours_before = post.get("reminder_hours_before", 24)
    label = "besok" if hours_before <= 24 else f"{hours_before // 24} hari lagi"

    return (
        f"🔔 <b>Feedify — Reminder Posting!</b>\n\n"
        f"📅 Konten dijadwalkan tayang: <b>{post_date}</b> ({label})\n"
        f"📌 Judul: {title}\n"
        f"📱 Platform: {platform.capitalize()}\n\n"
        f"📝 Caption preview:\n<i>{caption_preview}{'...' if len(post.get('caption','')) > 120 else ''}</i>\n\n"
        f"Buka Feedify sekarang untuk lihat konten lengkap dan siapkan posting kamu 🚀"
    )


async def _reminder_loop():
    """Background task: check every 60s for due reminders and send notifications."""
    await asyncio.sleep(10)  # wait for server to fully start
    while True:
        try:
            now_str = datetime.now(timezone.utc).isoformat()
            due = await db.scheduled_posts.find({
                "reminder_sent": False,
                "reminder_at": {"$lte": now_str},
                "status": {"$in": ["scheduled", "draft"]},
            }, {"_id": 0}).to_list(50)

            for post in due:
                user_id = post["user_id"]
                notif = await db.notification_settings.find_one({"user_id": user_id}, {"_id": 0})
                if notif and notif.get("notifications_enabled", True):
                    msg = _make_reminder_message(post)
                    if notif.get("telegram_chat_id"):
                        await _send_telegram(notif["telegram_chat_id"], msg)

                await db.scheduled_posts.update_one(
                    {"id": post["id"]},
                    {"$set": {"reminder_sent": True}},
                )
                logger.info(f"Reminder sent for scheduled post {post['id']}")
        except Exception as e:
            logger.error(f"Reminder loop error: {e}")
        await asyncio.sleep(60)


# ============= SCHEDULING ENDPOINTS =============

@api_router.post("/schedule")
async def create_schedule(payload: SchedulePostIn, current_user: dict = Depends(get_current_user)):
    """Schedule a generated post with reminder notification."""
    # Calculate reminder_at datetime
    try:
        h, m = payload.post_time.split(":")
        post_dt = datetime.strptime(payload.post_date, "%Y-%m-%d").replace(
            hour=int(h), minute=int(m), tzinfo=timezone.utc
        )
    except Exception:
        post_dt = datetime.strptime(payload.post_date, "%Y-%m-%d").replace(
            hour=9, minute=0, tzinfo=timezone.utc
        )
    reminder_at = (post_dt - timedelta(hours=payload.reminder_hours_before)).isoformat()

    # Fetch prompt info if prompt_id provided
    image_b64 = payload.image_base64
    dashboard_type = payload.dashboard_type
    if payload.prompt_id and not image_b64:
        prompt_doc = await db.generated_prompts.find_one(
            {"id": payload.prompt_id, "user_id": current_user["id"]}, {"_id": 0}
        )
        if prompt_doc:
            image_b64 = prompt_doc.get("image_base64", "")
            dashboard_type = prompt_doc.get("dashboard_type", dashboard_type)

    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        "user_id": current_user["id"],
        "prompt_id": payload.prompt_id,
        "title": payload.title,
        "caption": payload.caption,
        "platform": payload.platform,
        "post_date": payload.post_date,
        "post_time": payload.post_time,
        "reminder_hours_before": payload.reminder_hours_before,
        "reminder_at": reminder_at,
        "reminder_sent": False,
        "status": "scheduled",
        "image_base64": image_b64,
        "dashboard_type": dashboard_type,
        "created_at": now_iso(),
    }
    await db.scheduled_posts.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/schedule")
async def list_schedule(
    current_user: dict = Depends(get_current_user),
    month: Optional[str] = None,
):
    """List scheduled posts, optionally filtered by month (YYYY-MM)."""
    query = {"user_id": current_user["id"]}
    if month:
        query["post_date"] = {"$regex": f"^{month}"}
    posts = await db.scheduled_posts.find(query, {"_id": 0, "image_base64": 0}).sort("post_date", 1).to_list(200)
    return posts


@api_router.get("/schedule/{post_id}")
async def get_schedule(post_id: str, current_user: dict = Depends(get_current_user)):
    post = await db.scheduled_posts.find_one({"id": post_id, "user_id": current_user["id"]}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Not found")
    return post


@api_router.patch("/schedule/{post_id}")
async def update_schedule(post_id: str, payload: SchedulePostIn, current_user: dict = Depends(get_current_user)):
    try:
        h, m = payload.post_time.split(":")
        post_dt = datetime.strptime(payload.post_date, "%Y-%m-%d").replace(
            hour=int(h), minute=int(m), tzinfo=timezone.utc
        )
    except Exception:
        post_dt = datetime.strptime(payload.post_date, "%Y-%m-%d").replace(hour=9, tzinfo=timezone.utc)
    reminder_at = (post_dt - timedelta(hours=payload.reminder_hours_before)).isoformat()

    update = {
        "title": payload.title,
        "caption": payload.caption,
        "platform": payload.platform,
        "post_date": payload.post_date,
        "post_time": payload.post_time,
        "reminder_hours_before": payload.reminder_hours_before,
        "reminder_at": reminder_at,
        "reminder_sent": False,
    }
    result = await db.scheduled_posts.update_one(
        {"id": post_id, "user_id": current_user["id"]},
        {"$set": update},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"updated": True}


@api_router.patch("/schedule/{post_id}/mark-posted")
async def mark_posted(post_id: str, current_user: dict = Depends(get_current_user)):
    await db.scheduled_posts.update_one(
        {"id": post_id, "user_id": current_user["id"]},
        {"$set": {"status": "posted"}},
    )
    return {"status": "posted"}


@api_router.delete("/schedule/{post_id}")
async def delete_schedule(post_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.scheduled_posts.delete_one({"id": post_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": True}


# ============= NOTIFICATION SETTINGS =============

@api_router.get("/notifications/settings")
async def get_notification_settings(current_user: dict = Depends(get_current_user)):
    doc = await db.notification_settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not doc:
        return {"telegram_chat_id": None, "whatsapp_phone": None, "default_reminder_hours": 24, "notifications_enabled": True}
    return doc


@api_router.put("/notifications/settings")
async def save_notification_settings(payload: NotificationSettingsIn, current_user: dict = Depends(get_current_user)):
    await db.notification_settings.update_one(
        {"user_id": current_user["id"]},
        {"$set": {**payload.model_dump(), "user_id": current_user["id"], "updated_at": now_iso()}},
        upsert=True,
    )
    return {"saved": True}


@api_router.post("/notifications/telegram-start")
async def telegram_start(current_user: dict = Depends(get_current_user)):
    """Generate a unique connection code for Telegram bot linking."""
    code = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    await db.telegram_pending.delete_many({"user_id": current_user["id"]})
    await db.telegram_pending.insert_one({
        "user_id": current_user["id"],
        "code": code,
        "expires_at": expires_at,
        "created_at": now_iso(),
    })
    bot_username = os.environ.get("TELEGRAM_BOT_USERNAME", "feedify_notif_bot")
    return {
        "code": code,
        "bot_username": bot_username,
        "deep_link": f"https://t.me/{bot_username}?start={code}",
        "instruction": f"Buka Telegram, cari @{bot_username}, lalu kirim: /connect {code}",
        "expires_minutes": 15,
    }


@api_router.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    """Webhook endpoint for Telegram bot updates. Register this URL in BotFather."""
    try:
        update = await request.json()
    except Exception:
        return {"ok": True}

    msg = update.get("message") or update.get("edited_message")
    if not msg:
        return {"ok": True}

    chat_id = str(msg.get("chat", {}).get("id", ""))
    text = (msg.get("text") or "").strip()

    # Handle /start CODE or /connect CODE
    for prefix in ("/start ", "/connect "):
        if text.startswith(prefix):
            code = text[len(prefix):].strip().upper()
            pending = await db.telegram_pending.find_one({"code": code})
            if not pending:
                await _send_telegram(chat_id, "❌ Kode tidak valid atau sudah kadaluarsa. Coba generate kode baru di Feedify.")
                return {"ok": True}
            if pending.get("expires_at", "") < datetime.now(timezone.utc).isoformat():
                await _send_telegram(chat_id, "⏰ Kode sudah kadaluarsa. Generate kode baru di Settings Feedify.")
                return {"ok": True}
            # Save chat_id
            await db.notification_settings.update_one(
                {"user_id": pending["user_id"]},
                {"$set": {
                    "user_id": pending["user_id"],
                    "telegram_chat_id": chat_id,
                    "notifications_enabled": True,
                    "default_reminder_hours": 24,
                    "updated_at": now_iso(),
                }},
                upsert=True,
            )
            await db.telegram_pending.delete_one({"code": code})
            await _send_telegram(chat_id,
                "✅ <b>Berhasil terhubung ke Feedify!</b>\n\n"
                "Mulai sekarang kamu akan dapat notifikasi pengingat posting langsung di Telegram ini 🎉\n\n"
                "Jadwalkan konten di <b>feedify.app → Calendar Planner</b>"
            )
            return {"ok": True}

    return {"ok": True}


# ============= CONTENT CALENDAR =============
@api_router.get("/calendar")
async def list_calendar(current_user: dict = Depends(get_current_user), month: Optional[str] = None):
    """month format YYYY-MM"""
    query = {"user_id": current_user["id"]}
    if month:
        query["scheduled_date"] = {"$regex": f"^{month}"}
    events = await db.calendar_events.find(query, {"_id": 0}).sort("scheduled_date", 1).to_list(200)
    return events


@api_router.post("/calendar")
async def create_calendar_event(payload: CalendarEventIn, current_user: dict = Depends(get_current_user)):
    event_id = str(uuid.uuid4())
    doc = {
        "id": event_id,
        "user_id": current_user["id"],
        **payload.model_dump(),
        "created_at": now_iso(),
    }
    await db.calendar_events.insert_one(doc)
    return await db.calendar_events.find_one({"id": event_id}, {"_id": 0})


@api_router.patch("/calendar/{event_id}")
async def update_calendar_event(event_id: str, payload: CalendarEventIn, current_user: dict = Depends(get_current_user)):
    result = await db.calendar_events.update_one(
        {"id": event_id, "user_id": current_user["id"]},
        {"$set": payload.model_dump()},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.calendar_events.find_one({"id": event_id}, {"_id": 0})


@api_router.delete("/calendar/{event_id}")
async def delete_calendar_event(event_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.calendar_events.delete_one({"id": event_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": True}


# ============= CALENDAR AI IDEAS =============
_INDONESIAN_EVENTS = {
    1: ["Tahun Baru 1 Jan", "Hari Libur Panjang Tahun Baru"],
    2: ["Valentine's Day 14 Feb", "Imlek (cek kalender tahun ini)"],
    3: ["Hari Perempuan Internasional 8 Mar", "Hari Konsumen Nasional 20 Mar"],
    4: ["Hari Kartini 21 Apr", "Hari Bumi 22 Apr"],
    5: ["Hari Buruh 1 Mei", "Hari Pendidikan Nasional 2 Mei", "Hari Kebangkitan Nasional 20 Mei"],
    6: ["Hari Lahir Pancasila 1 Jun", "Mid-year promo season"],
    7: ["Mid-year clearance", "Promo akhir semester", "Back-to-school season"],
    8: ["HUT RI 17 Agustus — promo 17-an", "Harbolnas 8.8"],
    9: ["Harbolnas 9.9", "Hari Pelanggan Nasional 4 Sep"],
    10: ["Harbolnas 10.10", "Hari Batik Nasional 2 Okt", "Hari Sumpah Pemuda 28 Okt"],
    11: ["Harbolnas 11.11", "Hari Pahlawan 10 Nov"],
    12: ["Harbolnas 12.12", "Natal 25 Des", "Tahun Baru Eve 31 Des", "Year-end sale"],
}

_MONTH_NAMES_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"]


@api_router.post("/calendar/generate-ideas")
async def generate_calendar_ideas(payload: CalendarIdeasIn, current_user: dict = Depends(get_current_user)):
    """Generate AI content slot ideas for a full month. No credits consumed."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        raise HTTPException(status_code=500, detail="AI service unavailable")

    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")

    brand = await _get_active_brand(current_user["id"]) or {}
    brand_name = brand.get("brand_name", "brand Anda")
    category = brand.get("category", "")
    archetype = brand.get("archetype", "expert")
    target = brand.get("target_audience", "")
    month_name = _MONTH_NAMES_ID[payload.month - 1] if 1 <= payload.month <= 12 else "bulan ini"
    events = _INDONESIAN_EVENTS.get(payload.month, [])
    events_str = ", ".join(events) if events else "tidak ada momen khusus"

    system = (
        "Anda adalah Content Strategist UMKM Indonesia. "
        "Buat rencana konten bulanan yang relevan, engaging, dan sesuai brand. "
        "Output HANYA JSON valid tanpa markdown fence."
    )

    user_prompt = f"""Buat 30 ide konten Instagram untuk brand "{brand_name}" bulan {month_name} {payload.year}.

Brand info:
- Kategori: {category}
- Archetype brand: {archetype}
- Target audiens: {target or 'umum'}

Momen penting bulan ini: {events_str}

Panduan distribusi:
- 8-10 posting promosi/produk
- 6-8 posting edukasi/tips
- 5-6 posting engagement (pertanyaan, poll, behind-the-scenes)
- 4-5 posting testimoni/social proof
- 3-4 posting terkait momen/hari khusus
- Sisanya konten awareness/lifestyle

Kembalikan HANYA JSON valid dengan struktur:
{{
  "month": "{month_name} {payload.year}",
  "ideas": [
    {{
      "day": 1,
      "content_type": "Promosi",
      "theme": "tema singkat 3-5 kata",
      "hook": "opening line menarik untuk caption",
      "visual_suggestion": "deskripsi visual 1 kalimat",
      "hashtag_cluster": "#hashtag1 #hashtag2 #hashtag3"
    }},
    ... (total 30 items untuk hari 1-30)
  ]
}}"""

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"cal-ideas-{current_user['id']}-{uuid.uuid4()}",
        system_message=system,
    ).with_model("gemini", "gemini-3-flash-preview")

    try:
        response = await chat.send_message(UserMessage(text=user_prompt))
    except Exception as e:
        logger.error(f"Calendar ideas call failed: {e}")
        raise HTTPException(status_code=500, detail=_ai_error_detail(e, "Gagal generate ide kalender. Coba lagi."))

    raw = response.strip() if isinstance(response, str) else str(response)
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1]) if lines[-1].startswith("```") else "\n".join(lines[1:])
        raw = raw.strip()
    if raw.startswith("json"):
        raw = raw[4:].strip()

    try:
        parsed = json.loads(raw)
    except Exception:
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            try:
                parsed = json.loads(raw[start:end + 1])
            except Exception:
                parsed = {"error": "parse_failed", "ideas": []}
        else:
            parsed = {"error": "no_json", "ideas": []}

    return parsed


# ============= CONFIG (public) =============
@api_router.get("/config")
async def get_config():
    """Public config — archetypes, purposes, credit packages."""
    return {
        "archetypes": BRAND_ARCHETYPES,
        "content_purposes": CONTENT_PURPOSES,
        "credit_packages": [
            {"id": k, **{kk: vv for kk, vv in v.items()}}
            for k, v in CREDIT_PACKAGES.items()
        ],
    }


# ============= CREDITS (top-up system) =============
@api_router.get("/credits/balance")
async def get_credit_balance(current_user: dict = Depends(get_current_user)):
    doc = await db.user_credits.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return _credits_summary(doc)

# Keep /credits alias for backwards compat with existing frontend calls
@api_router.get("/credits")
async def get_credits_legacy(current_user: dict = Depends(get_current_user)):
    doc = await db.user_credits.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return _credits_summary(doc)


@api_router.get("/credits/history")
async def credit_history(current_user: dict = Depends(get_current_user)):
    items = await db.credit_transactions.find(
        {"user_id": current_user["id"]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(50)
    return items


class CreditPurchaseIn(BaseModel):
    package_id: str
    voucher_code: Optional[str] = None

@api_router.post("/credits/purchase")
async def purchase_credits(body: CreditPurchaseIn, current_user: dict = Depends(get_current_user)):
    pkg = CREDIT_PACKAGES.get(body.package_id)
    if not pkg:
        raise HTTPException(status_code=400, detail="Paket tidak valid")

    base_price = pkg["price"]
    discount = 0
    voucher_ref = None
    if body.voucher_code:
        v, err = await _resolve_voucher(body.voucher_code, current_user["id"])
        if not v:
            raise HTTPException(status_code=400, detail=err or "Voucher tidak valid")
        discount = round(base_price * v["value"] / 100) if v["type"] == "percent" else v["value"]
        voucher_ref = v.get("ref")
    final_price = max(0, base_price - discount)

    if not XENDIT_API_KEY:
        # Dev mode: simulate purchase, add credits immediately
        dev_ref = f"dev-{current_user['id'][:8]}"
        balance = await _add_credits(
            current_user["id"], pkg["credits"],
            dev_ref,
            f"[DEV] Beli {pkg['credits']} kredit — {pkg['name']}"
        )
        # Mark voucher as used in dev mode too
        if voucher_ref:
            await db.credit_transactions.update_one(
                {"user_id": current_user["id"], "reference_id": dev_ref},
                {"$set": {"voucher_ref": voucher_ref}},
            )
            # Record daily voucher claim
            if body.voucher_code and body.voucher_code.upper().startswith("FDY-"):
                await db.daily_vouchers.update_one(
                    {"code": body.voucher_code.upper()},
                    {"$addToSet": {"claimed_by": current_user["id"]}}
                )
        return {
            "payment_url": None,
            "dev_mode": True,
            "credits_added": pkg["credits"],
            "new_balance": balance,
        }

    import httpx
    external_id = f"feedify-credits-{body.package_id}-{current_user['id'][:8]}-{int(datetime.utcnow().timestamp())}"
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    user_email = current_user.get("email", "user@feedify.id")

    # Redirect to onboarding if user hasn't completed it yet, else dashboard
    has_brand_profile = await db.brand_profiles.find_one({"user_id": current_user["id"]}) is not None
    success_url = (
        f"{frontend_url}/onboarding?topup=success"
        if not has_brand_profile
        else f"{frontend_url}/dashboard?credits_added={pkg['credits']}"
    )

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.xendit.co/v2/invoices",
            auth=(XENDIT_API_KEY, ""),
            json={
                "external_id": external_id,
                "amount": final_price,
                "payer_email": user_email,
                "description": f"Feedify {pkg['name']} — {pkg['credits']} kredit",
                "currency": "IDR",
                "invoice_duration": 86400,
                "success_redirect_url": success_url,
                "failure_redirect_url": f"{frontend_url}/credits",
            },
            timeout=15,
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail="Gagal membuat invoice Xendit")

    data = resp.json()
    await db.pending_credit_orders.insert_one({
        "external_id": external_id,
        "user_id": current_user["id"],
        "package_id": body.package_id,
        "credits": pkg["credits"],
        "amount": final_price,
        "voucher": body.voucher_code,
        "voucher_ref": voucher_ref,
        "status": "pending",
        "created_at": now_iso(),
    })
    return {"payment_url": data.get("invoice_url"), "external_id": external_id}


XENDIT_CALLBACK_TOKEN = os.environ.get("XENDIT_CALLBACK_TOKEN", "")

@api_router.post("/credits/xendit-webhook")
async def credits_xendit_webhook(request: Request):
    # Verify Xendit callback token
    token = request.headers.get("x-callback-token", "")
    if XENDIT_CALLBACK_TOKEN and token != XENDIT_CALLBACK_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid webhook token")

    payload = await request.json()
    if payload.get("status") != "PAID":
        return {"ok": True}

    external_id = payload.get("external_id", "")
    if not external_id.startswith("feedify-credits-"):
        return {"ok": True}

    order = await db.pending_credit_orders.find_one({"external_id": external_id})
    if not order:
        return {"ok": True}
    if order.get("status") == "paid":
        return {"ok": True}  # idempotent

    # Mark paid
    await db.pending_credit_orders.update_one(
        {"external_id": external_id},
        {"$set": {"status": "paid", "paid_at": now_iso()}}
    )

    # Add credits atomically
    pkg = CREDIT_PACKAGES.get(order["package_id"], {})
    credits_to_add = order.get("credits", pkg.get("credits", 0))
    if credits_to_add > 0:
        await _add_credits(
            order["user_id"],
            credits_to_add,
            external_id,
            f"Beli {pkg.get('name', order['package_id'])} — {credits_to_add} kredit"
        )
    # Record voucher usage so single-use vouchers can't be reused
    if order.get("voucher_ref"):
        await db.credit_transactions.update_one(
            {"user_id": order["user_id"], "reference_id": external_id},
            {"$set": {"voucher_ref": order["voucher_ref"]}},
        )
        # Record daily voucher claim (atomic, prevent race condition)
        voucher_code = order.get("voucher", "")
        if voucher_code and voucher_code.upper().startswith("FDY-"):
            await db.daily_vouchers.update_one(
                {"code": voucher_code.upper()},
                {"$addToSet": {"claimed_by": order["user_id"]}}
            )

    return {"ok": True}



# ============= AI SUPPORT CHAT =============
SUPPORT_SYSTEM_PROMPT = """Kamu adalah Ara — asisten virtual Feedify. Kamu ngobrol kayak teman yang ngerti banget soal Feedify, bukan kayak robot customer service.

KEPRIBADIAN & GAYA NGOBROL:
- Santai tapi tetap profesional. Bukan "dengan hormat", tapi bukan juga terlalu alay
- Pakai "kamu" bukan "Anda". Pakai "Feedify" bukan "kami/kita" kecuali lagi bahas tim secara spesifik
- Emoji sesekali boleh — max 1 per jawaban, dan hanya kalau natural
- Jawaban ringkas dan langsung. Kalau bisa 2 kalimat, jangan 5 kalimat
- Ikutin gaya bahasa user — kalau mereka campur indo-inggris, ikutin
- Empati dulu kalau user ada masalah, baru kasih solusi

TENTANG FEEDIFY:
Feedify adalah brand studio berbasis AI untuk UMKM dan pebisnis Indonesia. Bukan aplikasi edit foto — kamu isi info brand dan produk, Feedify yang generate konten visual profesional secara otomatis, konsisten dengan identitas brand kamu.
- Launch: Juli 2026
- Target user: semua UMKM yang punya brand — skincare, fashion, F&B, aksesoris, kuliner, semua jenis brand produk welcome
- Komunitas Feedify terus berkembang setiap harinya

SISTEM KREDIT:
- 1 kredit = 1 konten/foto yang di-generate
- Kredit TIDAK expired — beli kapan saja, pakai kapan saja
- Kalau generate gagal karena error sistem, kredit otomatis dikembalikan — tidak perlu lapor ke support
- Kredit yang sudah dibeli tidak bisa di-refund, tapi tenang karena tidak akan hangus

PAKET HARGA:
1. Starter — 10 kredit · Rp 15.000 (Rp 1.500/kredit) → paling cocok buat yang mau coba dulu
2. Monthly — 30 kredit · Rp 40.000 (Rp 1.333/kredit) → paling populer, cukup buat 1 bulan konten
3. Bimonthly — 60 kredit · Rp 79.000 (Rp 1.317/kredit) → hemat, cukup buat 2 bulan
4. Pro Pack — 300 kredit · Rp 350.000 (Rp 1.167/kredit) → untuk yang produksi konten dalam jumlah besar

FITUR-FITUR FEEDIFY:
1. Banner Generator — upload foto produk, isi headline & CTA, pilih style preset → foto iklan siap dalam 30 detik. 5 preset visual, 4 ukuran (feed, story, landscape, square)
2. Carousel Storytelling — generate 3–7 slide sekaligus (tiap slide = 1 kredit), cocok buat edu-content dan product storytelling
3. Copywriting AI — generate caption, hashtag, headline dalam Bahasa Indonesia sesuai tone brand. GRATIS, tidak pakai kredit
4. F&B Menu Visual — khusus bisnis kuliner, generate foto menu dengan mood dan layout yang bisa dipilih
5. Feed Grid Planner — preview tampilan feed 3×3 sebelum posting, supaya feed selalu rapi dan konsisten. GRATIS
6. Content Calendar — rencanakan jadwal konten bulanan. GRATIS
7. Consistency Checker — AI audit visual konten vs Brand DNA, kasih skor dan saran. Tersedia setelah generate

BRAND DNA — FITUR INTI FEEDIFY:
Setup sekali: nama brand, palet warna, gaya visual, tone of voice, target audiens, kata-kata khas brand.
Semua dashboard otomatis pakai Brand DNA ini → konten selalu konsisten tanpa perlu setting ulang tiap kali generate.
1 akun bisa punya lebih dari 1 Brand DNA — cocok buat yang pegang 2 bisnis atau lebih.
User bisa upload logo brand sendiri untuk diintegrasikan ke hasil generate.

HASIL GENERATE:
- Resolusi standar 1080×1080px (square), 1080×1350px (portrait 4:5), 1080×1920px (story)
- Format PNG, tanpa watermark sama sekali
- 100% milik kamu — bebas dipakai untuk Instagram, TikTok, Shopee, Tokopedia, marketplace, iklan, brosur, dll
- Tidak ada batasan platform

CARA MULAI:
1. Daftar di feedify.id (gratis)
2. Setup Brand Profile — 5 menit, isi info brand, warna, gaya visual, target pasar
3. Pilih dashboard (Banner, Carousel, F&B, dll)
4. Isi info konten (produk, headline, CTA)
5. Klik Generate → hasil dalam ~30 detik
6. Download dan langsung posting

PEMBAYARAN:
- Diproses via Xendit (aman, SSL, PCI DSS Compliant)
- Metode: Transfer bank (BCA, Mandiri, BNI, BRI), QRIS, GoPay, OVO, ShopeePay, Kartu Kredit/Debit
- Kredit masuk otomatis setelah pembayaran dikonfirmasi

VOUCHER DISKON:
- Kode diskon 5% tersedia setiap hari di Instagram Story @feedify.id
- Format kode: FDY-XXXXX
- Setiap kode maksimal bisa diklaim oleh 5 orang per hari — cepetan follow biar tidak ketinggalan
- Kode hari ini berbeda dengan kode hari kemarin

KEBIJAKAN KONTEN:
Feedify tidak mengizinkan generate konten yang berhubungan dengan: konten dewasa/pornografi, judi/slot, rokok/tembakau, narkoba, minuman keras, kekerasan, terorisme, penipuan, atau konten yang melanggar hukum. Feedify hanya untuk brand dan bisnis yang positif dan legal.

REFERRAL PROGRAM:
Setiap akun Feedify punya kode referral masing-masing. Cek di bagian Settings akun kamu. Ajak teman bergabung lewat kode referral kamu.

HAPUS AKUN:
Untuk saat ini akun Feedify belum bisa dihapus mandiri. User tetap bisa logout kapan saja. Data akun tersimpan di sistem kami.

FITUR YANG SEDANG DIKEMBANGKAN:
- Fitur Video dan Reels sedang dalam rencana pengembangan — stay tuned

SUPPORT:
- Instagram DM: @feedify.id (untuk pertanyaan kompleks, kendala teknis, atau billing)
- Tim Feedify akan balas secepat mungkin karena setiap user adalah prioritas

CARA HANDLE SITUASI:
- User komplain / tidak puas → validasi dulu perasaan mereka, lalu arahkan DM ke @feedify.id
- User tanya kenapa kredit terpotong tapi foto tidak keluar → jelasin bahwa kredit otomatis dikembalikan kalau generate gagal, minta cek saldo kredit di dashboard
- User banding harga dengan tool lain → fokus ke value Feedify (brand consistency dari DNA, otomatis, khusus UMKM), jangan serang kompetitor
- User tanya sesuatu yang tidak kamu tahu pasti → jujur bilang tidak tahu, arahkan ke @feedify.id
- User tanya hal di luar Feedify (politik, resep, dll) → dengan ramah arahkan balik ke topik Feedify

TOLAK DENGAN SOPAN TAPI TEGAS kalau ada:
- Pertanyaan tentang cara hack, scam, tipu orang
- Permintaan konten yang melanggar hukum
- Pertanyaan tidak relevan dengan Feedify

INGAT: Jangan pernah karang jawaban kalau tidak tahu. Lebih baik jujur dan arahkan ke @feedify.id."""

@api_router.post("/chat/support")
async def support_chat(request: Request):
    """Public AI chat endpoint for landing page support bot. No auth required."""
    try:
        body = await request.json()
        message = (body.get("message") or "").strip()
        history = body.get("history") or []
        if not message:
            raise HTTPException(status_code=400, detail="Pesan tidak boleh kosong")
        if len(message) > 500:
            raise HTTPException(status_code=400, detail="Pesan terlalu panjang")

        from groq import AsyncGroq
        origin = request.headers.get("origin", "")
        groq_key = GROQ_API_KEY_LOCAL if "localhost" in origin and GROQ_API_KEY_LOCAL else GROQ_API_KEY
        client = AsyncGroq(api_key=groq_key)

        # Build messages array with history
        messages = [{"role": "system", "content": SUPPORT_SYSTEM_PROMPT}]
        for h in (history or [])[-8:]:
            role = h.get("role")
            if role in ("user", "assistant"):
                messages.append({"role": role, "content": h.get("content", "")})
        messages.append({"role": "user", "content": message})

        completion = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=300,
            temperature=0.75,
        )
        reply = completion.choices[0].message.content.strip()
        return {"reply": reply}

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Support chat error: {e}")
        return {"reply": "Waduh, ada kendala koneksi nih 😅 Coba lagi sebentar ya, atau langsung DM kita di @feedify.id kalau urgent!"}


# ============= AUTO CONSISTENCY HISTORY =============
@api_router.get("/consistency/history")
async def consistency_history(current_user: dict = Depends(get_current_user)):
    items = await db.consistency_checks.find(
        {"user_id": current_user["id"]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(100)
    return items


# ============= VOUCHERS =============
ADMIN_EMAIL = "ruijorge800.rjg@gmail.com"
DAILY_VOUCHER_MAX_CLAIMS = 5
DAILY_VOUCHER_DISCOUNT_PCT = 5

VOUCHER_CATALOG = {
    "FEEDIFY5":  {"type": "percent", "value": 5,     "label": "Diskon 5%",              "active": True, "single_use": False},
    "EARLYBIRD": {"type": "percent", "value": 10,    "label": "Diskon 10% Early Bird",  "active": True, "single_use": True},
    "FIRST50":   {"type": "flat",    "value": 50000, "label": "Diskon Rp 50.000",       "active": True, "single_use": True},
}


def _generate_daily_code() -> str:
    """Generate readable daily voucher code: FDY-XXXXX (uppercase alphanumeric, no ambiguous chars)."""
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    suffix = "".join(random.choices(chars, k=5))
    return f"FDY-{suffix}"


async def _get_or_create_daily_voucher() -> dict:
    """Return today's daily voucher doc, creating it if it doesn't exist yet."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.daily_vouchers.find_one({"date": today})
    if existing:
        existing.pop("_id", None)
        return existing
    doc = {
        "code": _generate_daily_code(),
        "date": today,
        "discount_pct": DAILY_VOUCHER_DISCOUNT_PCT,
        "max_claims": DAILY_VOUCHER_MAX_CLAIMS,
        "claimed_by": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.daily_vouchers.insert_one(doc)
    doc.pop("_id", None)
    return doc


async def _resolve_voucher(code: str, user_id: str):
    """Resolve voucher — supports: daily story (FDY-), community (COM5-), static catalog."""
    code = code.strip().upper()

    # ── Daily IG Story voucher ────────────────────────────────────────────────
    if code.startswith("FDY-"):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        voucher = await db.daily_vouchers.find_one({"code": code, "date": today})
        if not voucher:
            return None, "Kode tidak valid atau sudah kedaluwarsa (kode berlaku 1 hari)"
        claimed_by = voucher.get("claimed_by", [])
        if user_id in claimed_by:
            return None, "Kamu sudah menggunakan kode ini hari ini"
        if len(claimed_by) >= voucher["max_claims"]:
            return None, f"Kode ini sudah diklaim oleh {voucher['max_claims']} pengguna tercepat — nantikan kode baru besok di IG Story @feedify.id"
        return {
            "type": "percent",
            "value": voucher["discount_pct"],
            "label": f"Diskon {voucher['discount_pct']}% IG Story",
            "ref": f"voucher-daily-{code}",
            "_daily_code": code,
        }, None

    # ── Community voucher: COM5-{user_id[:6]} ────────────────────────────────
    if code.startswith("COM5-"):
        user = await db.users.find_one({"id": user_id})
        if not user or not user.get("community_verified"):
            return None, "Kamu belum terverifikasi di komunitas Feedify"
        expected = f"COM5-{user_id[:6].upper()}"
        if code != expected:
            return None, "Kode komunitas tidak cocok dengan akun kamu"
        already = await db.credit_transactions.find_one({"user_id": user_id, "reference_id": "voucher-community"})
        if already:
            return None, "Voucher komunitas hanya bisa dipakai sekali"
        return {"type": "percent", "value": 5, "label": "Diskon 5% Komunitas", "ref": "voucher-community"}, None

    # ── Static catalog ────────────────────────────────────────────────────────
    v = VOUCHER_CATALOG.get(code)
    if not v or not v["active"]:
        return None, "Voucher tidak valid atau sudah tidak aktif"
    if v.get("single_use"):
        already = await db.credit_transactions.find_one({"user_id": user_id, "reference_id": f"voucher-{code}"})
        if already:
            return None, "Voucher ini sudah pernah kamu gunakan"
    return {**v, "ref": f"voucher-{code}"}, None


@api_router.post("/vouchers/validate")
async def validate_voucher(body: dict, current_user: dict = Depends(get_current_user)):
    code = (body.get("code") or "").strip().upper()
    v, err = await _resolve_voucher(code, current_user["id"])
    if not v:
        raise HTTPException(status_code=404, detail=err or "Voucher tidak valid")
    return {"code": code, "type": v["type"], "value": v["value"], "label": v["label"]}


# ============= REFERRAL =============
REFERRAL_BONUS = 3  # credits per referral — change here only, never exposed to frontend

@api_router.get("/referral/my-link")
async def my_referral_link(current_user: dict = Depends(get_current_user)):
    # referral_code is stored on user doc at registration; fall back to id[:8] for old accounts
    user_doc = await db.users.find_one({"id": current_user["id"]}, {"referral_code": 1, "referral_count": 1})
    ref_code = (user_doc or {}).get("referral_code") or current_user["id"][:8].lower()
    # Back-fill referral_code for old accounts that don't have it yet
    if user_doc and not user_doc.get("referral_code"):
        await db.users.update_one({"id": current_user["id"]}, {"$set": {"referral_code": ref_code}})
    return {
        "link": f"https://feedify.id/ref/{ref_code}",
        "code": ref_code,
        "referral_count": (user_doc or {}).get("referral_count", 0),
    }

@api_router.post("/referral/apply")
async def apply_referral(body: dict, current_user: dict = Depends(get_current_user)):
    ref_code = (body.get("referral_code") or "").strip().lower()
    if not ref_code:
        raise HTTPException(status_code=400, detail="Kode referral tidak boleh kosong")
    # Find referrer by their referral_code field
    referrer = await db.users.find_one({"referral_code": ref_code})
    if not referrer:
        raise HTTPException(status_code=404, detail="Kode referral tidak ditemukan")
    if referrer.get("id") == current_user["id"]:
        raise HTTPException(status_code=400, detail="Tidak bisa pakai referral sendiri")
    # Check if this user has already used a referral (prevent double dipping)
    already = await db.credit_transactions.find_one({
        "user_id": current_user["id"], "type": "bonus", "reference_id": {"$regex": "^referral-"}
    })
    if already:
        raise HTTPException(status_code=400, detail="Kode referral hanya bisa dipakai sekali")
    # Add bonus credits to both — amount intentionally not returned to frontend
    referrer_id = referrer.get("id") or str(referrer["_id"])
    for uid in [current_user["id"], referrer_id]:
        await _add_credits(uid, REFERRAL_BONUS, f"referral-{ref_code}", "Bonus kredit referral")
    await db.users.update_one({"referral_code": ref_code}, {"$inc": {"referral_count": 1}})
    return {"ok": True, "message": "Kode referral berhasil! Kredit bonus sudah ditambahkan ke akunmu."}


XENDIT_API_KEY = os.environ.get("XENDIT_API_KEY", "")


# ============= ADMIN =============
async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Akses ditolak: hanya admin")
    return current_user


@api_router.get("/admin/daily-voucher")
async def admin_get_daily_voucher(admin_user: dict = Depends(require_admin)):
    """Return today's daily voucher code + claim stats. Admin only."""
    voucher = await _get_or_create_daily_voucher()
    claimed_by_ids = voucher.get("claimed_by", [])

    # Enrich with user info
    claimants = []
    for uid in claimed_by_ids:
        u = await db.users.find_one({"id": uid}, {"name": 1, "email": 1, "_id": 0})
        claimants.append({
            "user_id": uid,
            "name": (u or {}).get("name", ""),
            "email": (u or {}).get("email", ""),
        })

    return {
        "code": voucher["code"],
        "date": voucher["date"],
        "discount_pct": voucher["discount_pct"],
        "max_claims": voucher["max_claims"],
        "claims_used": len(claimed_by_ids),
        "claims_remaining": max(0, voucher["max_claims"] - len(claimed_by_ids)),
        "is_full": len(claimed_by_ids) >= voucher["max_claims"],
        "claimants": claimants,
    }


@api_router.post("/admin/daily-voucher/regenerate")
async def admin_regenerate_daily_voucher(admin_user: dict = Depends(require_admin)):
    """Force-generate a new code for today (replaces existing). Admin only."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    new_code = _generate_daily_code()
    await db.daily_vouchers.update_one(
        {"date": today},
        {"$set": {"code": new_code, "claimed_by": [], "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"code": new_code, "date": today, "message": "Kode baru berhasil dibuat"}


@api_router.get("/admin/users")
async def admin_list_users(
    page: int = 1,
    limit: int = 50,
    search: str = "",
    admin_user: dict = Depends(require_admin),
):
    skip = (page - 1) * limit
    query: dict = {}
    if search:
        query = {"$or": [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]}

    total = await db.users.count_documents(query)
    cursor = db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit)
    users = await cursor.to_list(length=limit)

    # Enrich each user with credit balance and content count
    enriched = []
    for u in users:
        balance = await _get_balance(u["id"])
        content_count = await db.prompts.count_documents({"user_id": u["id"]})
        has_bp = await db.brand_profiles.find_one({"user_id": u["id"]}, {"_id": 1}) is not None
        enriched.append({
            "id": u["id"],
            "name": u.get("name", ""),
            "email": u.get("email", ""),
            "role": u.get("role", "user"),
            "referral_code": u.get("referral_code", u["id"][:8].lower()),
            "referral_count": u.get("referral_count", 0),
            "created_at": u.get("created_at", ""),
            "credit_balance": balance,
            "content_count": content_count,
            "has_brand_profile": has_bp,
            "google_linked": bool(u.get("google_id")),
        })

    return {"users": enriched, "total": total, "page": page, "limit": limit}


@api_router.patch("/admin/users/{user_id}/role")
async def admin_update_role(
    user_id: str,
    body: dict,
    admin_user: dict = Depends(require_admin),
):
    new_role = body.get("role", "user")
    if new_role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Role harus 'user' atau 'admin'")
    if user_id == admin_user["id"]:
        raise HTTPException(status_code=400, detail="Tidak bisa mengubah role diri sendiri")
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": new_role}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    return {"ok": True, "user_id": user_id, "role": new_role}


@api_router.patch("/admin/users/{user_id}/credits")
async def admin_adjust_credits(
    user_id: str,
    body: dict,
    admin_user: dict = Depends(require_admin),
):
    amount = int(body.get("amount", 0))
    note = body.get("note", "Admin adjustment").strip() or "Admin adjustment"
    if amount == 0:
        raise HTTPException(status_code=400, detail="Amount tidak boleh 0")
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "name": 1, "email": 1})
    if not target:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    if amount > 0:
        new_balance = await _add_credits(
            user_id, amount,
            reference_id=f"admin-{admin_user['id']}-{now_iso()}",
            description=f"[Admin] {note}",
        )
    else:
        # Deduct — read current balance first, then set directly (avoids negative balance)
        current_doc = await db.user_credits.find_one({"user_id": user_id})
        current_balance = (current_doc or {}).get("balance", 0)
        deduct_amount = abs(amount)
        new_balance = max(0, current_balance - deduct_amount)
        await db.user_credits.update_one(
            {"user_id": user_id},
            {"$set": {"balance": new_balance, "updated_at": now_iso()}},
            upsert=True,
        )
        await db.credit_transactions.insert_one({
            "user_id": user_id,
            "type": "admin_deduct",
            "amount": -deduct_amount,
            "balance_after": new_balance,
            "reference_id": f"admin-{admin_user['id']}-{now_iso()}",
            "description": f"[Admin] {note}",
            "created_at": now_iso(),
        })
    return {"ok": True, "user_id": user_id, "new_balance": new_balance, "amount": amount}


@api_router.get("/admin/analytics")
async def admin_analytics(admin_user: dict = Depends(require_admin)):
    from datetime import datetime, timedelta, timezone
    now_dt = datetime.now(timezone.utc)
    today_start = now_dt.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_start = (now_dt - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    total_users = await db.users.count_documents({})
    new_today = await db.users.count_documents({"created_at": {"$gte": today_start}})
    new_week = await db.users.count_documents({"created_at": {"$gte": week_start}})

    total_content = await db.prompts.count_documents({})
    content_today = await db.prompts.count_documents({"created_at": {"$gte": today_start}})
    content_week = await db.prompts.count_documents({"created_at": {"$gte": week_start}})

    # Breakdown by type
    type_pipeline = [
        {"$group": {"_id": "$prompt_type", "count": {"$sum": 1}}},
    ]
    type_docs = await db.prompts.aggregate(type_pipeline).to_list(length=20)
    by_type = {d["_id"]: d["count"] for d in type_docs if d["_id"]}

    # Daily content last 7 days
    daily_pipeline = [
        {"$match": {"created_at": {"$gte": week_start}}},
        {"$group": {
            "_id": {"$substr": ["$created_at", 0, 10]},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    daily_docs = await db.prompts.aggregate(daily_pipeline).to_list(length=7)
    daily_chart = [{"date": d["_id"], "count": d["count"]} for d in daily_docs]

    # Credits issued this week
    credits_week_pipeline = [
        {"$match": {"type": "purchase", "created_at": {"$gte": week_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    credits_docs = await db.credit_transactions.aggregate(credits_week_pipeline).to_list(length=1)
    credits_issued_week = credits_docs[0]["total"] if credits_docs else 0

    return {
        "users": {"total": total_users, "new_today": new_today, "new_week": new_week},
        "content": {"total": total_content, "today": content_today, "week": content_week, "by_type": by_type},
        "daily_chart": daily_chart,
        "credits_issued_week": credits_issued_week,
    }


@api_router.get("/admin/users/{user_id}/detail")
async def admin_user_detail(user_id: str, admin_user: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    brand = await db.brand_profiles.find_one({"user_id": user_id}, {"_id": 0})
    balance = await _get_balance(user_id)

    recent_content = await db.prompts.find(
        {"user_id": user_id}, {"_id": 0, "prompt_type": 1, "created_at": 1, "product_name": 1, "headline": 1, "topic": 1}
    ).sort("created_at", -1).limit(5).to_list(length=5)

    credit_history = await db.credit_transactions.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(length=10)

    return {
        "user": {
            "id": user["id"],
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "role": user.get("role", "user"),
            "created_at": user.get("created_at", ""),
            "google_linked": bool(user.get("google_id")),
            "referral_code": user.get("referral_code", ""),
            "referral_count": user.get("referral_count", 0),
        },
        "brand": brand,
        "credit_balance": balance,
        "recent_content": recent_content,
        "credit_history": credit_history,
    }


# ============= HEALTH =============
# ============= COMMUNITY =============


@api_router.get("/community/status")
async def community_status(current_user: dict = Depends(get_current_user)):
    verified = current_user.get("community_verified", False)
    notif = await db.notification_settings.find_one({"user_id": current_user["id"]})
    has_wa = bool(notif and notif.get("whatsapp_phone"))

    voucher_code = None
    if verified:
        # Unique per-user voucher: COM5-{first 6 chars of user id uppercase}
        voucher_code = f"COM5-{current_user['id'][:6].upper()}"

    return {
        "community_verified": verified,
        "has_wa_number": has_wa,
        "whatsapp_phone": (notif.get("whatsapp_phone") if notif else None),
        "voucher_code": voucher_code,

        "discount_pct": 5,
    }


# ─── Reels Generator ─────────────────────────────────────────────────────────

REELS_CREDITS_PER_VIDEO = 3

@api_router.post("/reels/generate")
async def generate_reels(
    image: UploadFile = File(...),
    video_goal: str = Form(...),
    duration: int = Form(...),
    aspect_ratio: str = Form(...),
    current_user: dict = Depends(get_current_user),
):
    if not _REELS_ENABLED:
        raise HTTPException(status_code=503, detail="Reels feature not available — install fal-client and openai")

    # Validate image
    content_type = image.content_type or "image/jpeg"
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File harus berupa gambar")
    image_bytes = await image.read()
    if len(image_bytes) > 20 * 1024 * 1024:  # 20 MB
        raise HTTPException(status_code=400, detail="Ukuran gambar maksimal 20 MB")

    # Validate inputs
    valid_goals = {"new_launch","promo_diskon","brand_awareness","best_seller","restock","grand_opening","testimoni","edukasi_produk"}
    if video_goal not in valid_goals:
        raise HTTPException(status_code=400, detail="Video goal tidak valid")
    if duration not in (5, 8, 10):
        raise HTTPException(status_code=400, detail="Durasi harus 5, 8, atau 10 detik")
    if aspect_ratio not in ("9:16", "1:1", "4:5"):
        raise HTTPException(status_code=400, detail="Aspect ratio tidak valid")

    # Consume credits upfront (refund on failure)
    user_id = current_user["id"]
    consumed = await _consume_credit(user_id, REELS_CREDITS_PER_VIDEO, current_user.get("role", "user"))
    if not consumed:
        raise HTTPException(status_code=402, detail=f"Kredit tidak cukup — dibutuhkan {REELS_CREDITS_PER_VIDEO} kredit untuk generate video")

    try:
        result = await run_reels_pipeline(
            image_bytes=image_bytes,
            image_mime=content_type,
            video_goal=video_goal,
            duration=duration,
            aspect_ratio=aspect_ratio,
            user_id=user_id,
        )
    except Exception as e:
        # Refund credits on failure
        await _refund_credit(user_id, REELS_CREDITS_PER_VIDEO, "Refund reels generate gagal")
        raise HTTPException(status_code=500, detail=f"Gagal generate video: {str(e)}")

    # Save to MongoDB
    doc = dict(result)
    await db.video_generations.insert_one(doc)

    # Return result (exclude MongoDB _id)
    doc.pop("_id", None)
    credits_doc = await db.user_credits.find_one({"user_id": user_id}, {"_id": 0})
    return {
        "ok": True,
        "video": doc,
        "credits": _credits_summary(credits_doc),
    }


@api_router.get("/reels/history")
async def reels_history(
    limit: int = 10,
    current_user: dict = Depends(get_current_user),
):
    docs = await db.video_generations.find(
        {"user_id": current_user["id"]},
        {"_id": 0},
    ).sort("created_at", -1).limit(limit).to_list(length=limit)
    return {"videos": docs}


@api_router.get("/")
async def root():
    return {"app": "Feedify API", "status": "ok"}


# ============= MOUNT =============
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    asyncio.create_task(_reminder_loop())


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
