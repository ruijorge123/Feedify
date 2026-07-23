"""
Async-safe TTL cache.

Singletons per data type:
  trending_cache    — 30 min
  keyword_cache     — 6 hours
  suggest_cache     — 12 hours
  opportunity_cache — 6 hours
"""

import asyncio
import time
from typing import Any, Optional


class AsyncTTLCache:
    """In-process async TTL cache backed by a plain dict + monotonic clock."""

    def __init__(self, ttl_seconds: int) -> None:
        self._ttl = ttl_seconds
        self._store: dict[str, tuple[Any, float]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if time.monotonic() < expires_at:
                return value
            del self._store[key]
            return None

    async def set(self, key: str, value: Any) -> None:
        async with self._lock:
            self._store[key] = (value, time.monotonic() + self._ttl)

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._store.pop(key, None)

    async def purge_expired(self) -> int:
        """Remove stale entries. Returns number of evictions."""
        now = time.monotonic()
        async with self._lock:
            stale = [k for k, (_, exp) in self._store.items() if now >= exp]
            for k in stale:
                del self._store[k]
            return len(stale)


# ── Singletons ─────────────────────────────────────────────────────────────────

trending_cache    = AsyncTTLCache(ttl_seconds=30 * 60)        # 30 min
keyword_cache     = AsyncTTLCache(ttl_seconds=6 * 60 * 60)    # 6 h
suggest_cache     = AsyncTTLCache(ttl_seconds=12 * 60 * 60)   # 12 h
opportunity_cache = AsyncTTLCache(ttl_seconds=6 * 60 * 60)    # 6 h

_ALL_CACHES = [trending_cache, keyword_cache, suggest_cache, opportunity_cache]


# ── Background cleanup ─────────────────────────────────────────────────────────

async def _cleanup_loop(interval: int = 1800) -> None:
    """Purge expired entries from all caches every `interval` seconds."""
    while True:
        await asyncio.sleep(interval)
        for cache in _ALL_CACHES:
            await cache.purge_expired()


def start_cache_cleanup(interval: int = 1800) -> None:
    """Schedule background cache cleanup. Call once at app startup."""
    asyncio.create_task(_cleanup_loop(interval))
