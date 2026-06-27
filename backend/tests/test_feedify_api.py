"""Feedify backend integration tests.

Covers: auth (register/login/me), brand-profile (upsert), photo/analyze (Gemini vision),
prompt generation (banner/carousel/copywriting), prompt history, stats, auth guards.
"""
import uuid
import pytest
import requests


# ============= HEALTH =============
class TestHealth:
    def test_root(self, session, api_url):
        r = session.get(f"{api_url}/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"
        assert data.get("app") == "Feedify API"


# ============= AUTH =============
class TestAuth:
    def test_register_creates_user(self, registered_user):
        # Fixture registers a fresh user; validate response shape
        u = registered_user["user"]
        assert "token" in registered_user and len(registered_user["token"]) > 10
        assert u["email"] == registered_user["email"].lower()
        assert u["name"] == "TEST UMKM"
        assert u["has_brand_profile"] is False
        assert "id" in u and "created_at" in u

    def test_register_duplicate_email_rejected(self, session, api_url, registered_user):
        payload = {"email": registered_user["email"], "password": "Demo1234!", "name": "Dup"}
        r = session.post(f"{api_url}/auth/register", json=payload)
        assert r.status_code == 400
        detail = r.json().get("detail", "")
        assert "sudah terdaftar" in detail.lower() or "terdaftar" in detail.lower()

    def test_login_success(self, session, api_url, registered_user):
        r = session.post(f"{api_url}/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"],
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and len(data["token"]) > 10
        assert data["user"]["email"] == registered_user["email"].lower()

    def test_login_wrong_password(self, session, api_url, registered_user):
        r = session.post(f"{api_url}/auth/login", json={
            "email": registered_user["email"], "password": "WrongPass!"
        })
        assert r.status_code == 401

    def test_me_with_token(self, session, api_url, auth_headers, registered_user):
        r = session.get(f"{api_url}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == registered_user["email"].lower()
        assert "password_hash" not in data
        assert "has_brand_profile" in data

    def test_me_without_token(self, api_url):
        # use bare requests (no auth header)
        r = requests.get(f"{api_url}/auth/me")
        assert r.status_code in (401, 403)


# ============= BRAND PROFILE =============
class TestBrandProfile:
    def test_create_brand_profile_then_get(self, session, api_url, auth_headers):
        payload = {
            "brand_name": "TEST Kopi Nusantara",
            "category": "F&B",
            "description": "Kopi arabika premium dari Aceh",
            "default_cta": "Pesan Sekarang",
            "color_primary": "#1A4F3A",
            "color_secondary": "#FFF8E7",
            "color_accent": "#D4A24E",
            "visual_style": "minimal-clean",
            "tone": "premium",
            "target_audience": "Pecinta kopi 25-45",
        }
        r = session.post(f"{api_url}/brand-profile", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        bp = r.json()
        assert bp["brand_name"] == "TEST Kopi Nusantara"
        assert bp["color_primary"] == "#1A4F3A"
        assert "id" in bp and "user_id" in bp

        # GET to verify persistence
        r2 = session.get(f"{api_url}/brand-profile", headers=auth_headers)
        assert r2.status_code == 200
        bp2 = r2.json()
        assert bp2["brand_name"] == "TEST Kopi Nusantara"
        assert bp2["category"] == "F&B"

    def test_brand_profile_upsert_updates(self, session, api_url, auth_headers):
        # Second POST should UPDATE, not create duplicate
        update = {
            "brand_name": "TEST Kopi Nusantara Updated",
            "category": "F&B",
            "color_primary": "#222222",
            "color_secondary": "#FFFFFF",
            "color_accent": "#FFAA00",
        }
        r = session.post(f"{api_url}/brand-profile", json=update, headers=auth_headers)
        assert r.status_code == 200, r.text
        bp = r.json()
        assert bp["brand_name"] == "TEST Kopi Nusantara Updated"
        assert bp["color_primary"] == "#222222"

        # GET reflects update
        r2 = session.get(f"{api_url}/brand-profile", headers=auth_headers)
        assert r2.json()["brand_name"] == "TEST Kopi Nusantara Updated"

    def test_me_has_brand_profile_true_after_create(self, session, api_url, auth_headers):
        r = session.get(f"{api_url}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["has_brand_profile"] is True

    def test_brand_profile_requires_auth(self, api_url):
        r = requests.get(f"{api_url}/brand-profile")
        assert r.status_code in (401, 403)


# ============= PHOTO ANALYZE (Gemini Vision) =============
class TestPhotoAnalyze:
    def test_analyze_photo_returns_structured_json(self, session, api_url, auth_headers, sample_jpeg_base64):
        payload = {"image_base64": sample_jpeg_base64, "mime_type": "image/jpeg"}
        r = session.post(f"{api_url}/photo/analyze", json=payload, headers=auth_headers, timeout=90)
        assert r.status_code == 200, f"{r.status_code} {r.text[:500]}"
        data = r.json()
        # Either the proper keys or a structured fallback - validate at least one of the expected keys
        expected_any = ["detected_object", "dominant_colors", "recommended_layout", "recommended_style"]
        present = [k for k in expected_any if k in data]
        assert len(present) >= 3, f"Missing expected keys; got {list(data.keys())[:10]}"
        # dominant_colors should be list when present
        if "dominant_colors" in data:
            assert isinstance(data["dominant_colors"], list)

    def test_analyze_photo_requires_auth(self, api_url, sample_jpeg_base64):
        r = requests.post(f"{api_url}/photo/analyze",
                          json={"image_base64": sample_jpeg_base64, "mime_type": "image/jpeg"})
        assert r.status_code in (401, 403)


# ============= BANNER PROMPT =============
class TestBannerPrompt:
    def test_generate_banner_returns_prompt_structure(self, session, api_url, auth_headers):
        payload = {
            "headline": "TEST Diskon 30% Kopi Arabika",
            "subheadline": "Hari ini saja",
            "description": "Roasting fresh dari Aceh",
            "call_to_action": "Pesan Sekarang",
            "features": ["Single origin", "Medium roast"],
            "product_name": "Kopi Arabika 250g",
            "aspect_ratio": "4:5 (Portrait Feed)",
            "style_preset": "Minimal Clean",
            "placement_rule": "center",
            "expected_images_count": 1,
            "save": True,
        }
        r = session.post(f"{api_url}/prompt/generate-banner", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "prompt_json" in body and "id" in body
        prompt = body["prompt_json"]
        assert prompt.get("task_type") == "commercial_banner_generation"
        assert "prompt_structure" in prompt
        ps = prompt["prompt_structure"]
        assert "branding_elements" in ps
        assert ps["branding_elements"]["headline"] == payload["headline"]
        # color palette uses brand colors (updated to #222222 by previous test)
        palette = ps["visual_style_details"]["color_palette"]
        assert palette["primary_accent"] == "#222222"
        assert palette["secondary_background"] == "#FFFFFF"

    def test_banner_saved_in_history(self, session, api_url, auth_headers):
        r = session.get(f"{api_url}/prompts?dashboard_type=banner", headers=auth_headers)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) >= 1
        assert all(it["dashboard_type"] == "banner" for it in items)
        assert any("TEST Diskon" in it.get("title", "") for it in items)


# ============= CAROUSEL PROMPT =============
class TestCarouselPrompt:
    def test_generate_carousel_5_slides(self, session, api_url, auth_headers):
        payload = {
            "topic": "TEST Kenapa kopi arabika lebih sehat",
            "product_name": "Kopi Arabika 250g",
            "template": "problem-solution",
            "slide_count": 5,
            "call_to_action": "Order via DM",
            "target_audience": "Coffee enthusiasts",
            "save": True,
        }
        r = session.post(f"{api_url}/prompt/generate-carousel", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        prompt = body["prompt_json"]
        assert "slides" in prompt
        slides = prompt["slides"]
        assert len(slides) == 5
        for s in slides:
            assert "slide_role" in s
            assert "prompt_structure" in s

    @pytest.mark.parametrize("count", [2, 8])
    def test_generate_carousel_invalid_count_returns_400(self, session, api_url, auth_headers, count):
        payload = {"topic": "x", "slide_count": count, "save": False}
        r = session.post(f"{api_url}/prompt/generate-carousel", json=payload, headers=auth_headers)
        assert r.status_code == 400, r.text


# ============= COPYWRITING (LLM) =============
class TestCopywriting:
    def test_generate_copywriting(self, session, api_url, auth_headers):
        payload = {
            "product_name": "TEST Kopi Arabika 250g",
            "product_description": "Single origin Aceh, medium roast, body penuh dan aftertaste cokelat",
            "target_audience": "Profesional muda 25-40 di Jakarta",
            "main_problem": "Kopi instan terasa hambar di pagi hari",
            "tone": "friendly",
            "platform": "instagram",
            "save": True,
        }
        r = session.post(f"{api_url}/prompt/generate-copywriting", json=payload, headers=auth_headers, timeout=120)
        assert r.status_code == 200, f"{r.status_code} {r.text[:500]}"
        body = r.json()
        assert "result" in body
        result = body["result"]
        # If LLM successfully parsed JSON
        if "error" not in result:
            assert "headlines" in result
            assert "captions" in result
            assert "cta_options" in result
            assert "hashtags" in result
            assert "hook_lines" in result
            assert isinstance(result["headlines"], list) and len(result["headlines"]) >= 1
            assert isinstance(result["captions"], list) and len(result["captions"]) >= 1
            first_cap = result["captions"][0]
            assert "style" in first_cap and "text" in first_cap
        else:
            pytest.fail(f"LLM returned unparsable JSON: {result}")


# ============= HISTORY & STATS =============
class TestHistoryAndStats:
    def test_list_prompts_user_scoped(self, session, api_url, auth_headers):
        r = session.get(f"{api_url}/prompts", headers=auth_headers)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        # We've created banner + carousel + copywriting
        assert len(items) >= 2
        types = {it["dashboard_type"] for it in items}
        assert "banner" in types

    def test_list_prompts_filter_by_type(self, session, api_url, auth_headers):
        r = session.get(f"{api_url}/prompts?dashboard_type=carousel", headers=auth_headers)
        assert r.status_code == 200
        items = r.json()
        assert all(it["dashboard_type"] == "carousel" for it in items)

    def test_stats_returns_counts(self, session, api_url, auth_headers):
        r = session.get(f"{api_url}/stats", headers=auth_headers)
        assert r.status_code == 200
        stats = r.json()
        for k in ("total", "banner", "carousel", "copywriting"):
            assert k in stats
            assert isinstance(stats[k], int)
        assert stats["total"] == stats["banner"] + stats["carousel"] + stats["copywriting"]
        assert stats["banner"] >= 1
        assert stats["carousel"] >= 1

    def test_delete_prompt(self, session, api_url, auth_headers):
        # List, pick one banner, delete it, verify it disappears
        r = session.get(f"{api_url}/prompts?dashboard_type=banner", headers=auth_headers)
        items = r.json()
        assert len(items) >= 1
        target_id = items[0]["id"]
        dr = session.delete(f"{api_url}/prompts/{target_id}", headers=auth_headers)
        assert dr.status_code == 200
        assert dr.json().get("deleted") is True
        # 404 on GET
        gr = session.get(f"{api_url}/prompts/{target_id}", headers=auth_headers)
        assert gr.status_code == 404

    def test_prompts_requires_auth(self, api_url):
        r = requests.get(f"{api_url}/prompts")
        assert r.status_code in (401, 403)

    def test_stats_requires_auth(self, api_url):
        r = requests.get(f"{api_url}/stats")
        assert r.status_code in (401, 403)


# ============= USER ISOLATION =============
class TestUserIsolation:
    def test_other_user_cannot_see_prompts(self, session, api_url):
        # Register a fresh second user
        email = f"TEST_other_{uuid.uuid4().hex[:8]}@feedifyqa.io"
        r = session.post(f"{api_url}/auth/register",
                         json={"email": email, "password": "Demo1234!", "name": "Other"})
        assert r.status_code == 200
        token = r.json()["token"]
        hdr = {"Authorization": f"Bearer {token}"}
        # Fresh user should have empty prompt list & zero stats
        lr = session.get(f"{api_url}/prompts", headers=hdr)
        assert lr.status_code == 200
        assert lr.json() == []
        sr = session.get(f"{api_url}/stats", headers=hdr)
        assert sr.status_code == 200
        assert sr.json()["total"] == 0
