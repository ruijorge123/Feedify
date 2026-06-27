# Feedify — Product Requirements Document (Living)

## Pivot Iter (2026-06-20)
Business model changed: **Feedify generates images server-side** via OpenAI gpt-image-1 (via Emergent LLM Key), no more "copy JSON to ChatGPT". Plus: paid-only access (no free trial), 3-tier subscription.

## Architecture
- **Backend**: FastAPI + Motor + emergentintegrations (Gemini for text/vision + OpenAI gpt-image-1 for images)
- **Frontend**: React + Tailwind, mobile-first, bottom nav
- **DB collections**: `users`, `brand_profiles`, `generated_prompts` (now stores `image_base64` / `slide_images[]`), `user_credits`, `grid_layouts`, `calendar_events`, `consistency_checks`
- **Config**: `/app/backend/feedify_config.py` — single source for PLANS, ARCHETYPES, CONTENT_PURPOSES. Exposed via `GET /api/config`.

## Implemented in This Pivot

### A. Real image generation
- ✅ Removed `expected_images_count` field from Banner
- ✅ `POST /api/prompt/generate-banner` now calls OpenAI gpt-image-1, returns `image_base64`
- ✅ `POST /api/prompt/generate-carousel` generates per-slide images, returns `slide_images[]`
- ✅ `POST /api/prompt/regenerate-slide` — regenerate single slide (1 credit)
- ✅ `POST /api/prompt/regenerate` — regenerate banner/food (1 credit)
- ✅ `POST /api/prompt/generate-food-menu` generates real image
- ✅ Frontend dashboards show: empty state → loading skeleton (30-60s message) → real image preview with Download/Regenerate actions
- ✅ Aspect ratio mapped to gpt-image-1 sizes (1:1=1024², 4:5/9:16=1024×1536, 16:9=1536×1024)
- ✅ Generate button labels include credit cost: "Generate (1 kredit)" / "Generate 5 Slides (5 kredit)"

### B. Per-dashboard
- ✅ **Banner**: real image preview, photo upload (optional), regenerate
- ✅ **Carousel**: thumbnail strip → click to view selected slide image + per-slide regenerate/download
- ✅ **F&B Menu**: added photo upload before items list, real image output
- ✅ **Copywriting**: added optional photo upload + "Tujuan Konten" select (awareness/soft-selling/hard-selling/education/engagement). Text-only output (no image credit consumed)
- ⏳ **Grid Planner**: still uses color-tag slot view — TODO: replace with real thumbnails from prompts collection
- ⏳ **Consistency Checker**: auto-run-after-generate IS implemented backend-side (`_auto_consistency_check`); endpoint `GET /api/consistency/history` exists — TODO: frontend UI to show history view
- ⏳ **Calendar**: prompt_id linking exists — TODO: render image thumbnail on calendar date

### C. Credit / quota system
- ✅ Monthly quota per plan (Starter 30 / Pro 120 / Business 400)
- ✅ Atomic credit consume on each generate; refund on AI failure
- ✅ Auto reset every 30 days
- ✅ Top-up endpoint (placeholder)
- ✅ `GET /api/credits` for current state
- ✅ `POST /api/credits/select-plan` (placeholder for payment flow)
- ✅ Home page: quota card with progress bar (only place quota is shown)
- ✅ Dashboards: only show cost on button, no quota detail
- ✅ NoCreditsModal — shows when 402 returned, links to /settings#plan

### D. Brand DNA expansion
- ✅ Backend BrandProfileIn fields added: archetype, words_always, words_avoid, signature_phrase, proof_points
- ✅ Backend copywriting uses these in prompt (archetype, words always/avoid, proof points required)
- ✅ `<BrandDnaCard>` shared component shows logo thumbnail + archetype badge + Edit button → /settings
- ✅ All dashboards now use BrandDnaCard
- ⏳ Settings UI for new brand fields — TODO

### E. Home stats
- ✅ "Total Konten Dihasilkan" (counts items with image_base64 or slide_images)
- ✅ Recent: thumbnail grid (4 cards) showing actual generated images

### Landing page
- ✅ All CTAs ("Mulai gratis") replaced with "Lihat Paket" (anchor to #pricing)
- ✅ Pricing section: 3 tiers from config (Starter/Pro/Business), Pro = "Paling Populer"
- ✅ Hero CTA: "Lihat Paket & Mulai" + secondary "Saya sudah punya akun" → /login
- ✅ Final CTA points to #pricing
- ✅ FAQ updated: added "Apakah ada versi gratis?" + upgrade/downgrade + over-quota
- ✅ Removed lifetime "Rp 499K" card and bayar-sekali messaging
- ✅ Top-up note added under pricing cards
- ✅ Pricing & quota values come from `/api/config` (single source: feedify_config.py)

## Pending (next iteration)
- [ ] Settings page UI for expanded Brand Profile fields (archetype radio, words always/avoid chips, signature, proof points)
- [ ] Grid Planner — show real image thumbnails from linked prompts
- [ ] Consistency Checker page — show auto-run history feed + keep manual upload as secondary
- [ ] Calendar — render image thumbnail on date when prompt_id linked
- [ ] Settings: plan management UI (current plan, change, top-up)
- [ ] Image generation E2E testing (testing_agent_v3) with long timeouts (60s+)
- [ ] Register flow: pass `?plan=` to record selected plan post-register
- [ ] Payment integration (currently `POST /api/credits/select-plan` is placeholder)

## Test Credentials
See `/app/memory/test_credentials.md`.
