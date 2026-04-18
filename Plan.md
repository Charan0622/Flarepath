# PLAN.md — Flarepath Build Plan

> **How to use this file:** the section marked `[ACTIVE]` is what we're working on right now. Move that tag forward as tasks complete. When a task is done, tick its checkbox and add a one-line entry to the CHANGELOG at the bottom.

---

## Phase Overview

| Phase | Duration | Goal | Status |
|---|---|---|---|
| **0** | 1-2 days | Pre-build: accounts, design, decisions | `[DONE]` |
| **1** | 4 weeks | MVP — end-to-end demo-ready | `[ACTIVE]` |
| **2** | 3 weeks | Depth — voice, analytics, offline A* | `[ ]` |
| **3** | optional | Wow features — CV, citizen PWA, native shell | `[ ]` |

---

## Phase 0 — Pre-Build Setup `[DONE]`

### 0.1 Create Accounts (all free tier) `[PARTIAL]`
- [x] GitHub repo — https://github.com/Charan0622/Flarepath
- [ ] Vercel (connect to GitHub) — *pending user setup*
- [ ] Supabase project (pick nearest region) — *pending user setup*
- [ ] Mapbox account → get public + secret tokens — *pending user setup*
- [ ] Google AI Studio → Gemini API key — *pending user setup*
- [ ] Groq → API key (for Whisper later) — *pending user setup*
- [ ] Sentry (optional but recommended from day 1) — *pending user setup*

### 0.2 Decide the Demo City `[DONE]`
- [x] City: **San Jose, California, USA** (Silicon Valley context, real SJFD stations)
- [x] 3 fire stations: SJFD Station 1 (Downtown), Station 7 (West), Station 30 (East)
- [x] 10 incident scenarios in `packages/core/src/seed/demo-city.ts`

### 0.3 Generate VAPID Keys for Web Push `[DONE]`
- [x] Keys generated and ready for `.env.local`

### 0.4 Lock the Visual Identity `[DONE]`
- [x] Product name: **Flarepath**
- [x] Logomark: Fire SVG with severity gradient layers + path line
- [x] Severity palette confirmed: critical `#ff2d2d`, high `#ff7b1c`, medium `#ffc93c`, low `#3ddc84`
- [x] Favicon (32px), PWA icons (192px, 512px) generated
- [x] `manifest.json` created with standalone display

**Done when:** all credentials are in a password manager, a `.env.example` is mentally drafted, and you have a one-screen Figma/napkin sketch of the command center and the mobile responder view.

---

## Phase 1 — MVP (4 Weeks)

### Week 1 — Foundation `[ ]`

**Goal:** a running monorepo, auth, database, and design-system skeleton. No business logic yet.

#### 1.1 Monorepo Skeleton `[ ]`
- [ ] Init: `pnpm init` + Turborepo config + `pnpm-workspace.yaml`
- [ ] Create `apps/web` (Next.js 14, App Router, TS strict, Tailwind, shadcn/ui)
- [ ] Create `packages/core`, `packages/ui`, `packages/api-client`, `packages/supabase`, `packages/config`
- [ ] Shared `tsconfig.json` base in `packages/config`
- [ ] ESLint + Prettier + Husky + lint-staged
- [ ] `.env.example` with every key from CLAUDE.md
- [ ] First commit with a working `pnpm dev`
- **Done when:** `pnpm dev` serves a "Hello Flarepath" page at localhost:3000.

#### 1.2 CI Pipeline `[ ]`
- [ ] GitHub Action: install → typecheck → lint → build on every PR
- [ ] Vercel connected — auto-deploy on push to `main`
- [ ] Branch protection: `main` requires CI + 1 review (self-review OK since solo)
- **Done when:** an intentionally broken PR is red; a clean PR is green and auto-previewed on Vercel.

#### 1.3 Supabase Setup `[ ]`
- [ ] Local Supabase CLI installed, linked to project
- [ ] First migration: `organizations`, `profiles` (extends `auth.users`)
- [ ] RLS policies for `profiles` (user can read own, admins read org)
- [ ] Type gen wired into `pnpm supabase:types`
- [ ] Seed script: 1 org, 3 users (dispatcher, firefighter, chief)
- **Done when:** Supabase Studio shows the tables, types are generated, seed runs cleanly.

#### 1.4 Auth Flow `[ ]`
- [ ] `middleware.ts` enforces session on all routes except `/login`, `/signup`, `/api/health`
- [ ] `/login` page (email + password + magic link option)
- [ ] `/signup` page (creates profile row, assigns to a default org for dev)
- [ ] `/logout` route handler
- [ ] `useSession()` hook in `packages/api-client`
- **Done when:** I can sign up, log in, log out, and hit a protected route with all three roles.

#### 1.5 Responsive Shell `[ ]`
- [ ] Route groups `(desktop)` and `(responder)` with their own layouts
- [ ] A `<ViewportGate />` component that picks layout based on viewport (SSR-safe via headers)
- [ ] Desktop layout: left sidebar (nav) + main + right detail pane (empty for now)
- [ ] Responder layout: top bar + main + bottom tab bar (empty for now)
- [ ] Dark theme wired via `next-themes`; toggle in a dropdown
- **Done when:** resizing the browser swaps between the two layouts cleanly, both dark-mode styled.

#### 1.6 Design System Baseline `[ ]`
- [ ] `packages/ui/tokens.ts` with severity, bg, radius, motion
- [ ] Tailwind preset in `packages/config` reads tokens
- [ ] shadcn/ui installed with `new-york` style, zinc base
- [ ] Build these primitives: `<SeverityBadge />`, `<StatusPill />`, `<IncidentCard />` (static props for now)
- [ ] Storybook set up (optional but impressive on GitHub)
- **Done when:** the three primitives render correctly in Storybook with all severity/status variants.

#### 1.7 PWA Foundations `[ ]`
- [ ] `public/manifest.json` with name, icons, theme_color, display: standalone
- [ ] Service Worker stub (Workbox) — caches app shell
- [ ] Install prompt component (shows on mobile viewports)
- [ ] Lighthouse PWA audit ≥ 90 on preview deploy
- **Done when:** Chrome on mobile shows an "Install Flarepath" prompt and the installed app launches full-screen.

---

### Week 2 — Incidents & AI Triage `[ ]`

**Goal:** the dispatcher can create an incident, AI triages it, and it shows up on the live map.

#### 2.1 Full Schema `[ ]`
- [ ] Migration: `stations`, `vehicles`, `incidents`, `ai_triage`, `dispatches`, `location_pings`, `audit_log`
- [ ] PostGIS extension enabled, GIST indexes on geography columns
- [ ] RLS policies for every table (see §12.2 of design doc)
- [ ] Seed: 3 stations, 6 vehicles, 2 closed historical incidents
- **Done when:** a SQL query finds the 3 closest available engines to a sample point in < 5ms.

#### 2.2 Incident CRUD API `[ ]`
- [ ] `POST /api/incidents` — creates incident, triggers AI triage in background
- [ ] `GET /api/incidents` — list with filters (status, severity, date range)
- [ ] `GET /api/incidents/:id` — detail with triage + dispatches
- [ ] `PATCH /api/incidents/:id` — status updates via state machine
- [ ] Zod schemas in `packages/core/schemas/incidents.ts`
- [ ] Integration tests for each endpoint
- **Done when:** Postman/Thunder Client can exercise the full CRUD flow and state machine rejects illegal transitions.

#### 2.3 Gemini Triage Agent `[ ]`
- [ ] Gemini client wrapper in `packages/core/ai/gemini.ts` (typed, structured output mode)
- [ ] Triage prompt with 8 few-shot examples covering edge cases
- [ ] Zod output schema with retry-once on validation failure
- [ ] Rule-based fallback classifier (regex + keyword) for when AI fails
- [ ] Logged to `ai_triage` with latency, tokens, confidence
- [ ] `/api/ai/triage` endpoint with rate limiting (Upstash)
- **Done when:** 10 test incidents all produce valid triage in < 2s, and deliberately broken input falls back to rules without errors.

#### 2.4 Incident Feed UI (Desktop) `[ ]`
- [ ] Live list of incidents in the left panel, sorted by severity + time
- [ ] Subscribes to `org:{id}:incidents` Realtime channel
- [ ] `IncidentCard` shows: severity, type, time, address, assigned count
- [ ] Clicking opens the right detail pane
- [ ] TanStack Query with optimistic updates for status changes
- **Done when:** creating an incident in one tab makes it appear in another tab within 500ms.

#### 2.5 Live Map (Desktop) `[ ]`
- [ ] Mapbox GL JS centered on the demo city, dark style
- [ ] Incident markers colored by severity
- [ ] Station markers (different icon)
- [ ] Click on map marker → opens detail pane
- [ ] Clustering when zoomed out
- **Done when:** the map shows all seeded incidents + stations, syncs with the list panel when an item is selected.

#### 2.6 New Incident Form `[ ]`
- [ ] Modal form with address autocomplete (Mapbox Geocoding API)
- [ ] Fields: reporter name/phone, type, address (auto-fills lat/lng), description, hazards
- [ ] React Hook Form + Zod validation
- [ ] Submit → creates incident → triage runs → detail pane auto-opens with AI output
- **Done when:** I can go from "click New" to "see AI triage populated" in under 5 seconds.

---

### Week 3 — Dispatch & Routing `[ ]`

**Goal:** dispatcher can assign a crew+vehicle, see the red route preview, and confirm dispatch.

#### 3.1 Resource Recommendation `[ ]`
- [ ] Scoring function in `packages/core/domain/scoring.ts` (distance + skill + recency + load)
- [ ] `GET /api/dispatch/recommend?incidentId=` returns ranked list
- [ ] Unit tests covering edge cases (no available, all same distance, skill mismatch)
- **Done when:** recommendations feel sensible for 5 manually-reviewed scenarios.

#### 3.2 Dispatch UI `[ ]`
- [ ] "Dispatch" button in the incident detail pane
- [ ] Modal shows top 3 recommended crew+vehicle pairs
- [ ] Expandable to show all available resources
- [ ] Select → preview route on map → confirm
- [ ] Optimistic update: incident moves to "dispatched" in the feed
- **Done when:** the full flow works in under 3 clicks from the incident detail pane.

#### 3.3 Mapbox Routing Integration `[ ]`
- [ ] `/api/route/optimize` calls Mapbox Directions with `steps=true, voice_instructions=true, banner_instructions=true`
- [ ] Stores polyline in `dispatches.route_geojson`
- [ ] Returns distance, duration, and steps
- [ ] 5-minute cache (same origin→destination)
- **Done when:** a confirmed dispatch stores a valid GeoJSON polyline and the map renders it.

#### 3.4 Red Path Rendering `[ ]`
- [ ] Line layer with `#ff2d2d`, width 6, blur 2, round caps
- [ ] Subtle dash animation via `line-dasharray` interpolation (Framer Motion or raw rAF)
- [ ] Origin marker: pulse-animated vehicle icon
- [ ] Destination marker: fire icon with severity-colored ring
- [ ] Auto-fit bounds to the route with padding
- **Done when:** confirming a dispatch triggers a smooth animation of the red path drawing from station to incident.

#### 3.5 Web Push Infrastructure `[ ]`
- [ ] `POST /api/push/subscribe` — stores subscription on user profile
- [ ] `POST /api/push/send` (internal) — sends VAPID push
- [ ] Service Worker: handles `push` and `notificationclick` events
- [ ] Client: requests permission on first login, stores subscription
- [ ] `notificationclick` opens the specific incident URL
- **Done when:** sending a test push from the server opens the right page in the PWA.

#### 3.6 Dispatch → Push Flow `[ ]`
- [ ] On dispatch creation, send Web Push to all assigned responders
- [ ] Notification payload: severity emoji + address + "Tap to navigate"
- [ ] Haptic pattern on Android (vibration API)
- **Done when:** confirming a dispatch on desktop fires a push to my phone within 2 seconds.

---

### Week 4 — Mobile Responder & Navigation `[ ]`

**Goal:** the whole loop closes. Responder gets notified, navigates, updates status, dispatcher sees it live.

#### 4.1 Responder Incident View `[ ]`
- [ ] `/incident/[id]` mobile layout: map (70%) + bottom sheet with details
- [ ] Big status buttons: Acknowledge / En Route / On Scene / Returning / Clear
- [ ] Each button hits `POST /api/dispatch/:id/status`
- [ ] Haptic feedback on tap
- **Done when:** tapping a status button updates the server + dispatcher UI in < 500ms.

#### 4.2 In-Browser Turn-by-Turn `[ ]` **★ the centerpiece**
- [ ] `/navigate/[dispatchId]` full-screen route
- [ ] Mapbox camera: `pitch: 60, zoom: 17`, follows user position
- [ ] `navigator.geolocation.watchPosition` streams GPS
- [ ] Step tracker: find current step via `nearestPointOnLine` + distance to next maneuver
- [ ] `SpeechSynthesisUtterance` speaks each maneuver 250m and 50m ahead
- [ ] Banner at top shows next instruction
- [ ] Screen Wake Lock acquired on start, released on arrival
- [ ] Device orientation rotates the map bearing
- [ ] "Open in Google Maps" secondary button for fallback
- **Done when:** I can start nav on my phone, hear voice, see the map rotate, and arrive at the destination with the red path tracing my journey.

#### 4.3 Live Vehicle Tracking `[ ]`
- [ ] GPS pings sent every 5s during `en_route` status
- [ ] Batched insert to `location_pings` (up to 10 per request)
- [ ] Dispatcher map subscribes to `dispatch:{id}:pings` channel
- [ ] Vehicle marker animates smoothly along the path (interpolate between pings)
- **Done when:** dispatcher sees the responder's vehicle glide along the red route on their desktop map.

#### 4.4 Off-Route Detection `[ ]`
- [ ] Client-side: distance from planned polyline > 50m for > 5s → re-route
- [ ] Re-route calls `/api/route/optimize` with current position
- [ ] Updates polyline smoothly (don't flash)
- [ ] Voice: "Recalculating..."
- **Done when:** deliberately taking a wrong turn triggers a re-route within 10s.

#### 4.5 Polish Pass `[ ]`
- [ ] Empty states, loading states, error states for every screen
- [ ] Skeleton loaders while data is fetching
- [ ] Toast notifications for every state change
- [ ] Cmd+K palette for dispatcher (search incidents, jump to map)
- [ ] Keyboard shortcuts: `n` = new incident, `Esc` = close drawer
- [ ] Accessibility pass: Lighthouse score ≥ 95
- **Done when:** I can demo the whole thing without any visible glitch for 5 minutes straight.

#### 4.6 Demo Assets `[ ]`
- [ ] Loom walkthrough (90 seconds, script in design doc Appendix B)
- [ ] GIF for the README (the moment the red path draws)
- [ ] Deploy to `flarepath.vercel.app` (or custom domain if you have one — `flarepath.app` is worth checking)
- [ ] README.md polished with screenshots, live link, feature bullets
- [ ] Blog post draft: "Building Flarepath: An AI Fire Dispatch System on Free-Tier PWAs"
- **Done when:** I can send ONE URL to a recruiter and it does the selling for me.

---

## Phase 2 — Depth (3 Weeks, after MVP lands)

Only start Phase 2 if Phase 1 is truly done and deployed.

### Week 5 — Voice Intake & AI Summaries `[ ]`
- Groq Whisper integration for dispatcher dictation
- Auto-fill the new-incident form from transcription
- Scheduled Edge Function generates post-incident summaries
- LangSmith or custom AI evaluation dashboard

### Week 6 — Analytics `[ ]`
- Chief dashboard: response-time trends, crew utilization
- Recharts visualizations
- Materialized views for fast aggregates
- CSV export

### Week 7 — Offline A* & Heatmap `[ ]`
- A* implementation in `packages/core/domain/routing`
- OSM data preprocessor → compact graph JSON
- Web Worker to run pathfinding off the main thread
- Fallback wiring if Mapbox rate-limits
- Predictive heatmap overlay (Poisson regression on historical data)

---

## Phase 3 — Wow Features (Optional)

- **TensorFlow.js fire-type classifier** — upload scene photo, classify (electrical/grease/structural)
- **Citizen PWA** — one-tap report with auto-geolocation
- **Native shell** — Expo WebView wrapper, EAS builds
- **IoT ingest** — MQTT smoke-sensor webhook creates incidents automatically
- **Voice caller agent** — LiveKit + Gemini that interviews the 911 caller while the dispatcher is busy

---

## Decision Log

Keep a record of every non-obvious decision. Future-you will thank present-you.

| Date | Decision | Reason | Alternative Considered |
|---|---|---|---|
| — | Use Next.js App Router | RSC + colocated route handlers, one deployable | Remix, Vite SPA |
| — | PWA instead of native mobile | Zero-install friction, single codebase | Expo React Native |
| — | Modular monolith | Solo dev, free tier, clear module boundaries | Microservices |
| — | Supabase over self-hosted Postgres | RLS + auth + realtime + storage in one | Neon + Clerk + Pusher |
| 2026-04-17 | San Jose as demo city | Silicon Valley resonance for US recruiters, real SJFD station data, great OSM coverage | Bengaluru, NYC |
| 2026-04-17 | SVG fire logomark with severity gradient | Visually communicates the product's purpose; renders at any size | Emoji 🚒, Lucide icon |
| 2026-04-17 | pnpm installed locally in .venv | Avoids sudo requirement for global install | Global npm install, corepack |

Add a row every time you make a call you might second-guess later.

---

## CHANGELOG

*Append a one-line entry each time a task is completed. Newest at the top.*

- 2026-04-17 — [0.4] — Visual identity locked: fire logomark SVG, favicon, PWA icons (192/512), manifest.json
- 2026-04-17 — [0.3] — VAPID keys generated for Web Push
- 2026-04-17 — [0.2] — Demo city: San Jose, CA with 3 SJFD stations, 6 vehicles, 10 incident scenarios
- 2026-04-17 — [0.1] — GitHub repo created, .env.example with all keys
- 2026-04-17 — [1.1] — Monorepo skeleton: pnpm + Turborepo + Next.js 14 + 5 shared packages + design tokens
