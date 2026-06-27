"""
GPT Video Director — converts frontend inputs into a cinematic fal.ai prompt.
Uses GPT-4o Vision to analyse the product image and craft a professional
image-to-video prompt optimised for Kling v2.5.
"""

import base64
import os
import asyncio

_GOAL_DIRECTIONS = {
    "new_launch":      "brand-new product launch — sense of debut, first impression, excitement, curiosity",
    "promo_diskon":    "promotional discount sale — urgency, value proposition, limited-time excitement",
    "brand_awareness": "brand storytelling — elegance, authenticity, emotional connection, aspirational",
    "best_seller":     "bestseller showcase — confidence, social proof, high desirability, trust",
    "restock":         "restock announcement — anticipation, pent-up demand, relief, celebration",
    "grand_opening":   "grand opening celebration — energy, festivity, warmth, community invitation",
    "testimoni":       "testimonial & social proof — authenticity, real results, trust, relatable",
    "edukasi_produk":  "product education — clarity, expert authority, discovery, informative elegance",
}

_RATIO_CONTEXT = {
    "9:16": "9:16 full-screen vertical (Instagram Reels / TikTok) — use dynamic vertical camera movements",
    "1:1":  "1:1 square format (Instagram Feed / WhatsApp Status) — centered composition, balanced motion",
    "4:5":  "4:5 portrait feed (Instagram portrait post) — slightly tall, editorial camera work",
}

_SYSTEM_PROMPT = """You are a world-class commercial video director specialising in short-form product ads for Instagram Reels and TikTok.

Your ONLY output is ONE cinematic motion prompt in English for the fal.ai Kling image-to-video model.

The prompt MUST:
- Describe: camera movement, motion intensity, lighting, atmosphere, pacing, mood
- Be 60-120 words as a flowing cinematic description (NO bullet points, NO lists)
- Be optimised for a 5-15 second commercial video
- Include the commercial direction that matches the video goal

PRODUCT PRESERVATION — always include in the prompt:
- "maintaining exact product appearance"
- "logo, label, packaging, colors, shape and proportions identical to source"
- "photorealistic product fidelity"
- Only camera motion, environmental lighting, and atmosphere are added — NEVER alter the product

Do NOT describe the product details. The model sees the image. Focus on: motion, camera, light, atmosphere, mood."""


async def build_video_prompt(
    image_bytes: bytes,
    image_mime: str,
    video_goal: str,
    duration: int,
    aspect_ratio: str,
) -> str:
    """
    Analyse the product image with GPT-4o Vision and return a cinematic
    motion prompt ready for Kling image-to-video.
    """
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required for Reels Video Director")

    try:
        from openai import AsyncOpenAI
    except ImportError:
        raise RuntimeError("openai package not installed — run: pip install openai")

    client = AsyncOpenAI(api_key=api_key)

    image_b64 = base64.b64encode(image_bytes).decode()
    commercial_direction = _GOAL_DIRECTIONS.get(video_goal, "product advertisement")
    ratio_context = _RATIO_CONTEXT.get(aspect_ratio, aspect_ratio)

    pacing_hint = (
        "punchy and immediate — every frame must count"
        if duration <= 5
        else "build momentum with layered motion — medium commercial pacing"
        if duration <= 8
        else "full cinematic arc — opening atmosphere, product focus, closing mood"
    )

    user_message = f"""Create ONE cinematic motion prompt for this product image.

Commercial direction: {commercial_direction}
Video duration: {duration} seconds ({pacing_hint})
Output format: {ratio_context}

The prompt must transform this product image into a professional advertisement video.
Match camera movement and atmosphere precisely to the commercial direction.
ALWAYS preserve product integrity — same logo, label, packaging, colors, shape."""

    def _call():
        import asyncio as _asyncio
        loop = _asyncio.new_event_loop()
        try:
            from openai import OpenAI
            sync_client = OpenAI(api_key=api_key)
            response = sync_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{image_mime};base64,{image_b64}",
                                    "detail": "high",
                                },
                            },
                            {"type": "text", "text": user_message},
                        ],
                    },
                ],
                max_tokens=300,
                temperature=0.8,
            )
            return response.choices[0].message.content.strip()
        finally:
            loop.close()

    # Run blocking OpenAI call in thread to not block FastAPI event loop
    result = await asyncio.to_thread(_call)
    return result
