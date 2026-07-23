"""
Google Daily Trending Searches — public RSS feed.

URL: https://trends.google.com/trending/rss?geo=ID
No API key, no auth.
"""

import asyncio
import xml.etree.ElementTree as ET

try:
    import httpx
    _HTTPX_AVAILABLE = True
except ImportError:
    _HTTPX_AVAILABLE = False

_RSS_URL = "https://trends.google.com/trending/rss"
_TIMEOUT = 15.0
_RETRIES = 2
_NS      = {"ht": "https://trends.google.com/trending/rss"}


async def fetch_trending(geo: str = "ID", limit: int = 10) -> list[dict]:
    """Fetch top trending searches from Google RSS. Never raises."""
    if not _HTTPX_AVAILABLE:
        return []

    last_err: Exception | None = None
    for attempt in range(_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                r = await client.get(_RSS_URL, params={"geo": geo})
                r.raise_for_status()
            break
        except Exception as exc:
            last_err = exc
            if attempt < _RETRIES:
                await asyncio.sleep(0.5 * (attempt + 1))
    else:
        return []

    try:
        root = ET.fromstring(r.text)
    except ET.ParseError:
        return []

    result: list[dict] = []
    for item in root.findall(".//item")[:limit]:
        title   = item.findtext("title", "").strip()
        traffic = item.findtext("ht:approx_traffic", "0", _NS).strip() or "0"
        if not title:
            continue
        result.append({
            "keyword": title,
            "traffic": traffic,
        })

    return result
