"""Feedify iteration-2 backend tests.

Covers new endpoints:
- POST /api/prompt/generate-food-menu (food menu builder)
- GET/POST/PATCH/DELETE /api/calendar (+ month filter)
- GET /api/stats now includes food_menu count
"""
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
