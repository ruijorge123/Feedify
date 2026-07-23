"""
AI Market Intelligence router.

Registered from server.py via:
    from market.router import build_router
    api_router.include_router(build_router(get_current_user))
"""

from __future__ import annotations

from datetime import date as _date
from typing import Callable

from fastapi import APIRouter, Depends, HTTPException, Query

from .cache import keyword_cache, opportunity_cache, suggest_cache, trending_cache
from .google_rss import fetch_trending
from .google_suggest import fetch_suggestions
from .google_trends import (
    RateLimitedError,
    compute_scores,
    compute_seasonality,
    fetch_trends,
)
from .ai_summary import (
    build_opportunity_summary,
    build_trends_summary,
    categorize_suggestions,
    compute_competition_score,
    compute_confidence,
    compute_content_potential,
    compute_demand_score,
    compute_risk_flags,
    generate_campaign_ideas,
    generate_content_ideas,
    group_topics,
    recommend_generator,
)
from .schemas import (
    CategorizedSuggestions,
    OpportunityResponse,
    SuggestResponse,
    TopicGroup,
    TrendingResponse,
    TrendsResponse,
)


_DAILY_LIMIT = 3


async def _check_daily_limit(db, uid: str, limit: int) -> int:
    """Raise 429 if today's usage is already at/over limit. Does NOT increment — call
    _increment_daily only after a report actually succeeds, so a failed upstream
    Google Trends call (rate-limited) doesn't burn the user's daily quota for nothing."""
    today = str(_date.today())
    doc = await db["users"].find_one({"id": uid}, {"market_research_daily": 1})
    daily = (doc or {}).get("market_research_daily", {})
    used = daily.get("count", 0) if daily.get("date") == today else 0
    if used >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Batas riset pasar harian ({limit}x) sudah habis. Reset otomatis besok pukul 00.00.",
        )
    return used


async def _increment_daily(db, uid: str):
    today = str(_date.today())
    doc = await db["users"].find_one({"id": uid}, {"market_research_daily": 1})
    daily = (doc or {}).get("market_research_daily", {})
    if daily.get("date") == today:
        await db["users"].update_one({"id": uid}, {"$inc": {"market_research_daily.count": 1}})
    else:
        await db["users"].update_one({"id": uid}, {"$set": {"market_research_daily": {"date": today, "count": 1}}})


def build_router(get_current_user: Callable, db) -> APIRouter:
    router = APIRouter(prefix="/market-intelligence", tags=["market-intelligence"])

    # ── GET /usage ─────────────────────────────────────────────────────────────

    @router.get("/usage")
    async def get_daily_usage(user: dict = Depends(get_current_user)):
        """Return today's market research usage count for the current user."""
        today = str(_date.today())
        doc = await db["users"].find_one({"id": user["id"]}, {"market_research_daily": 1})
        daily = (doc or {}).get("market_research_daily", {})
        used = daily.get("count", 0) if daily.get("date") == today else 0
        remaining = max(0, _DAILY_LIMIT - used)
        return {"used": used, "limit": _DAILY_LIMIT, "remaining": remaining}

    # ── GET /trends ────────────────────────────────────────────────────────────

    @router.get("/trends", response_model=TrendsResponse)
    async def get_market_trends(
        q: str = Query(..., min_length=1, max_length=100),
        _user: dict = Depends(get_current_user),
    ):
        """Interest over time + related queries for a keyword (cached 6h)."""
        key = f"trends:{q.strip().lower()}"
        cached = await keyword_cache.get(key)
        if cached:
            return cached

        try:
            raw = await fetch_trends(q.strip())
        except RateLimitedError as e:
            raise HTTPException(status_code=429, detail=str(e))
        trend_score, change_pct = compute_scores(raw["timeline"])

        result = TrendsResponse(
            keyword      = q.strip(),
            trend_score  = trend_score,
            change_pct   = change_pct,
            timeline     = raw["timeline"],
            top_keywords = raw["top_keywords"],
            rising       = raw["rising"],
            ai_summary   = build_trends_summary(
                q.strip(),
                trend_score,
                change_pct,
                raw["rising"],
                raw["top_keywords"],
            ),
        )
        await keyword_cache.set(key, result)
        return result

    # ── GET /trending ──────────────────────────────────────────────────────────

    @router.get("/trending", response_model=TrendingResponse)
    async def get_trending_now(
        geo: str = Query("ID", min_length=2, max_length=2),
        _user: dict = Depends(get_current_user),
    ):
        """Top trending searches in Indonesia (cached 30 min)."""
        key = f"trending:{geo.upper()}"
        cached = await trending_cache.get(key)
        if cached:
            return cached

        items = await fetch_trending(geo=geo.upper(), limit=10)
        result = TrendingResponse(trending=items)
        if items:
            await trending_cache.set(key, result)
        return result

    # ── GET /suggest ───────────────────────────────────────────────────────────

    @router.get("/suggest", response_model=SuggestResponse)
    async def get_suggestions(
        q: str = Query(..., min_length=1, max_length=100),
        _user: dict = Depends(get_current_user),
    ):
        """Google autocomplete suggestions, categorized (cached 12h)."""
        key = f"suggest:{q.strip().lower()}"
        cached = await suggest_cache.get(key)
        if cached:
            return cached

        suggestions = await fetch_suggestions(q.strip())
        cats = categorize_suggestions(suggestions, rising=[])
        result = SuggestResponse(
            keyword      = q.strip(),
            suggestions  = suggestions,
            categorized  = CategorizedSuggestions(**cats),
        )
        if suggestions:
            await suggest_cache.set(key, result)
        return result

    # ── GET /opportunity ───────────────────────────────────────────────────────

    @router.get("/opportunity", response_model=OpportunityResponse)
    async def get_opportunity(
        q: str = Query(..., min_length=1, max_length=100),
        user: dict = Depends(get_current_user),
    ):
        """
        Full market opportunity analysis:
        trend score, demand, competition, content potential,
        confidence, risk flags, topic groups, content ideas, campaign ideas.
        Cached 6h. No paid API. Daily limit: 3x per user.
        """
        # Check daily limit before anything else (including cache) — increment only on success
        await _check_daily_limit(db, user["id"], _DAILY_LIMIT)

        keyword = q.strip()
        key = f"opportunity:{keyword.lower()}"
        cached = await opportunity_cache.get(key)
        if cached:
            await _increment_daily(db, user["id"])
            return cached

        # Fetch trends (re-use from keyword_cache if available)
        trend_key = f"trends:{keyword.lower()}"
        raw_cached = await keyword_cache.get(trend_key)
        if raw_cached is None:
            try:
                raw_data = await fetch_trends(keyword)
            except RateLimitedError as e:
                raise HTTPException(status_code=429, detail=str(e))
        else:
            raw_data = {
                "timeline":       [t.model_dump() for t in raw_cached.timeline],
                "top_keywords":   raw_cached.top_keywords,
                "rising":         [r.model_dump() for r in raw_cached.rising],
                "related_topics": [],
            }

        # Fetch suggestions (re-use from suggest_cache if available)
        suggest_key = f"suggest:{keyword.lower()}"
        suggest_cached = await suggest_cache.get(suggest_key)
        if suggest_cached is None:
            suggestions = await fetch_suggestions(keyword)
        else:
            suggestions = suggest_cached.suggestions

        # Scores
        trend_score, change_pct = compute_scores(raw_data["timeline"])
        seasonality             = compute_seasonality(raw_data["timeline"])
        demand_score            = compute_demand_score(
            trend_score,
            change_pct,
            raw_data["rising"],
            raw_data["top_keywords"],
            raw_data["timeline"],
        )
        competition_score       = compute_competition_score(
            trend_score, raw_data["top_keywords"]
        )
        content_potential       = compute_content_potential(
            trend_score, demand_score, competition_score
        )
        confidence              = compute_confidence(
            raw_data["timeline"],
            raw_data["rising"],
            raw_data["top_keywords"],
            suggestions,
        )
        risk_flags              = compute_risk_flags(
            change_pct, competition_score, seasonality
        )

        # Related keywords: top_keywords + suggestions, deduplicated
        related_keywords = list(dict.fromkeys(
            raw_data["top_keywords"] + suggestions
        ))[:10]

        # Related topics: flat + grouped
        raw_topics   = raw_data.get("related_topics", [])
        topic_groups = group_topics(raw_topics)

        # Categorized suggestions (enrich with rising from trends)
        cats = categorize_suggestions(suggestions, raw_data["rising"])

        result = OpportunityResponse(
            keyword               = keyword,
            trend_score           = trend_score,
            demand_score          = demand_score,
            competition_score     = competition_score,
            content_potential     = content_potential,
            confidence            = confidence,
            seasonality           = seasonality,
            risk_flags            = risk_flags,
            related_keywords      = related_keywords,
            related_topics        = raw_topics,
            topic_groups          = [TopicGroup(**g) for g in topic_groups],
            ai_summary            = build_opportunity_summary(
                keyword, trend_score, demand_score,
                competition_score, content_potential, seasonality,
            ),
            content_ideas         = generate_content_ideas(keyword, change_pct),
            campaign_ideas        = generate_campaign_ideas(keyword),
            recommended_generator = recommend_generator(
                trend_score, content_potential, change_pct
            ),
        )
        await opportunity_cache.set(key, result)
        await _increment_daily(db, user["id"])
        return result

    return router
