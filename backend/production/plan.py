"""Pure logic for Produksi Batch: who gets which slot, and the prompt for each slot.

No database and no network — everything here is a function of the brief, so it
can be tested without a server.

The image prompt is assembled here deterministically, never written by an LLM.
Groq only writes words a human will read (idea, on-image text, caption); letting
it author the prompt itself is how brand colours drift and labels get respelled.
"""

import json
from typing import Dict, List, Optional

TIPE_LABEL = {
    "awareness": "Perkenalan",
    "soft_selling": "Soft selling",
    "education": "Edukasi",
    "testimonial": "Testimoni",
    "promo": "Promo",
    "engagement": "Interaksi",
}

# What each content type should achieve, phrased for the image model.
TIPE_ARAH = {
    "awareness": "Introduce the product and the brand's feel. The product is the hero; calm and memorable.",
    "soft_selling": "Show the product in a desirable everyday moment. Aspirational, never pushy.",
    "education": "Teach one useful thing about the product (an ingredient, a benefit, how to use it). Clear, informative layout.",
    "testimonial": "Social-proof mood: the product in a trusted, lived-in setting, with room for a short quote.",
    "promo": "Promotional post. The product is clear and prominent, with a strong, clean headline area.",
    "engagement": "Invite interaction (a question or a choice). Playful but on-brand.",
}

CAMPURAN = {
    "seimbang": {"label": "Seimbang", "persen": {"awareness": 30, "soft_selling": 30, "education": 20, "testimonial": 10, "promo": 10}},
    "jualan": {"label": "Fokus jualan", "persen": {"awareness": 15, "soft_selling": 30, "promo": 30, "testimonial": 15, "education": 10}},
    "brand_baru": {"label": "Brand baru", "persen": {"awareness": 45, "education": 25, "soft_selling": 20, "testimonial": 10}},
}

MAX_GAYA = 5
MAX_JUMLAH = 60


def largest_remainder(weights: Dict[str, float], total: int) -> Dict[str, int]:
    """Split `total` across keys in proportion to `weights`, summing exactly to total."""
    positive = {k: w for k, w in weights.items() if w and w > 0}
    s = sum(positive.values())
    if total <= 0 or s <= 0:
        return {k: 0 for k in weights}
    raw = {k: w / s * total for k, w in positive.items()}
    out = {k: int(v) for k, v in raw.items()}
    left = total - sum(out.values())
    for k in sorted(raw, key=lambda k: raw[k] - out[k], reverse=True)[:left]:
        out[k] += 1
    return out


def spread(counts: Dict[str, int]) -> List[str]:
    """Smooth weighted round-robin: each key appears exactly `counts[k]` times,
    interleaved so the same product or type rarely lands twice in a row — which
    is what keeps any 3×3 window of the finished grid from looking repetitive."""
    weights = {k: v for k, v in counts.items() if v > 0}
    total = sum(weights.values())
    current = {k: 0 for k in weights}
    order = list(weights)
    out = []
    for _ in range(total):
        for k in order:
            current[k] += weights[k]
        pick = max(order, key=lambda k: current[k])
        current[pick] -= total
        out.append(pick)
    return out


def susun_rencana(jumlah: int, products: List[dict], persen: Dict[str, int], gaya: List[dict]) -> List[dict]:
    """Lay out `jumlah` empty slots: product, content type and inspiration per slot."""
    jumlah = max(1, min(MAX_JUMLAH, int(jumlah)))

    by_id = {p["id"]: p for p in products}
    alloc = {p["id"]: int(p.get("allocation") or 0) for p in products}
    if not any(alloc.values()):
        alloc = {pid: 1 for pid in by_id}  # nothing allocated yet: split evenly
    produk_urut = spread(largest_remainder(alloc, jumlah)) if by_id else [None] * jumlah

    tipe_urut = spread(largest_remainder(persen, jumlah))
    if len(tipe_urut) < jumlah:  # empty mix: fall back to awareness
        tipe_urut += ["awareness"] * (jumlah - len(tipe_urut))

    rows = []
    for i in range(jumlah):
        pid = produk_urut[i] if i < len(produk_urut) else None
        # Rotate the style one step every full cycle so a product is not pinned to
        # the same inspiration when the product and style counts line up.
        g = gaya[(i + i // len(gaya)) % len(gaya)]["id"] if gaya else None
        rows.append({
            "no": i + 1,
            "product_id": pid,
            "product_name": (by_id.get(pid) or {}).get("name", "") if pid else "",
            "tipe": tipe_urut[i],
            "gaya_id": g,
            "ide": "",
            "teks": "",
            "perubahan": "",
            "caption": "",
            "diisi_ai": False,
        })
    return rows


def _warna(brand: dict) -> List[str]:
    colors = [c for c in (brand.get("colors") or []) if c]
    if not colors:
        colors = [c for c in (brand.get("color_primary"), brand.get("color_secondary"), brand.get("color_accent")) if c]
    return colors[:3]


def _baris_teks(teks: str) -> List[str]:
    return [t.strip() for t in (teks or "").split("\n") if t.strip()]


def bangun_prompt(row: dict, brand: dict, product: Optional[dict], gaya: Optional[dict]) -> str:
    """The JSON the owner pastes into ChatGPT, with the inspiration and product
    photo attached. Instructions are in English because the image model follows
    English directives most reliably; the on-image text stays exactly as typed."""
    teks = _baris_teks(row.get("teks", ""))
    ada_gaya = bool(gaya)
    product_name = (product or {}).get("name") or row.get("product_name") or "the product"

    if ada_gaya:
        task = (f"Recreate the design of IMAGE 1 (inspiration) as a brand-new Instagram feed post "
                f"for {product_name}, the product shown in IMAGE 2.")
        attachments = {
            "image_1_inspiration": "Follow its layout, camera angle, composition, lighting direction and "
                                   "text placement. Do NOT copy its product, brand name, wording or colours.",
            "image_2_product": "The client's real product. Reproduce it exactly: shape, packaging, label "
                               "text and logo. Never redraw, translate or re-spell the label.",
        }
    else:
        task = f"Create a new Instagram feed post for {product_name}, the product shown in the attached image."
        attachments = {
            "image_1_product": "The client's real product. Reproduce it exactly: shape, packaging, label "
                               "text and logo. Never redraw, translate or re-spell the label.",
        }

    brand_block = {
        "name": brand.get("brand_name") or "",
        "category": brand.get("category") or "",
        "colors": _warna(brand),
        "mood": brand.get("mood") or "",
        "lighting": brand.get("lighting") or "",
        "materials_and_surfaces": brand.get("materials") or [],
        "composition_preference": brand.get("composition") or "",
        "target_audience": brand.get("target_audience") or "",
        "notes": brand.get("notes") or "",
    }
    brand_block = {k: v for k, v in brand_block.items() if v}

    post = {
        "number": row.get("no"),
        "content_type": TIPE_LABEL.get(row.get("tipe"), row.get("tipe") or ""),
        "direction": TIPE_ARAH.get(row.get("tipe"), ""),
    }
    if row.get("ide"):
        post["idea"] = row["ide"]
    if ada_gaya and gaya.get("description"):
        post["inspiration_notes"] = gaya["description"]

    if teks:
        text_block = {
            "lines": teks,
            "rule": "Render every line EXACTLY as written: same spelling, capitalisation and punctuation. "
                    "Place them where the inspiration has its text. Add no other text.",
        }
    else:
        text_block = {"lines": [], "rule": "Do not put any text on the image."}

    avoid = [d for d in (brand.get("donts") or []) if d]
    if brand.get("donts_notes"):
        avoid.append(brand["donts_notes"])
    avoid += [
        "watermarks or signatures",
        "any text other than text_on_image.lines",
        "misspelled, redrawn or altered product labels",
        "extra logos or brand names",
    ]
    if ada_gaya:
        avoid.append("the inspiration image's product, brand name or wording")

    out = {
        "task": task,
        "attached_images": attachments,
        "brand": brand_block,
        "product": {k: v for k, v in {
            "name": product_name,
            "description": (product or {}).get("description") or "",
        }.items() if v},
        "post": post,
        "text_on_image": text_block,
    }
    if (row.get("perubahan") or "").strip():
        out["other_changes"] = row["perubahan"].strip()
    out["avoid"] = avoid
    out["output"] = {
        "format": "Instagram feed post, portrait 4:5 (1080×1350 px)",
        "quality": "Premium commercial product photography, photorealistic, sharp readable product label.",
        "colors": "Use the brand colours for background, props and typography. Ignore the inspiration's "
                  "colours unless they already match the brand.",
    }
    return json.dumps(out, indent=2, ensure_ascii=False)
