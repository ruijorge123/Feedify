# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

Feedify is a SaaS platform for Indonesian MSMEs (UMKM) to generate branded social media content using AI. It is a full-stack monorepo:

- **`backend/`** — FastAPI (Python) with MongoDB (async via Motor). All API logic lives in a single file: `backend/server.py`. Pricing/plan configuration is the single source of truth in `backend/feedify_config.py` (consumed by the frontend via `GET /api/config`).
- **`frontend/`** — React 19 + React Router v7 + TanStack Query. Built with CRA via CRACO (`craco start/build`). UI is shadcn/ui (Radix UI primitives) + Tailwind CSS.
- **`backend/tests/`** — Integration tests (pytest) that hit a live running backend over HTTP, not unit tests with mocks.

## Development Commands

### Quick start (both services together)
```bash
./start.sh   # installs deps, prompts for .env values, starts backend + frontend
```

### Backend (manual)
```bash
cd backend
pip install -r requirements.txt
pip install -e emergentintegrations_stub/   # local stub — package is not on PyPI
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

Required environment variables (create `backend/.env`):
```
MONGO_URL=mongodb://...
DB_NAME=feedify
JWT_SECRET=your-secret
EMERGENT_LLM_KEY=your-key   # used for both OpenAI image gen and Gemini vision
```

Optional environment variables:
```
GOOGLE_CLIENT_ID=...          # enables Google OAuth login
GROQ_API_KEY=...              # enables /chat/support endpoint (Groq LLM)
TELEGRAM_BOT_TOKEN=...        # enables Telegram schedule reminders
FONNTE_TOKEN=...              # enables WhatsApp notifications via Fonnte
FONNTE_COMMUNITY_ID=...
FONNTE_COMMUNITY_LINK=...
```

### Frontend
```bash
cd frontend
yarn install
yarn start          # dev server on port 3000
yarn build
yarn test
```

Required `frontend/.env`:
```
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_GOOGLE_CLIENT_ID=...   # optional — required only for Google OAuth
```

### Tests
```bash
cd backend
REACT_APP_BACKEND_URL=http://localhost:8001 pytest tests/ -v
# Run a single test:
REACT_APP_BACKEND_URL=http://localhost:8001 pytest tests/test_feedify_api.py::test_register -v
```

## Key Architectural Patterns

### Auth Flow
JWT stored in `localStorage` as `feedify_token`. The axios instance in `frontend/src/lib/api.js` injects it automatically. A 401 response redirects to `/login` and clears localStorage. The backend `get_current_user` dependency validates JWT and fetches the user from MongoDB. Google OAuth is handled by `POST /api/auth/google-token` on the backend and `GoogleOAuthProvider` + `loginWithGoogle()` on the frontend (`AuthContext.jsx`).

### AI Stack
- **Image generation**: `gpt-image-1` via `emergentintegrations.llm.openai.image_generation.OpenAIImageGeneration` — triggered on banner, carousel slide, food-menu, and marketplace generation. Uses `EMERGENT_LLM_KEY`.
- **Vision/Text AI**: Gemini (`gemini-3-flash-preview`) via `emergentintegrations.llm.chat.LlmChat` — used for photo analysis, copywriting, calendar idea generation, and brand consistency checks.
- **Support chat**: Groq (`AsyncGroq`) via `GROQ_API_KEY` — used only for the `/chat/support` endpoint.
- After every image is generated, `_auto_consistency_check()` runs as an `asyncio.create_task()` background task (best-effort, never blocks the response).
- `emergentintegrations` is a private package. The stub at `backend/emergentintegrations_stub/` satisfies imports when the real package is absent; all real imports are inside `try/except` in `server.py`.

### Credits System
Credits are per-user, per-30-day rolling period. Logic lives in `_ensure_user_credits`, `_consume_credit`, `_credits_summary` in `server.py`. Credits are consumed atomically before generation and refunded if the API call fails. Plan definitions (quotas, prices) come from `feedify_config.py`. Top-up purchases go through Xendit (`POST /api/credits/purchase`, webhook at `POST /api/credits/xendit-webhook`).

### Prompt Building
Content generation uses a two-step pipeline:
1. `_build_*_prompt()` builds a deterministic JSON spec (the "structured prompt").
2. `_build_natural_prompt()` / `_natural_*()` converts that JSON spec to a natural language string for `gpt-image-1`.

### Frontend API & Config
- All API calls go through `frontend/src/lib/api.js` (the default axios export).
- Plan/archetype/purposes data is fetched once from `GET /api/config` and cached module-level. Use `useConfig()` or `fetchConfig()` from `src/lib/config.js`.

### Admin Role
Backend `require_admin` dependency checks `user.role == "admin"`. Admin routes (`/admin/*`) expose user management, credit adjustments, analytics, and daily voucher management. The `AdminPage` is accessible at `/admin` for admin users.

### Scheduling & Notifications
`POST /api/schedule` creates a scheduled post. A background `_reminder_loop()` task fires on startup and sends reminders via Telegram (`TELEGRAM_BOT_TOKEN`) or WhatsApp (`FONNTE_TOKEN`). Notification preferences are saved per-user at `PUT /api/notifications/settings`.

### Voucher & Referral
Daily voucher codes are auto-generated (`_get_or_create_daily_voucher`). Validated via `POST /api/vouchers/validate`. Referral links generated at `GET /api/referral/my-link` and applied via `POST /api/referral/apply`.

## Design System Rules

Source of truth: `design_guidelines.json`. Never deviate from these:

- **Colors**: Deep emerald `#0B3D2E` (brand primary), cream `#FDFBF7` (bg), gold `#E5C158` (accent). No purple or teal.
- **Fonts**: `Outfit` for headings, `Plus Jakarta Sans` for body, `JetBrains Mono` for mono. **Never use Inter.**
- **Icons**: `@phosphor-icons/react` (Duotone or Regular style). Do not use Lucide icons.
- **Color picker**: Never use native `<input type="color">` on mobile — use the custom `ColorPicker` component in `src/components/ColorPicker.jsx`.
- **Testing attributes**: Every interactive element must have a `data-testid` in kebab-case. Use constants from `frontend/src/constants/testIds/` rather than hardcoding strings.
- **Navigation**: Fixed bottom bar on mobile (glassmorphism), left sidebar on desktop (`AppShell.jsx`).
- **Buttons**: `rounded-full`. Cards: `rounded-2xl`. Inputs: `rounded-xl`.

## Content Dashboards

The app has five generation dashboards (routes under `/generate/*`):
- **Banner** (`/generate/banner`) — single static promotional image
- **Carousel** (`/generate/carousel`) — multi-slide Instagram carousel (3–7 slides, each costs 1 credit)
- **Copywriting** (`/generate/copywriting`) — text only via Gemini, no image credit consumed
- **Food Menu** (`/generate/food`) — F&B specific image with mood/layout presets
- **Marketplace** (`/generate/marketplace`) — marketplace product listing image

Plus planning tools: **Grid Planner** (9-slot Instagram feed preview), **Content Calendar**, **Consistency Checker**, and **History**.

## Onboarding Gate

New users must complete `OnboardingPage` (creates a Brand Profile) before accessing any dashboard. `ProtectedRoute` in `App.js` enforces this by checking `user.has_brand_profile`.
