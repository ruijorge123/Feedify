"""
Async wrapper around pytrends (synchronous library).

All blocking calls run inside asyncio.run_in_executor so they never block
the FastAPI event loop.
"""

import asyncio
from typing import Any

try:
    from pytrends.request import TrendReq
    _PYTRENDS_AVAILABLE = True
except ImportError:
    _PYTRENDS_AVAILABLE = False

_EMPTY: dict[str, Any] = {
    "timeline": [],
    "top_keywords": [],
    "rising": [],
    "related_topics": [],
}


# ── Synchronous worker (runs in thread pool) ───────────────────────────────────

def _sync_fetch(keyword: str, geo: str) -> dict[str, Any]:
    # retries/backoff_factor omitted — pytrends passes them to urllib3.Retry
    # which dropped 'method_whitelist' in urllib3 v2, causing TypeError.
    pt = TrendReq(
        hl="id",
        tz=420,
        timeout=(10, 25),
    )
    pt.build_payload([keyword], timeframe="today 1-m", geo=geo)

    # Interest over time
    iot_df = pt.interest_over_time()
    timeline: list[dict] = []
    if not iot_df.empty and keyword in iot_df.columns:
        for ts, row in iot_df.iterrows():
            timeline.append({"date": str(ts.date()), "value": int(row[keyword])})

    # Related queries
    rq_data = pt.related_queries().get(keyword) or {}

    top_df = rq_data.get("top")
    top_keywords: list[str] = []
    if top_df is not None and not top_df.empty:
        top_keywords = top_df["query"].tolist()[:8]

    rising_df = rq_data.get("rising")
    rising: list[dict] = []
    if rising_df is not None and not rising_df.empty:
        for _, row in rising_df.head(5).iterrows():
            rising.append({
                "query": str(row["query"]),
                "value": str(row.get("value", "Breakout")),
            })

    # Related topics — Google sometimes returns empty rankedList → IndexError in pytrends
    related_topics: list[str] = []
    try:
        rt_data = pt.related_topics().get(keyword) or {}
        topics_df = rt_data.get("top")
        if topics_df is not None and not topics_df.empty and "topic_title" in topics_df.columns:
            related_topics = topics_df["topic_title"].tolist()[:6]
    except (IndexError, KeyError, Exception):
        pass

    return {
        "timeline": timeline,
        "top_keywords": top_keywords,
        "rising": rising,
        "related_topics": related_topics,
    }


# ── Public async API ───────────────────────────────────────────────────────────

class RateLimitedError(Exception):
    """Google returned 429 — caller should surface this to the user."""


async def fetch_trends(keyword: str, geo: str = "ID") -> dict[str, Any]:
    """Return trends data for *keyword*.
    Raises RateLimitedError if Google returns 429.
    Returns _EMPTY on other failures.
    """
    if not _PYTRENDS_AVAILABLE:
        return _EMPTY.copy()

    loop = asyncio.get_event_loop()
    try:
        data = await asyncio.wait_for(
            loop.run_in_executor(None, _sync_fetch, keyword, geo),
            timeout=40.0,
        )
        return data
    except Exception as e:
        # Re-raise 429 so the router can return a proper HTTP 429 to the client
        if "429" in str(e) or "TooManyRequests" in type(e).__name__:
            raise RateLimitedError(
                "Google Trends sedang membatasi request dari server ini. "
                "Coba lagi dalam beberapa menit."
            )
        return _EMPTY.copy()


def compute_scores(timeline: list[dict]) -> tuple[int, float]:
    """Return (trend_score 0-100, change_pct) from a timeline list."""
    if len(timeline) >= 14:
        recent_avg = sum(t["value"] for t in timeline[-7:]) / 7
        prev_avg   = sum(t["value"] for t in timeline[-14:-7]) / 7
        change_pct = round(((recent_avg - prev_avg) / max(prev_avg, 1)) * 100, 1)
        trend_score = round(recent_avg)
    elif timeline:
        trend_score = timeline[-1]["value"]
        change_pct  = 0.0
    else:
        trend_score = 0
        change_pct  = 0.0
    return min(trend_score, 100), change_pct


def compute_seasonality(timeline: list[dict]) -> str:
    """Classify trend variance as stable / low / medium / high."""
    if not timeline:
        return "unknown"
    values = [t["value"] for t in timeline]
    mean = sum(values) / len(values)
    if mean == 0:
        return "stable"
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    cv = (variance ** 0.5) / mean   # coefficient of variation
    if cv > 0.45:
        return "high"
    if cv > 0.25:
        return "medium"
    if cv > 0.10:
        return "low"
    return "stable"
