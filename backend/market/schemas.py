from pydantic import BaseModel
from typing import Optional


class TimelinePoint(BaseModel):
    date: str
    value: int


class RisingQuery(BaseModel):
    query: str
    value: str


# ── Backward-compatible responses (existing endpoints) ─────────────────────────

class TrendsResponse(BaseModel):
    keyword: str
    trend_score: int
    change_pct: float
    timeline: list[TimelinePoint]
    top_keywords: list[str]
    rising: list[RisingQuery]
    ai_summary: str


class TrendingItem(BaseModel):
    keyword: str
    traffic: str           # raw string e.g. "200K+" — no fake change_pct


class TrendingResponse(BaseModel):
    trending: list[TrendingItem]


# ── New endpoints ──────────────────────────────────────────────────────────────

class CategorizedSuggestions(BaseModel):
    top: list[str]
    breakout: list[str]
    long_tail: list[str]


class SuggestResponse(BaseModel):
    keyword: str
    suggestions: list[str]              # flat (backward compat)
    categorized: CategorizedSuggestions


class TopicGroup(BaseModel):
    label: str
    topics: list[str]


class OpportunityResponse(BaseModel):
    keyword: str
    trend_score: int
    demand_score: int
    competition_score: int
    content_potential: int
    confidence: int                     # 0-100: data reliability signal
    seasonality: str                    # "stable" | "low" | "medium" | "high" | "unknown"
    risk_flags: list[str]               # e.g. ["High Competition", "Seasonal", "Declining"]
    related_keywords: list[str]
    related_topics: list[str]           # flat (backward compat)
    topic_groups: list[TopicGroup]      # grouped by category
    ai_summary: str
    content_ideas: list[str]
    campaign_ideas: list[str]
    recommended_generator: str          # "banner" | "carousel" | "reels" | "copywriting"
