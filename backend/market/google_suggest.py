"""
Google Suggest (autocomplete) client.

Endpoint: https://suggestqueries.google.com/complete/search
Output format "firefox" returns clean JSON: ["query", ["s1", "s2", ...]]
No API key required.
"""

import asyncio
import json

try:
    import httpx
    _HTTPX_AVAILABLE = True
except ImportError:
    _HTTPX_AVAILABLE = False

_SUGGEST_URL = "https://suggestqueries.google.com/complete/search"
_TIMEOUT = 8.0
_RETRIES = 2


async def fetch_suggestions(
    keyword: str,
    geo: str = "ID",
    hl: str = "id",
) -> list[str]:
    """Return up to 10 Google autocomplete suggestions. Never raises."""
    if not _HTTPX_AVAILABLE:
        return []

    params = {
        "client": "firefox",
        "q": keyword,
        "hl": hl,
        "gl": geo.lower(),
    }

    last_err: Exception | None = None
    for attempt in range(_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                r = await client.get(_SUGGEST_URL, params=params)
                r.raise_for_status()
                data = r.json()
                suggestions = data[1] if len(data) > 1 else []
                return [str(s) for s in suggestions[:10]]
        except Exception as exc:
            last_err = exc
            if attempt < _RETRIES:
                await asyncio.sleep(0.4 * (attempt + 1))

    return []
