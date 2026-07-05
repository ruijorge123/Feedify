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
FAL_KEY=...                   # enables Reels video generation (fal.ai Kling)
OPENAI_API_KEY=...            # GPT-4o Video Director for Reels (falls back to EMERGENT_LLM_KEY)
SMTP_USER=...                 # enables OTP email verification on signup
SMTP_PASSWORD=...
SMTP_HOST=smtp.gmail.com      # default
SMTP_PORT=587                 # default
SMTP_FROM=...
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

Email/password registration requires OTP verification: `POST /api/auth/register` creates an unverified user and emails a 6-digit OTP (`_send_otp_email`, requires `SMTP_USER`/`SMTP_PASSWORD`), then `POST /api/auth/verify-otp` confirms it (`VerifyEmailPage.jsx`). `POST /api/auth/login` rejects unverified accounts with `403 EMAIL_NOT_VERIFIED` and resends the OTP.

### AI Stack
- **Image generation**: `gpt-image-1` via `emergentintegrations.llm.openai.image_generation.OpenAIImageGeneration` — triggered on banner, carousel slide, food-menu, and marketplace generation. Uses `EMERGENT_LLM_KEY`.
- **Vision/Text AI**: Gemini (`gemini-3-flash-preview`) via `emergentintegrations.llm.chat.LlmChat` — used for photo analysis, copywriting, calendar idea generation, and brand consistency checks.
- **Support chat**: Groq (`AsyncGroq`) via `GROQ_API_KEY` — used only for the `/chat/support` endpoint.
- After every image is generated, `_auto_consistency_check()` runs as an `asyncio.create_task()` background task (best-effort, never blocks the response).
- `emergentintegrations` is a private package. The stub at `backend/emergentintegrations_stub/` satisfies imports when the real package is absent; all real imports are inside `try/except` in `server.py`.
- **Video generation (Reels)**: `POST /api/reels/generate` orchestrates `backend/video_service.py:run_reels_pipeline()` — (1) upload product image to fal.ai CDN via `fal_provider.upload_image`, (2) build a cinematic motion prompt with GPT-4o Vision via `gpt_video_director.build_video_prompt` (analyzes the image + video goal/duration/aspect ratio), (3) generate the clip with fal.ai Kling v2.5 via `fal_provider.generate_video`. Requires `FAL_KEY`; the modules degrade gracefully (raise at call time, not import time) if unset. `backend/storage.py` is a thin pass-through since videos are served directly from fal.ai CDN URLs.

### Credits System
Credits are per-user, per-30-day rolling period. Logic lives in `_ensure_user_credits`, `_consume_credit`, `_credits_summary` in `server.py`. Credits are consumed atomically before generation and refunded if the API call fails. Plan definitions (quotas, prices) come from `feedify_config.py`. Top-up purchases go through Xendit (`POST /api/credits/purchase`, webhook at `POST /api/credits/xendit-webhook`).

### Prompt Building
Content generation uses a two-step pipeline:
1. `_build_*_prompt()` builds a deterministic JSON spec (the "structured prompt").
2. `_build_natural_prompt()` / `_natural_*()` converts that JSON spec to a natural language string for `gpt-image-1`.

### Frontend API & Config
- All API calls go through `frontend/src/lib/api.js` (the default axios export). The `@` import alias resolves to `src/` (configured in `craco.config.js` and `jsconfig.json`).
- Plan/archetype/purposes data is fetched once from `GET /api/config` and cached module-level. Use `useConfig()` or `fetchConfig()` from `src/lib/config.js`.

### Module-Level Cache + Listener Pattern
`config.js`, `credits.js`, and `menuLock.js` all use a `let _cache / _state = null` module-level variable with a `Set` or array of listener callbacks as the app's lightweight global state (no Redux/Zustand/Context). To propagate a credit update after generation, call `notifyCreditsUpdate(newCredits)` from `credits.js`; it pushes the new value to every mounted `useCredits()` consumer. Similarly, `invalidateMenuLockCache()` from `menuLock.js` forces a re-fetch of the lockdown status.

### Auth Caching (Offline Resilience)
`AuthContext.jsx` seeds `user` state immediately from `feedify_user` in localStorage (no loading flash). On mount it fires `GET /api/auth/me` with a 5-second abort timeout — if the backend is unreachable, the cached user remains; only a genuine 401 clears it. JWT is stored separately as `feedify_token`.

### Admin Role
Backend `require_admin` dependency checks `user.role == "admin"`. Admin routes (`/admin/*`) expose user management, credit adjustments, analytics, and daily voucher management. The `/admin` route in React is protected by **both** `AdminRoute` (role check) and `AdminPinGate` (a PIN challenge rendered inside the route), so admin users must enter a PIN on each session before seeing `AdminPage`.

### Menu Lockdown (Per-Menu Feature Flags)
Admins can lock individual menus via `POST /api/admin/menu-lockdown` (payload: `{ menu_key, mode }` where mode is `"active"` | `"maintenance"` | `"hidden"`). `"maintenance"` keeps the menu visible in nav but blocks access; `"hidden"` removes it from user nav entirely (admins still see and can toggle it in the Admin Panel's menu list). The status is stored in the `app_settings` collection under key `"menu_lockdown"`. `GET /api/menu-lockdown-status` is public and returns a dict keyed by menu key. On the frontend, every generator route is wrapped in `<MenuLockGate menuKey="...">` (see `App.js` and `MenuLockGate.jsx`) which reads from `menuLock.js`. Admins always bypass the gate. `MaintenancePage` (`/maintenance`) polls `GET /api/maintenance-status` until the site-wide maintenance flag is cleared.

### Scheduling & Notifications
`POST /api/schedule` creates a scheduled post with a `reminder_at` timestamp. A background `_reminder_loop()` task fires on startup and marks due reminders as sent (`reminder_sent`); reminders surface directly in the Feedify web app — there is no external Telegram/WhatsApp delivery channel. Notification preferences are saved per-user at `PUT /api/notifications/settings`.

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

The app has nine generation dashboards:
- **Banner** (`/generate/banner`) — single static promotional image
- **Studio** (`/studio`) — commercial product photography (`StudioPage.jsx`)
- **Carousel** (`/generate/carousel`) — multi-slide Instagram carousel (3–7 slides, each costs 1 credit)
- **Copywriting** (`/generate/copywriting`) — text only via Gemini, no image credit consumed
- **Reels** (`/generate/reels`) — image-to-video ad (fal.ai Kling), see Video generation above
- **Talking Avatar** (`/generate/talking-avatar`) — image-to-talking-video via HeyGen (`TalkingAvatarPage.jsx`)
- **Food Menu** (`/generate/food`) — F&B specific image with mood/layout presets; **admin-only** (wrapped in `AdminRoute`)
- **Marketplace** (`/generate/marketplace`) — marketplace product listing image
- **Growth Consultant** (`/growth-consultant`) — AI-powered business growth advice (`GrowthConsultantPage.jsx`)

Plus planning tools: **Content Calendar** (`/calendar`) and **History** (`/history`).

All generator routes (and most planning tools) are wrapped in `<MenuLockGate>` — see Menu Lockdown above.

## Onboarding Gate

New users must complete `OnboardingPage` (creates a Brand Profile) before accessing any dashboard. `ProtectedRoute` in `App.js` enforces this by checking `user.has_brand_profile`.

## Brand DNA Vocabulary

`frontend/src/lib/brandDna.js` exports the selectable options used in onboarding and brand profile creation:
- `VISUAL_STYLES_LIST` — 12 visual aesthetics (e.g. `"minimal-clean"`, `"neon-street"`, `"luxury-editorial"`)
- `BRAND_POSITIONINGS_LIST` — 30 market positioning options (e.g. `"affordable_quality"`, `"local_pride"`)
- `BRAND_PERSONALITIES_LIST` — 37 personality traits (e.g. `"friendly"`, `"luxurious"`, `"playful"`)
- `BRAND_DONTS_CATEGORIES` — 6 categories of visual "don'ts" (tampilan, warna, latar, objek, suasana, ai)

These IDs flow from brand profile → `_build_*_prompt()` → the final `gpt-image-1` natural-language prompt. Adding or renaming a value here requires matching changes in the backend prompt builders.
