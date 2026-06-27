"""Feedify iteration-2 backend tests.

Covers new endpoints:
- POST /api/prompt/generate-food-menu (food menu builder)
- POST /api/consistency/check (Gemini Vision; requires brand profile)
- GET/POST /api/grid-planner (upsert single layout per user, max 9 slots)
- GET/POST/PATCH/DELETE /api/calendar (+ month filter)
- GET /api/stats now includes food_menu count
"""
import uuid
import pytest
import requests


# ============= F&B MENU =============
class TestFoodMenu:
    def test_generate_food_menu_returns_structure_and_saves(self, session, api_url, auth_headers):
        payload = {
            "menu_name": "TEST Lunch Specials",
            "items": [
                {"name": "Nasi Goreng Spesial", "description": "With egg & krupuk", "price": "35k"},
                {"name": "Es Teh Manis", "description": "Iced tea", "price": "8k"},
            ],
            "mood": "modern",
            "layout": "multi-grid",
            "aspect_ratio": "4:5 (Portrait Feed)",
            "call_to_action": "Pesan via WA",
            "headline": "Menu Siang Hemat",
            "save": True,
        }
        r = session.post(f"{api_url}/prompt/generate-food-menu", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "prompt_json" in body and "id" in body and body["id"]
        prompt = body["prompt_json"]
        assert prompt["task_type"] == "commercial_food_menu_visual_generation"
        ps = prompt["prompt_structure"]
        # menu_items array present with our 2 items
        assert "menu_items" in ps and isinstance(ps["menu_items"], list)
        assert len(ps["menu_items"]) == 2
        assert ps["menu_items"][0]["name"] == "Nasi Goreng Spesial"
        # mood-specific lighting/aesthetic/props for 'modern'
        vsd = ps["visual_style_details"]
        assert "marble" in vsd["aesthetic_keywords"].lower() or "minimal" in vsd["aesthetic_keywords"].lower()
        assert "lighting_setup" in vsd and len(vsd["lighting_setup"]) > 5
        assert "props_and_styling" in vsd
        # instructions returned
        assert isinstance(body.get("instructions"), list) and len(body["instructions"]) >= 3

    def test_food_menu_saved_in_history(self, session, api_url, auth_headers):
        r = session.get(f"{api_url}/prompts?dashboard_type=food-menu", headers=auth_headers)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) >= 1
        assert all(it["dashboard_type"] == "food-menu" for it in items)
        assert any("TEST Lunch Specials" in it.get("title", "") for it in items)

    def test_food_menu_requires_auth(self, api_url):
        r = requests.post(f"{api_url}/prompt/generate-food-menu",
                          json={"menu_name": "x", "items": [], "save": False})
        assert r.status_code in (401, 403)


# ============= STATS now includes food_menu =============
class TestStatsFoodMenu:
    def test_stats_includes_food_menu_count(self, session, api_url, auth_headers):
        r = session.get(f"{api_url}/stats", headers=auth_headers)
        assert r.status_code == 200
        s = r.json()
        assert "food_menu" in s
        assert isinstance(s["food_menu"], int)
        assert s["food_menu"] >= 1  # we created one above


# ============= CONSISTENCY CHECKER =============
class TestConsistencyChecker:
    def test_consistency_check_without_brand_profile_returns_400(self, session, api_url, sample_jpeg_base64):
        # Fresh user without brand profile
        email = f"TEST_nobrand_{uuid.uuid4().hex[:8]}@feedifyqa.io"
        rr = session.post(f"{api_url}/auth/register",
                          json={"email": email, "password": "Demo1234!", "name": "NoBrand"})
        assert rr.status_code == 200
        tok = rr.json()["token"]
        hdr = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
        r = session.post(f"{api_url}/consistency/check",
                         json={"image_base64": sample_jpeg_base64, "mime_type": "image/jpeg"},
                         headers=hdr)
        assert r.status_code == 400, r.text
        detail = r.json().get("detail", "")
        assert "brand profile" in detail.lower() or "belum dibuat" in detail.lower()

    def test_consistency_check_with_brand_returns_scores(self, session, api_url, auth_headers, sample_jpeg_base64):
        # Ensure brand profile exists for the primary registered_user
        bp = {
            "brand_name": "TEST Kopi Nusantara",
            "category": "F&B",
            "description": "Kopi arabika premium dari Aceh",
            "color_primary": "#1A4F3A",
            "color_secondary": "#FFF8E7",
            "color_accent": "#D4A24E",
            "visual_style": "minimal-clean",
            "tone": "premium",
        }
        session.post(f"{api_url}/brand-profile", json=bp, headers=auth_headers)
        payload = {
            "image_base64": sample_jpeg_base64,
            "mime_type": "image/jpeg",
            "note": "Test image of coffee cup",
        }
        r = session.post(f"{api_url}/consistency/check", json=payload, headers=auth_headers, timeout=120)
        assert r.status_code == 200, f"{r.status_code} {r.text[:500]}"
        data = r.json()
        if "error" in data:
            pytest.fail(f"LLM parse failure: {data}")
        # Required keys
        for k in ("overall_score", "color_score", "mood_score", "composition_score",
                  "typography_score", "summary", "strengths", "weaknesses",
                  "actionable_tips", "detected_dominant_colors", "alignment_verdict"):
            assert k in data, f"Missing key {k}; got {list(data.keys())[:15]}"
        # Score ranges
        for k in ("overall_score", "color_score", "mood_score", "composition_score", "typography_score"):
            v = data[k]
            assert isinstance(v, (int, float)) and 0 <= v <= 100, f"{k}={v}"
        assert isinstance(data["strengths"], list)
        assert isinstance(data["weaknesses"], list)
        assert isinstance(data["actionable_tips"], list)
        assert isinstance(data["detected_dominant_colors"], list)

    def test_consistency_requires_auth(self, api_url, sample_jpeg_base64):
        r = requests.post(f"{api_url}/consistency/check",
                          json={"image_base64": sample_jpeg_base64, "mime_type": "image/jpeg"})
        assert r.status_code in (401, 403)


# ============= GRID PLANNER =============
class TestGridPlanner:
    def test_grid_planner_initially_null(self, session, api_url):
        # Fresh user => no layout yet
        email = f"TEST_grid_{uuid.uuid4().hex[:8]}@feedifyqa.io"
        rr = session.post(f"{api_url}/auth/register",
                          json={"email": email, "password": "Demo1234!", "name": "GridUser"})
        tok = rr.json()["token"]
        hdr = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
        # Stash on class for next tests
        TestGridPlanner._hdr = hdr
        r = session.get(f"{api_url}/grid-planner", headers=hdr)
        assert r.status_code == 200
        assert r.json() is None

    def test_grid_planner_save_9_slots(self, session, api_url):
        hdr = TestGridPlanner._hdr
        slots = [{"slot_index": i, "label": f"Post {i}", "note": f"note {i}",
                  "color_tag": "#FF0000" if i == 0 else "#00FF00"} for i in range(9)]
        r = session.post(f"{api_url}/grid-planner",
                         json={"name": "My Grid", "slots": slots}, headers=hdr)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["name"] == "My Grid"
        assert len(body["slots"]) == 9
        assert body["slots"][0]["label"] == "Post 0"

    def test_grid_planner_upsert_no_duplicates(self, session, api_url):
        hdr = TestGridPlanner._hdr
        # Second POST should update, not duplicate
        new_slots = [{"slot_index": i, "label": f"Updated {i}"} for i in range(9)]
        r = session.post(f"{api_url}/grid-planner",
                         json={"name": "My Grid V2", "slots": new_slots}, headers=hdr)
        assert r.status_code == 200
        # GET reflects update
        g = session.get(f"{api_url}/grid-planner", headers=hdr)
        body = g.json()
        assert body is not None
        assert body["name"] == "My Grid V2"
        assert body["slots"][0]["label"] == "Updated 0"

    def test_grid_planner_max_9_slots(self, session, api_url):
        hdr = TestGridPlanner._hdr
        slots = [{"slot_index": i, "label": f"x"} for i in range(10)]
        r = session.post(f"{api_url}/grid-planner",
                         json={"name": "X", "slots": slots}, headers=hdr)
        assert r.status_code == 400, r.text

    def test_grid_planner_requires_auth(self, api_url):
        r = requests.get(f"{api_url}/grid-planner")
        assert r.status_code in (401, 403)
        r2 = requests.post(f"{api_url}/grid-planner", json={"name": "x", "slots": []})
        assert r2.status_code in (401, 403)


# ============= CONTENT CALENDAR =============
class TestCalendar:
    _ids = []

    def test_create_event(self, session, api_url, auth_headers):
        payload = {
            "title": "TEST Posting Banner Promo",
            "scheduled_date": "2026-06-15",
            "notes": "Banner promo lebaran",
            "status": "draft",
        }
        r = session.post(f"{api_url}/calendar", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        ev = r.json()
        assert ev["title"] == payload["title"]
        assert ev["scheduled_date"] == "2026-06-15"
        assert "id" in ev
        TestCalendar._ids.append(ev["id"])

    def test_create_second_event_different_month(self, session, api_url, auth_headers):
        payload = {"title": "TEST Carousel Edukasi", "scheduled_date": "2026-07-10",
                   "notes": "", "status": "scheduled"}
        r = session.post(f"{api_url}/calendar", json=payload, headers=auth_headers)
        assert r.status_code == 200
        TestCalendar._ids.append(r.json()["id"])

    def test_list_calendar_returns_all(self, session, api_url, auth_headers):
        r = session.get(f"{api_url}/calendar", headers=auth_headers)
        assert r.status_code == 200
        events = r.json()
        assert isinstance(events, list)
        ids = {e["id"] for e in events}
        for cid in TestCalendar._ids:
            assert cid in ids

    def test_list_calendar_month_filter(self, session, api_url, auth_headers):
        r = session.get(f"{api_url}/calendar?month=2026-06", headers=auth_headers)
        assert r.status_code == 200
        events = r.json()
        assert all(e["scheduled_date"].startswith("2026-06") for e in events)
        # should include the one created on 2026-06-15
        assert any(e["scheduled_date"] == "2026-06-15" for e in events)
        # should NOT include 2026-07
        assert not any(e["scheduled_date"].startswith("2026-07") for e in events)

    def test_update_event(self, session, api_url, auth_headers):
        eid = TestCalendar._ids[0]
        update = {"title": "TEST Updated Title", "scheduled_date": "2026-06-20",
                  "notes": "updated", "status": "posted"}
        r = session.patch(f"{api_url}/calendar/{eid}", json=update, headers=auth_headers)
        assert r.status_code == 200, r.text
        ev = r.json()
        assert ev["title"] == "TEST Updated Title"
        assert ev["scheduled_date"] == "2026-06-20"
        assert ev["status"] == "posted"

    def test_update_nonexistent_returns_404(self, session, api_url, auth_headers):
        r = session.patch(f"{api_url}/calendar/does-not-exist",
                         json={"title": "x", "scheduled_date": "2026-01-01"}, headers=auth_headers)
        assert r.status_code == 404

    def test_delete_event(self, session, api_url, auth_headers):
        eid = TestCalendar._ids[1]
        r = session.delete(f"{api_url}/calendar/{eid}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json().get("deleted") is True
        # confirm gone via list
        lr = session.get(f"{api_url}/calendar", headers=auth_headers)
        assert eid not in {e["id"] for e in lr.json()}

    def test_delete_nonexistent_returns_404(self, session, api_url, auth_headers):
        r = session.delete(f"{api_url}/calendar/does-not-exist", headers=auth_headers)
        assert r.status_code == 404

    def test_calendar_requires_auth(self, api_url):
        assert requests.get(f"{api_url}/calendar").status_code in (401, 403)
        assert requests.post(f"{api_url}/calendar",
                             json={"title": "x", "scheduled_date": "2026-01-01"}).status_code in (401, 403)
