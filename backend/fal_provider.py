"""
fal.ai provider — abstraction layer for image-to-video generation.
Provider: Kling v2.5-turbo/pro via fal-ai.
Swap the MODEL_ID and argument mapping here if the provider changes.
"""

import io
import os
import asyncio
import tempfile

# fal.ai Kling model — only change this line to switch provider
_MODEL_ID = "fal-ai/kling-video/v2.5-turbo/pro/image-to-video"

# Kling supports 5s and 10s; map 8s → 10s
_DURATION_MAP = {5: "5", 8: "10", 10: "10"}

# fal.ai Kling supported aspect ratios (4:5 not natively supported → use 9:16)
_RATIO_MAP = {
    "9:16": "9:16",
    "1:1":  "1:1",
    "4:5":  "9:16",
}


def _ensure_fal():
    try:
        import fal_client
        return fal_client
    except ImportError:
        raise RuntimeError("fal-client not installed — run: pip install fal-client")


def _check_fal_key():
    key = os.getenv("FAL_KEY")
    if not key:
        raise RuntimeError("FAL_KEY environment variable is required for video generation")
    os.environ["FAL_KEY"] = key  # ensure fal_client picks it up


async def upload_image(image_bytes: bytes, content_type: str = "image/png") -> str:
    """Upload image bytes to fal.ai CDN and return the public URL."""
    _check_fal_key()
    fal_client = _ensure_fal()

    suffix = ".jpg" if "jpeg" in content_type else f".{content_type.split('/')[-1]}"

    def _upload():
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name
        try:
            return fal_client.upload_file(tmp_path)
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    return await asyncio.to_thread(_upload)


async def generate_video(
    image_url: str,
    prompt: str,
    duration: int,
    aspect_ratio: str,
    negative_prompt: str = "blurry, distorted product, changed logo, altered packaging, morphed shape, low quality",
) -> dict:
    """
    Run Kling image-to-video generation.
    Returns: { video_url, duration, file_size, content_type, provider_meta }
    """
    _check_fal_key()
    fal_client = _ensure_fal()

    fal_duration = _DURATION_MAP.get(duration, "5")
    fal_ratio = _RATIO_MAP.get(aspect_ratio, "9:16")

    arguments = {
        "image_url": image_url,
        "prompt": prompt,
        "duration": fal_duration,
        "aspect_ratio": fal_ratio,
        "negative_prompt": negative_prompt,
    }

    def _run():
        return fal_client.run(_MODEL_ID, arguments=arguments)

    result = await asyncio.to_thread(_run)

    video_data = result.get("video", {})
    if not video_data.get("url"):
        raise RuntimeError(f"fal.ai returned no video URL. Response: {result}")

    return {
        "video_url": video_data["url"],
        "duration_actual": video_data.get("duration", duration),
        "file_size": video_data.get("file_size", 0),
        "content_type": video_data.get("content_type", "video/mp4"),
        "fal_model": _MODEL_ID,
        "fal_ratio": fal_ratio,
        "fal_duration": fal_duration,
    }
