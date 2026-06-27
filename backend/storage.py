"""
Storage utilities — currently a thin wrapper since videos are served
directly from fal.ai CDN URLs (no local storage needed in MVP).
Extend this module to add S3/GCS storage when needed.
"""

import asyncio
import os

try:
    import httpx
    _HTTPX_OK = True
except ImportError:
    _HTTPX_OK = False


async def download_video_bytes(video_url: str) -> bytes:
    """
    Download video from URL and return raw bytes.
    Used if you want to re-host the video instead of linking fal.ai CDN directly.
    """
    if not _HTTPX_OK:
        raise RuntimeError("httpx not installed — cannot download video")

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.get(video_url)
        response.raise_for_status()
        return response.content


def get_video_url(generation_doc: dict) -> str:
    """Return the public video URL from a generation document."""
    return generation_doc.get("video_url", "")
