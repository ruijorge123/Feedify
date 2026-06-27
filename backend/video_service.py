"""
Video Service — orchestrates the full Reels generation pipeline:
  1. Upload image → fal.ai CDN (get public URL)
  2. GPT-4o Video Director → cinematic prompt
  3. fal.ai Kling → video URL
  4. Return result dict (saved to MongoDB by caller)

This is the single entry point for all video generation logic.
"""

import uuid
from datetime import datetime, timezone

from gpt_video_director import build_video_prompt
from fal_provider import upload_image, generate_video

_GOAL_LABELS = {
    "new_launch":      "New Launch",
    "promo_diskon":    "Promo Diskon",
    "brand_awareness": "Brand Awareness",
    "best_seller":     "Best Seller",
    "restock":         "Restock",
    "grand_opening":   "Grand Opening",
    "testimoni":       "Testimoni",
    "edukasi_produk":  "Edukasi Produk",
}


async def run_reels_pipeline(
    image_bytes: bytes,
    image_mime: str,
    video_goal: str,
    duration: int,
    aspect_ratio: str,
    user_id: str,
) -> dict:
    """
    Full pipeline: product image → GPT prompt → fal.ai Kling → video result.
    Returns a dict ready to save to MongoDB and return to frontend.
    Raises exceptions on failure; caller handles credit refunds.
    """
    # Step 1: Upload image to fal.ai CDN (video model requires a URL, not raw bytes)
    image_url = await upload_image(image_bytes, content_type=image_mime)

    # Step 2: GPT-4o Video Director — build cinematic motion prompt
    video_prompt = await build_video_prompt(
        image_bytes=image_bytes,
        image_mime=image_mime,
        video_goal=video_goal,
        duration=duration,
        aspect_ratio=aspect_ratio,
    )

    # Step 3: fal.ai Kling — image-to-video generation
    video_result = await generate_video(
        image_url=image_url,
        prompt=video_prompt,
        duration=duration,
        aspect_ratio=aspect_ratio,
    )

    return {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "video_url": video_result["video_url"],
        "video_goal": video_goal,
        "video_goal_label": _GOAL_LABELS.get(video_goal, video_goal),
        "duration": duration,
        "aspect_ratio": aspect_ratio,
        "prompt_used": video_prompt,
        "source_image_url": image_url,
        "provider": {
            "model": video_result.get("fal_model"),
            "fal_ratio": video_result.get("fal_ratio"),
            "fal_duration": video_result.get("fal_duration"),
            "file_size": video_result.get("file_size"),
            "content_type": video_result.get("content_type"),
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
