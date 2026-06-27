import os
import io
import base64
import uuid
import pytest
import requests
from PIL import Image, ImageDraw

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # try reading from frontend .env directly
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def api_url():
    assert BASE_URL, "REACT_APP_BACKEND_URL not configured"
    return API


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def unique_email():
    # ensures each test run uses a fresh user (avoid 'already registered' conflicts)
    return f"TEST_user_{uuid.uuid4().hex[:10]}@feedifyqa.io"


@pytest.fixture(scope="session")
def registered_user(session, api_url, unique_email):
    """Register a new test user and return (token, user_obj)."""
    payload = {"email": unique_email, "password": "Demo1234!", "name": "TEST UMKM"}
    r = session.post(f"{api_url}/auth/register", json=payload)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    return {"token": data["token"], "user": data["user"], "password": payload["password"], "email": unique_email}


@pytest.fixture(scope="session")
def auth_headers(registered_user):
    return {"Authorization": f"Bearer {registered_user['token']}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def sample_jpeg_base64():
    """Real JPEG with multiple objects/edges/colors — not blank."""
    img = Image.new("RGB", (512, 512), (245, 240, 220))
    draw = ImageDraw.Draw(img)
    # Coffee cup body (brown rectangle)
    draw.rectangle([160, 220, 360, 430], fill=(120, 70, 40), outline=(60, 30, 10), width=4)
    # Cup rim (ellipse)
    draw.ellipse([155, 200, 365, 250], fill=(180, 130, 90), outline=(80, 40, 10), width=3)
    # Coffee surface (darker)
    draw.ellipse([170, 210, 350, 240], fill=(50, 25, 10))
    # Handle
    draw.ellipse([350, 260, 430, 380], outline=(60, 30, 10), width=12)
    # Saucer
    draw.ellipse([110, 410, 410, 460], fill=(220, 200, 170), outline=(140, 100, 60), width=3)
    # Beans
    for cx, cy in [(80, 100), (430, 90), (60, 470), (450, 480), (380, 80)]:
        draw.ellipse([cx-18, cy-12, cx+18, cy+12], fill=(80, 40, 15), outline=(40, 20, 5))
        draw.line([cx-15, cy, cx+15, cy], fill=(40, 20, 5), width=2)
    # Steam (gray curves)
    for x in (220, 260, 300):
        draw.arc([x-15, 120, x+15, 200], start=0, end=360, fill=(180, 180, 180), width=3)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")
