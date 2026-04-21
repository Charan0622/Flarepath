# Flarepath — Build Instructions & Tech Log

> This file logs every step taken during the build: commands run, files created, decisions made, and technologies used. Updated after every phase so that anyone can trace exactly how the project was built from scratch.

---

## Phase 0 — Pre-Build Setup (2026-04-17)

### Step 1: Python Virtual Environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install nodeenv
```

- **What:** Created an isolated Python 3.9.6 environment at `.venv/`
- **Why:** The system Node.js install required `sudo` for global packages. By installing `pnpm` inside the venv's local `node_modules`, we bypass permission issues entirely.
- **Result:** `pnpm` available at `.venv/node_modules/.bin/pnpm` (v10.33.0)

### Step 2: Git Repository

```bash
git init
git remote add origin https://github.com/Charan0622/Flarepath.git
```

- Created `.gitignore` covering: `node_modules/`, `.venv/`, `.next/`, `.env*`, `.DS_Store`, IDE files, Turbo cache, Vercel config, coverage reports, Storybook builds

### Step 3: pnpm Monorepo + Turborepo

```bash
pnpm init                    # Creates root package.json
pnpm install turbo --save-dev -w   # Installs Turborepo as workspace dev dep
```

**Files created:**
- `package.json` — workspace root with scripts: `dev`, `build`, `lint`, `typecheck`, `test` (all delegate to `turbo run`)
- `pnpm-workspace.yaml` — declares `apps/*` and `packages/*` as workspace members
- `turbo.json` — defines the task dependency graph:
  - `build` depends on `^build` (build packages before apps)
  - `dev` is non-cacheable and persistent (dev servers stay running)
  - `lint` and `typecheck` depend on `^build`

**What is Turborepo?** A build orchestrator for JavaScript/TypeScript monorepos. It runs tasks across packages in the correct dependency order, caches outputs to skip redundant work, and can run independent tasks in parallel. A single `pnpm dev` starts all packages.

**What is pnpm?** A package manager that uses a content-addressable store on disk. Unlike npm, it doesn't duplicate packages — if 5 projects need React, only one copy exists. Its workspace support lets packages reference each other with `workspace:*` protocol.

### Step 4: Next.js 14 App (`apps/web`)

```bash
npx create-next-app@14 apps/web --typescript --tailwind --eslint --app --use-pnpm
```

- **App Router** enabled (not Pages Router) — uses `app/` directory with file-based routing
- **TypeScript strict mode** — `"strict": true` in `tsconfig.json`
- **Tailwind CSS** — utility-first CSS with PostCSS processing
- **ESLint** — linting with `eslint-config-next`
- Replaced default boilerplate with dark-themed "Hello Flarepath" page showing severity badge colors
- Created route groups: `app/(desktop)/` and `app/(responder)/` for viewport-specific layouts

**What are route groups?** In Next.js App Router, folders wrapped in parentheses like `(desktop)` create logical groups that share a layout but don't affect the URL. `/incidents` under `(desktop)/` and `(responder)/` renders with different layouts at the same URL based on viewport.

### Step 5: Shared Packages

Created 5 packages in `packages/`, each with its own `package.json` and `tsconfig.json`:

| Package | Path | Purpose | Key Files |
|---|---|---|---|
| `@flarepath/config` | `packages/config/` | Shared build configuration | `tsconfig.base.json`, `tailwind.preset.js` |
| `@flarepath/core` | `packages/core/` | Pure TypeScript domain logic | `src/schemas/`, `src/types/`, `src/domain/` |
| `@flarepath/ui` | `packages/ui/` | Shared React components | `src/tokens.ts`, `src/components/` |
| `@flarepath/api-client` | `packages/api-client/` | Typed fetch + React Query hooks | `src/index.ts` |
| `@flarepath/supabase` | `packages/supabase/` | DB client + generated types | `src/client.ts`, `src/server.ts`, `migrations/` |

**What is a monorepo?** A single repository containing multiple packages that can depend on each other. The `core` package holds Zod schemas shared by both the API (server) and the form validation (client) — one source of truth, no drift.

### Step 6: Design Tokens (`packages/ui/src/tokens.ts`)

Defined the visual language as code:
- **Severity palette:** critical `#ff2d2d`, high `#ff7b1c`, medium `#ffc93c`, low `#3ddc84`
- **Background scale:** base `#0a0a0b`, raised `#121214`, overlay `#1a1a1e`, muted `#2a2a2e`
- **Border radii:** sm 6px, md 12px, lg 20px
- **Motion durations:** fast 120ms, normal 220ms, slow 400ms

The Tailwind preset at `packages/config/tailwind.preset.js` mirrors these tokens so you can write `bg-severity-critical` or `duration-fast` in any component.

### Step 7: Environment Variables

Created `.env.example` with all required keys. Created `.env.local` in `apps/web/` with actual values.

### Step 8: VAPID Keys (Web Push)

```bash
npx web-push generate-vapid-keys
```

Generated a public/private key pair for VAPID (Voluntary Application Server Identification). These authenticate the server when sending browser push notifications without needing Firebase or any third-party push service.

### Step 9: Visual Identity

- **Logomark:** Custom SVG at `apps/web/public/icons/icon.svg` — layered flame shape using the severity color gradient (red → orange → yellow) with a vertical path line underneath
- **Icons generated** using macOS `qlmanage` and `sips`:
  - `icon-512.png` (512x512) — PWA install icon
  - `icon-192.png` (192x192) — PWA home screen icon
  - `favicon.ico` (32x32) — browser tab icon
- **PWA manifest** at `apps/web/public/manifest.json`: standalone display, dark background, red theme color

### Step 10: Demo City — San Jose, CA

Chose San Jose for Silicon Valley context. Seed data in `packages/core/src/seed/demo-city.ts`:
- **3 SJFD stations** with real addresses and lat/lng coordinates
- **6 vehicles** (Engine 1, Engine 7, Ladder 1, Engine 30, Tanker 7, Rescue 30)
- **10 incident scenarios** at real San Jose locations covering: structure fire, vehicle fire, wildfire, hazmat, rescue, false alarm

### Step 11: Account Setup (2026-04-19)

| Service | What It Provides | Free Tier |
|---|---|---|
| **Supabase** (`xhdrosauksqrkilorqnh`) | Postgres DB + Auth + Realtime + Storage | 500MB DB, 50k monthly active users |
| **Mapbox** (`charan0622`) | Maps, directions, geocoding | 50k map loads/month, 100k direction requests |
| **Google AI Studio** | Gemini 1.5 Flash API | 60 requests/minute |
| **Groq** | Whisper speech-to-text | Free tier for STT |
| **Vercel** | Frontend hosting + edge functions | Hobby tier, auto-deploy from GitHub |

**Git push:** `Phase 0` committed as `587a6de` and pushed.

---

## Phase 1 — MVP Build (2026-04-19)

### Week 1: Foundation

#### 1.1 CI Pipeline (`2970d14`)

Created `.github/workflows/ci.yml`:
```yaml
# Runs on every push to main and every PR
# Steps: checkout → setup pnpm → setup Node 20 → pnpm install --frozen-lockfile
# Then: turbo run typecheck → turbo run lint → turbo run build
```

**What is a CI pipeline?** Continuous Integration automatically runs checks (type-checking, linting, building) on every code change. If any step fails, the PR is blocked. This catches bugs before they reach `main`.

#### 1.2 Supabase Schema — Migration 1 (`00001_organizations_profiles.sql`)

Ran in Supabase SQL Editor:
```sql
CREATE TABLE organizations (id uuid PK, name, timezone, created_at, updated_at);
CREATE TABLE profiles (id uuid PK → auth.users, organization_id → organizations, role, full_name, ...);
```

**Key decisions:**
- `profiles.id` references `auth.users` — extends Supabase's built-in auth with app-specific fields
- `role` is a CHECK constraint enum: `dispatcher`, `firefighter`, `chief`, `admin`
- RLS (Row-Level Security) enabled on both tables:
  - Users can only read their own profile
  - Admins/dispatchers can read all profiles in their org
  - Organizations only visible to their members
- `update_updated_at()` trigger automatically sets `updated_at` on any row change

**What is RLS?** Row-Level Security is PostgreSQL's built-in access control at the database level. Every query is filtered by policies — even if the API is compromised, a user can never see another organization's data. The database is the security boundary, not the API layer.

Seeded: 1 organization ("San Jose Fire Department") via Supabase REST API.

#### 1.3 Auth Flow

**Dependencies installed:**
```bash
pnpm add --filter web @supabase/supabase-js @supabase/ssr
```

**Files created:**
- `apps/web/lib/supabase/client.ts` — browser-side Supabase client using `createBrowserClient` from `@supabase/ssr`
- `apps/web/lib/supabase/server.ts` — server-side client using `createServerClient` with cookie handling via `next/headers`
- `apps/web/lib/supabase/middleware.ts` — session refresh logic for Next.js middleware
- `apps/web/middleware.ts` — intercepts every request:
  - If no session and not on a public route (`/login`, `/signup`, `/api/health`) → redirect to `/login`
  - If logged in and visiting `/login` or `/signup` → redirect to `/`
- `apps/web/app/login/page.tsx` — email/password login + magic link option
- `apps/web/app/signup/page.tsx` — registration with role selection, creates profile row linked to SJFD org
- `apps/web/app/api/auth/callback/route.ts` — handles magic link callback, exchanges code for session
- `apps/web/app/api/auth/logout/route.ts` — signs out and redirects to `/login`
- `apps/web/app/api/health/route.ts` — public health check returning `{ data, error, meta }` envelope

**What is `@supabase/ssr`?** A helper library that manages Supabase auth sessions in server-rendered frameworks like Next.js. It reads/writes session tokens via cookies (not localStorage) so the session is available in both Server Components and Route Handlers.

**What is middleware in Next.js?** Code that runs before every request reaches a page or API route. Ours checks if the user has a valid Supabase session and redirects unauthenticated users to login.

#### 1.4 Responsive Shell

**Dependencies installed:**
```bash
pnpm add --filter web next-themes lucide-react
```

**Files created:**
- `apps/web/components/ThemeProvider.tsx` — wraps the app with `next-themes` for dark mode (defaults to dark, no system detection)
- `apps/web/components/LogoutButton.tsx` — form-based POST to `/api/auth/logout`
- `apps/web/app/(desktop)/layout.tsx` — sidebar layout with nav items (Incidents, Live Map, Dispatch, Analytics, Crew, Settings) using Lucide icons. Only renders at `lg:` breakpoint (≥1024px)
- `apps/web/app/(responder)/layout.tsx` — mobile layout with top bar + bottom tab bar (Incidents, Map, Alerts, Profile). Only renders below `lg:` breakpoint

**What is `next-themes`?** A tiny library that manages theme state (dark/light) by toggling a CSS class on `<html>`. It prevents the flash of unstyled content on page load by injecting a blocking script.

**What is Lucide React?** An icon library with 1000+ SVG icons as React components. Tree-shakeable — only the icons you import are included in the bundle.

#### 1.5 Design System Primitives

**Dependencies installed:**
```bash
pnpm add class-variance-authority clsx tailwind-merge
```

**Components built in `packages/ui/src/components/`:**

1. **`SeverityBadge.tsx`** — colored badge for incident severity (critical/high/medium/low). Uses CVA (Class Variance Authority) for type-safe variant props.

2. **`StatusPill.tsx`** — status indicator with a colored dot + label (Open, Triaged, Dispatched, On Scene, Resolved, Cancelled).

3. **`IncidentCard.tsx`** — card component showing: severity badge, status pill, incident type, address (with MapPin icon), time (with Clock icon), assigned count (with Users icon). Clickable button element.

**What is CVA (Class Variance Authority)?** A utility for building component variants with Tailwind. Instead of writing conditional className strings, you define a schema of variants and CVA generates the correct classes. Type-safe — TypeScript knows exactly which variants exist.

**What is `tailwind-merge`?** Merges Tailwind classes intelligently — if you pass both `px-2` and `px-4`, it keeps only `px-4` (the last one wins). Prevents conflicting utility classes when composing components.

#### 1.6 PWA Foundations

**Files created:**
- `apps/web/public/sw.js` — Service Worker that:
  - On install: caches the app shell (HTML, manifest, icons)
  - On fetch: cache-first for static assets, network-first for API calls
  - On push: shows a notification with title, body, icon, vibration pattern
  - On notificationclick: opens the specific URL from the notification payload
- `apps/web/components/ServiceWorkerRegister.tsx` — registers the SW on first mount
- `apps/web/components/InstallPrompt.tsx` — mobile-only banner that captures the `beforeinstallprompt` event and offers an "Install Flarepath" button

**What is a Service Worker?** A script that runs in a separate thread from the main page. It can intercept network requests (for caching/offline support), receive push notifications even when the app is closed, and enable "Add to Home Screen" installation. It's what makes a website a PWA.

**Git push:** Week 1 committed as `2970d14`.

---

### Week 2: Incidents & AI Triage

#### 2.1 Full Database Schema — Migration 2 (`00002_full_schema.sql`)

First enabled PostGIS extension, then created 7 tables:

| Table | Purpose | Key Columns |
|---|---|---|
| `stations` | Fire station locations | `location geography(POINT, 4326)`, GIST index |
| `vehicles` | Engines, ladders, tankers | `type`, `status`, `current_location geography`, GIST index |
| `incidents` | Emergency events | `location geography`, `type`, `severity`, `status`, `hazards text[]` |
| `ai_triage` | AI classification output | `predicted_type`, `predicted_severity`, `confidence`, `reasoning`, `latency_ms` |
| `dispatches` | Vehicle assignments | `route_geojson`, `distance_m`, `eta_seconds`, status timestamps |
| `location_pings` | GPS breadcrumbs | `location geography`, `speed_kmh`, `heading`, BRIN index on `recorded_at` |
| `audit_log` | State change history | `entity_type`, `entity_id`, `action`, `diff jsonb` |

**What is PostGIS?** A PostgreSQL extension that adds geospatial data types (`geography(POINT, 4326)`) and spatial operators. The `<->` operator with a GIST index finds the nearest neighbors in O(log n) — crucial for "find the 3 closest engines to this incident."

**What is SRID 4326?** The coordinate system used by GPS (WGS84). Every location is stored as latitude/longitude on the Earth's ellipsoid surface. Distance calculations account for the Earth's curvature.

**What is a GIST index?** Generalized Search Tree — a special index type for spatial data that supports nearest-neighbor queries efficiently. Without it, finding the closest vehicle would require scanning every row.

**What is a BRIN index?** Block Range INdex — compact index for naturally ordered data like timestamps. Used on `location_pings.recorded_at` and `audit_log.created_at` because these are append-only and naturally chronological.

RLS policies created for every table following the principle of least privilege. Seeded via REST API: 3 stations, 6 vehicles, 2 historical incidents.

#### 2.2 Incident CRUD API

**Files created:**
- `apps/web/lib/api-response.ts` — `apiSuccess(data, status)` and `apiError(message, status)` helpers that return the standard `{ data, error, meta: { traceId } }` envelope
- `apps/web/app/api/incidents/route.ts`:
  - `POST` — creates incident with Zod-validated body, auto-assigns `organization_id` from the user's profile
  - `GET` — lists incidents with optional filters (`status`, `severity`), pagination (`limit`, `offset`), sorted by `created_at` desc
- `apps/web/app/api/incidents/[id]/route.ts`:
  - `GET` — returns incident + triage + dispatches (parallel fetch)
  - `PATCH` — updates incident with state machine enforcement. Invalid transitions (e.g., `resolved` → `open`) return `409 Conflict`

**State machine for incidents:**
```
open → triaged → dispatched → on_scene → resolved
                                       ↘ cancelled (from any non-terminal state)
```

**What is a state machine?** A model where an entity can only be in one state at a time, and only certain transitions between states are allowed. The `INCIDENT_TRANSITIONS` map defines these rules, and the API enforces them server-side — the UI can never put an incident into an illegal state.

#### 2.3 Gemini Triage Agent

**Dependencies installed:**
```bash
pnpm add --filter web @google/generative-ai
```

**Files created:**
- `apps/web/lib/ai/triage.ts` — the core AI module:
  1. **System prompt** with 8 few-shot examples covering edge cases
  2. Calls Gemini 1.5 Flash with `responseMimeType: "application/json"` for structured output
  3. Validates response against `TriageOutputSchema` (Zod)
  4. **On validation failure:** retries once with error feedback ("your previous response failed validation: ...")
  5. **On second failure:** falls back to `ruleBasedTriage()` — a keyword/regex classifier that always produces valid output
  6. Returns: `{ output, latency_ms, model, prompt_hash }`

- `apps/web/app/api/ai/triage/route.ts`:
  - `POST` with `{ incident_id }` — fetches the incident, runs triage, upserts result into `ai_triage` table, updates incident severity and status to "triaged"
  - Uses service role key (not user session) because this is a server-to-server call

**What is structured output mode?** Instead of asking the LLM for free-text and hoping it returns JSON, `responseMimeType: "application/json"` constrains the model to only produce valid JSON. Combined with a Zod schema, we get type-safe AI outputs.

**Why a fallback classifier?** LLMs can fail — rate limits, malformed output, network errors. The rule-based fallback ensures the system always produces a triage, even if it's lower quality. This is production thinking, not demo thinking.

#### 2.4 Incident Feed UI

**Dependencies installed:**
```bash
pnpm add --filter web @tanstack/react-query
```

**Files created:**
- `apps/web/components/QueryProvider.tsx` — wraps the app with `QueryClientProvider` (30s stale time, refetch on window focus)
- `apps/web/components/IncidentFeed.tsx` — live incident list:
  - Fetches via `useQuery` → `GET /api/incidents`
  - Subscribes to Supabase Realtime `postgres_changes` on the `incidents` table — any insert/update/delete triggers `refetch()`
  - Sorts by severity (critical first) then by time (newest first)
  - Each incident rendered as an `IncidentCard`
- `apps/web/components/IncidentDetail.tsx` — right-side detail pane showing: severity badge, status pill, description, address, reporter info, hazards, AI triage output (confidence %, reasoning, recommended vehicles, model + latency)
- `apps/web/components/DashboardShell.tsx` — composes the three-panel desktop layout: feed (left 320px) + map (center flex) + detail (right 384px, conditional)

**What is TanStack Query?** A data-fetching library that manages server state — caching, background refetching, optimistic updates, pagination. Unlike `useEffect` + `useState`, it handles loading/error states, deduplication, and cache invalidation automatically.

**What is Supabase Realtime?** A WebSocket layer built into Supabase that streams PostgreSQL changes to connected clients. When an incident is created in one browser tab, every other tab receives the change within ~200ms via the `postgres_changes` subscription.

#### 2.5 Live Map

**Dependencies installed:**
```bash
pnpm add --filter web mapbox-gl
pnpm add --filter web -D @types/mapbox-gl
```

**File created:** `apps/web/components/LiveMap.tsx`
- Initializes Mapbox GL JS with `dark-v11` style centered on San Jose
- Renders station markers (blue circles with house emoji)
- Renders incident markers (severity-colored glowing circles)
- Clicking an incident marker calls `onIncidentClick` to open the detail pane
- Subscribes to Supabase Realtime to refresh markers when incidents change
- Accepts optional `routeGeoJSON` prop to render the red dispatch path

**What is Mapbox GL JS?** A WebGL-powered map library that renders vector tiles in the browser. Unlike Google Maps (raster tiles), vector maps are smooth at any zoom level, support 3D pitch/rotation, and can be styled completely (dark mode, custom colors). The `dark-v11` style is optimized for night-shift dispatchers.

#### 2.6 New Incident Form

**Dependencies installed:**
```bash
pnpm add --filter web react-hook-form @hookform/resolvers
```

**File created:** `apps/web/components/NewIncidentModal.tsx`
- Modal form with fields: reporter name, phone, incident type (dropdown), address (with autocomplete), description (textarea), hazards (toggle chips)
- **Address autocomplete** calls the Mapbox Geocoding API: `https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json` with proximity bias to San Jose
- Selecting an address auto-fills latitude/longitude
- On submit: creates incident → triggers AI triage → invalidates TanStack Query cache → opens detail pane with AI output
- Zod validation on all fields via `zodResolver` integration with React Hook Form

**What is Mapbox Geocoding?** An API that converts text addresses into coordinates (and vice versa). The `proximity` parameter biases results toward a location — so typing "Main St" returns San Jose results, not New York.

**Git push:** Week 2 committed as `f0acbe0`.

---

### Week 3: Dispatch & Routing

#### 3.1 Resource Recommendation

**File created:** `packages/core/src/domain/scoring.ts`

Scoring function that ranks available vehicles for an incident:
```
score = 0.40 × distance_score      (closer is better, normalized 0-1)
      + 0.30 × type_match_score    (1.0 if preferred type, 0.3 if not)
      + 0.15 × availability_score  (always 1.0 for available vehicles)
      + 0.15 × load_score          (prefer stations with more free vehicles)
```

Type preferences map incident types to vehicle types:
- `structure_fire` → engine + ladder
- `vehicle_fire` → engine + tanker
- `hazmat` → engine + rescue
- etc.

**API endpoint:** `GET /api/dispatch/recommend?incidentId=...`
- Fetches the incident and all available vehicles
- Calculates haversine distance from each vehicle's station to the incident
- Applies scoring, sorts by score descending
- Returns: vehicle_id, call_sign, type, station_name, distance_km, eta_minutes, score

**What is haversine distance?** The shortest distance between two points on a sphere, calculated from their latitudes and longitudes. More accurate than Euclidean distance for geographic coordinates because it accounts for the Earth's curvature.

#### 3.2 Dispatch API

**Files created:**
- `apps/web/app/api/dispatch/route.ts` — `POST` creates a dispatch:
  1. Validates body with Zod (incident_id, vehicle_id, optional route data)
  2. Inserts dispatch row with status "assigned"
  3. Updates vehicle status to "dispatched"
  4. Updates incident status to "dispatched"
- `apps/web/app/api/dispatch/[id]/status/route.ts` — `POST` updates dispatch status:
  - Enforces state machine: `assigned → acknowledged → en_route → on_scene → returning → completed`
  - Sets the corresponding timestamp field (`acknowledged_at`, `en_route_at`, etc.)
  - On "completed": marks vehicle as "available" again
  - On "on_scene": updates incident status to "on_scene"

#### 3.3 Mapbox Routing Integration

**File created:** `apps/web/app/api/route/optimize/route.ts`
- `GET` with origin/destination coordinates
- Calls Mapbox Directions API with: `driving-traffic` profile, `steps=true`, `voice_instructions=true`, `banner_instructions=true`, `geometries=geojson`
- Returns: `distance_m`, `duration_s`, `geometry` (GeoJSON LineString), `steps` (turn-by-turn instructions)
- **5-minute in-memory cache** keyed by origin→destination to avoid redundant API calls

**What is the Mapbox Directions API?** A routing service that computes the optimal driving path between points. The `driving-traffic` profile accounts for real-time traffic data. It returns a GeoJSON polyline that can be rendered directly on the map, plus step-by-step maneuver instructions for voice navigation.

#### 3.4 Dispatch UI + Red Path Rendering

**File created:** `apps/web/components/DispatchModal.tsx`
- Fetches vehicle recommendations on open
- Shows top 3 vehicles with score, distance, ETA, station name
- "Show all" expands to see every available vehicle
- On "Confirm Dispatch": fetches route → creates dispatch → invalidates queries

**LiveMap updated** to accept `routeGeoJSON` prop:
- Renders two line layers: glow (width 12, blur 8, opacity 0.4) + main line (width 6, opacity 0.9)
- Both in `#ff2d2d` with round caps and joins
- `map.fitBounds()` auto-zooms to show the full route with padding

**IncidentDetail updated** with:
- "Dispatch Resources" button (visible when status is open/triaged)
- Dispatched units section showing vehicle, status, ETA, distance
- Wired up DispatchModal

#### 3.5 Web Push Infrastructure

**Dependencies installed:**
```bash
pnpm add --filter web web-push
pnpm add --filter web -D @types/web-push
```

**Files created:**
- `apps/web/app/api/push/subscribe/route.ts` — stores the browser's push subscription on the user's profile
- `apps/web/app/api/push/send/route.ts` — sends a VAPID-signed push notification with severity emoji (🔴🟠🟡🟢) in the title

**What is Web Push?** A W3C standard that lets servers send notifications to browsers even when the page is closed. The flow: browser requests permission → gets a subscription object (endpoint URL + keys) → server stores it → server sends encrypted payload to the endpoint → browser's Service Worker receives it and shows a notification.

**Git push:** Week 3 committed as `a2a3ac0`.

---

### Week 4: Mobile Responder & Navigation

#### 4.1 Responder Incident View

**File created:** `apps/web/app/(responder)/incident/[id]/page.tsx`
- Mobile-optimized layout: map takes 70% height, bottom sheet takes 30%
- Shows incident type, severity, address, hazards
- **Big status buttons** (56px min height, full-width, colored):
  - Acknowledge (orange) → En Route (yellow) → On Scene (green) → Returning (blue) → Clear (gray)
  - Each button hits `POST /api/dispatch/:id/status`
  - Haptic feedback via `navigator.vibrate(50)` on Android
- "Navigate" button appears after acknowledging — routes to `/navigate/[dispatchId]`
- "Open in Google Maps" fallback deep link: `https://www.google.com/maps/dir/?api=1&destination=...&travelmode=driving&dir_action=navigate`

#### 4.2 In-Browser Turn-by-Turn Navigation (★ Centerpiece)

**File created:** `apps/web/app/(responder)/navigate/[dispatchId]/page.tsx`

This is the feature that makes recruiters lean forward. A full-screen navigator built entirely from browser APIs:

1. **3D Map Camera** — Mapbox GL at `pitch: 60°, zoom: 17` with `navigation-night-v1` style
2. **Red Route** — two-layer rendering (glow + line) on the map
3. **GPS Tracking** — `navigator.geolocation.watchPosition` with high accuracy, 1s max age
4. **Camera Follow** — `map.easeTo()` smoothly moves to the user's position with heading-based bearing
5. **Step Tracking** — haversine distance to each maneuver point, finds the nearest upcoming step
6. **Voice Guidance** — `SpeechSynthesisUtterance` speaks instructions at 250m and 50m before each turn
7. **Screen Wake Lock** — `navigator.wakeLock.request('screen')` keeps the phone awake during navigation
8. **GPS Pings** — sends position to `POST /api/location/ping` every update, dispatcher sees vehicle move on their map

**Browser APIs used:**
| API | Purpose |
|---|---|
| `Geolocation.watchPosition` | Stream GPS coordinates continuously |
| `SpeechSynthesis` | Text-to-speech for turn instructions (free, offline) |
| `Screen Wake Lock` | Prevent screen from sleeping during navigation |
| `Vibration` | Haptic feedback on button tap (Android only) |

#### 4.3 Live Vehicle Tracking

**File created:** `apps/web/app/api/location/ping/route.ts`
- `POST` accepts single ping or batch (up to 10)
- Looks up `vehicle_id` from the dispatch
- Inserts ping(s) into `location_pings` with `POINT(lng lat)` geography
- Updates `vehicles.current_location` with the latest position

#### 4.4 Off-Route Detection

Built into the navigation page:
- Haversine distance calculated from current position to each route step
- When distance exceeds threshold → can re-fetch route from current position
- Voice announces "Recalculating..." via SpeechSynthesis

**Git push:** Week 4 committed as `26deef4`.

---

## Tech Stack Definitions

| Technology | What It Is | Why We Use It |
|---|---|---|
| **Next.js 14** | React meta-framework with App Router, RSC, and Route Handlers | Server components for fast loads; API routes eliminate a separate backend; deploys to Vercel for free |
| **TypeScript (strict)** | Typed superset of JavaScript | Catches bugs at compile time; critical for a system where wrong data can cause dispatch errors |
| **Tailwind CSS** | Utility-first CSS framework | Rapid styling with design tokens; no CSS-in-JS runtime cost |
| **CVA (Class Variance Authority)** | Type-safe component variant builder | Defines severity/status visual variants as code, not conditional strings |
| **Turborepo** | Monorepo build orchestrator | Caches builds across packages; single `pnpm dev` starts everything |
| **pnpm** | Fast, disk-efficient package manager | Workspace-native; strict dependency resolution prevents phantom deps |
| **Zod** | TypeScript-first schema validation | Shared between client and server; validates AI outputs, API inputs, DB rows |
| **TanStack Query v5** | Server state management for React | Handles caching, refetching, optimistic updates, background sync |
| **React Hook Form** | Performant form library | Minimal re-renders; pairs with Zod for validated forms |
| **Supabase** | Postgres + Auth + Realtime + Storage as a service | RLS for row-level security; built-in WebSocket realtime; generous free tier |
| **PostGIS** | Geospatial extension for PostgreSQL | Enables `geography(POINT)` columns and `<->` nearest-neighbor queries with GIST indexes |
| **Mapbox GL JS** | WebGL vector map library | Dark theme, 3D pitch for navigation, vector tiles, clustering |
| **Mapbox Directions API** | Driving route computation | Returns GeoJSON polyline + turn-by-turn steps with voice instructions |
| **Mapbox Geocoding API** | Address → coordinates conversion | Powers the address autocomplete in the incident form |
| **Google Gemini 1.5 Flash** | LLM for structured text analysis | Incident triage with JSON output mode, 60 RPM free tier |
| **Groq Whisper** | Speech-to-text API | Voice intake for dispatcher dictation (Phase 2) |
| **Web Push (VAPID)** | Browser push notification standard | Free, no Firebase; dispatches notify responders instantly |
| **Web Speech API** | Browser-native text-to-speech | Voice-guided turn-by-turn navigation, zero cost |
| **Wake Lock API** | Screen sleep prevention | Keeps phone awake during active navigation |
| **Geolocation API** | GPS position streaming | Real-time vehicle tracking via `watchPosition` |
| **Vercel** | Frontend deployment platform | Free hobby tier; auto-deploy from GitHub; edge functions |
| **web-push (npm)** | VAPID push notification sender | Server-side library for sending encrypted push payloads |

---

## Repo Structure (After Phase 1)

```
flarepath/
├── .github/workflows/ci.yml          # CI: typecheck → lint → build
├── .venv/                             # Python venv with pnpm
├── .env.example                       # Template for environment variables
├── .gitignore
├── package.json                       # Workspace root (turbo scripts)
├── pnpm-workspace.yaml
├── turbo.json
├── CLAUDE.md                          # AI assistant instructions
├── PLAN.md                            # Phase/task breakdown
├── Flarepath-Project-Doc.md           # Full design document
├── instructions.md                    # ← this file
│
├── apps/web/                          # Next.js 14 application
│   ├── .env.local                     # Actual API keys (git-ignored)
│   ├── middleware.ts                  # Auth session enforcement
│   ├── app/
│   │   ├── layout.tsx                 # Root: ThemeProvider + QueryProvider + SW + InstallPrompt
│   │   ├── page.tsx                   # Dashboard shell (feed + map + detail)
│   │   ├── globals.css                # Tailwind + severity CSS vars
│   │   ├── login/page.tsx             # Email/password + magic link
│   │   ├── signup/page.tsx            # Registration with role selection
│   │   ├── (desktop)/layout.tsx       # Sidebar nav (lg+ viewport)
│   │   ├── (responder)/
│   │   │   ├── layout.tsx             # Bottom tab bar (<lg viewport)
│   │   │   ├── incident/[id]/page.tsx # Mobile incident view + status buttons
│   │   │   └── navigate/[dispatchId]/page.tsx  # ★ Turn-by-turn navigation
│   │   └── api/
│   │       ├── health/route.ts
│   │       ├── auth/callback/route.ts
│   │       ├── auth/logout/route.ts
│   │       ├── incidents/route.ts         # POST + GET (list)
│   │       ├── incidents/[id]/route.ts    # GET (detail) + PATCH (update)
│   │       ├── ai/triage/route.ts         # POST (run Gemini triage)
│   │       ├── dispatch/route.ts          # POST (create dispatch)
│   │       ├── dispatch/recommend/route.ts # GET (ranked recommendations)
│   │       ├── dispatch/[id]/status/route.ts # POST (update dispatch status)
│   │       ├── route/optimize/route.ts    # GET (Mapbox Directions)
│   │       ├── location/ping/route.ts     # POST (GPS pings)
│   │       ├── push/subscribe/route.ts    # POST (store push subscription)
│   │       └── push/send/route.ts         # POST (send push notification)
│   ├── components/
│   │   ├── ThemeProvider.tsx
│   │   ├── QueryProvider.tsx
│   │   ├── ServiceWorkerRegister.tsx
│   │   ├── InstallPrompt.tsx
│   │   ├── LogoutButton.tsx
│   │   ├── DashboardShell.tsx         # Three-panel desktop layout
│   │   ├── IncidentFeed.tsx           # Live incident list + realtime
│   │   ├── IncidentDetail.tsx         # Right pane with triage + dispatch
│   │   ├── IncidentCardWrapper.tsx    # Styled incident card
│   │   ├── LiveMap.tsx                # Mapbox map + markers + red path
│   │   ├── NewIncidentModal.tsx       # Form with geocoding + AI triage
│   │   └── DispatchModal.tsx          # Vehicle recommendations + confirm
│   ├── lib/
│   │   ├── supabase/client.ts         # Browser Supabase client
│   │   ├── supabase/server.ts         # Server Supabase client
│   │   ├── supabase/middleware.ts     # Session refresh logic
│   │   ├── ai/triage.ts              # Gemini triage + rule fallback
│   │   └── api-response.ts           # { data, error, meta } envelope
│   └── public/
│       ├── manifest.json              # PWA manifest
│       ├── sw.js                      # Service Worker
│       ├── favicon.ico
│       └── icons/                     # SVG + PNG icons
│
└── packages/
    ├── config/
    │   ├── tsconfig.base.json
    │   └── tailwind.preset.js
    ├── core/
    │   └── src/
    │       ├── schemas/incidents.ts    # Zod schemas + state machine
    │       ├── domain/scoring.ts      # Vehicle recommendation scoring
    │       └── seed/demo-city.ts      # San Jose stations + scenarios
    ├── ui/
    │   └── src/
    │       ├── tokens.ts              # Design tokens
    │       ├── cn.ts                  # Tailwind merge utility
    │       └── components/            # SeverityBadge, StatusPill, IncidentCard
    ├── api-client/src/                # (Hooks to be added)
    └── supabase/
        ├── src/client.ts              # Browser client
        ├── src/server.ts              # Admin client
        └── migrations/
            ├── 00001_organizations_profiles.sql
            └── 00002_full_schema.sql
```

---

## Git History

| Commit | Date | Description |
|---|---|---|
| `587a6de` | 2026-04-17 | Phase 0: Project scaffold — monorepo, Next.js 14, shared packages, visual identity |
| `2970d14` | 2026-04-19 | Phase 1 Week 1: Foundation — auth, responsive shell, design system, PWA |
| `f0acbe0` | 2026-04-19 | Phase 1 Week 2: Incidents, AI triage, live map, incident form |
| `a2a3ac0` | 2026-04-19 | Phase 1 Week 3: Dispatch, routing, red path, Web Push |
| `26deef4` | 2026-04-19 | Phase 1 Week 4: Mobile responder, turn-by-turn navigation, GPS tracking |
| `29f28b4` | 2026-04-19 | Phase 1 complete: Polish pass, README, comprehensive build log |

---

## Phase 2 — Depth (2026-04-19)

### Week 5: Voice Intake & AI Summaries

#### 5.1 Groq Whisper Transcription

**Dependencies installed:**
```bash
pnpm add --filter web groq-sdk
```

**File created:** `apps/web/app/api/ai/transcribe/route.ts`
- `POST` accepts `multipart/form-data` with an `audio` file field
- Sends to Groq's Whisper Large V3 model for transcription
- Returns: `{ text, model, latency_ms }`

**What is Groq?** An AI inference company with specialized hardware (LPUs) that runs models extremely fast. Their Whisper API transcribes audio in near-real-time. Free tier is generous enough for demo traffic.

**What is Whisper?** OpenAI's open-source speech recognition model. Whisper Large V3 handles accented English, background noise, and domain-specific vocabulary (fire/emergency terms) well.

#### 5.2 Voice-to-Incident Extraction

**Files created:**
- `apps/web/lib/ai/extract.ts` — sends transcript to Gemini with a structured extraction prompt. Pulls out: reporter name, phone, address, incident type, description, hazards. Falls back to raw transcript if extraction fails.
- `apps/web/app/api/ai/extract/route.ts` — `POST` endpoint wrapping the extraction function
- `apps/web/components/VoiceRecorder.tsx` — browser microphone recorder:
  1. Uses `navigator.mediaDevices.getUserMedia({ audio: true })` to capture mic
  2. Records with `MediaRecorder` API to webm format
  3. On stop: sends audio to `/api/ai/transcribe` → gets text
  4. Sends text to `/api/ai/extract` → gets structured fields
  5. Auto-fills the new incident form with extracted data

**Wired into:** `NewIncidentModal.tsx` — "Dictate incident" button appears above the form. Clicking starts recording, stopping triggers the transcribe → extract → prefill pipeline.

**End-to-end flow:**
```
Dispatcher speaks → MediaRecorder (webm) → Groq Whisper (text) → Gemini (structured JSON) → form fields populated
```
Target latency: <3 seconds total.

#### 5.3 Post-Incident AI Summary

**Migration created:** `00003_incident_reports.sql`
- `incident_reports` table: `ai_summary`, `cause`, `response_time_seconds`, `units_involved`, `injuries`, `fatalities`
- RLS: org members can read, service role can insert/update

**Files created:**
- `apps/web/lib/ai/summarize.ts` — sends incident data to Gemini, gets back: 3-paragraph summary, probable cause, response time assessment, key actions, recommendations
- `apps/web/app/api/ai/summarize/[incidentId]/route.ts` — `POST` fetches incident + dispatches, generates summary, calculates response time from dispatch timestamps, upserts into `incident_reports`

---

### Week 6: Analytics Dashboard

**Dependencies installed:**
```bash
pnpm add --filter web recharts
```

**What is Recharts?** A React charting library built on D3. It provides declarative chart components (BarChart, PieChart, LineChart) that integrate naturally with React state and props.

**Files created:**
- `apps/web/app/api/analytics/route.ts` — `GET` aggregates all incident/dispatch/vehicle data:
  - Summary stats: total incidents, active count, dispatches, avg response time, fleet status
  - Chart data: incidents by status, by type, by severity, per day timeline, response times array
- `apps/web/app/(desktop)/analytics/page.tsx` — full analytics page:
  - **4 stat cards:** total incidents, dispatches, avg response time, fleet utilization
  - **Bar chart:** incidents by type (color-coded)
  - **Pie chart:** severity distribution (using severity colors)
  - **Line chart:** incidents over time (daily trend)
  - **CSV export** button: downloads summary metrics as a .csv file

---

### Week 7: A* Pathfinding & Heatmap

#### 7.1 A* Pathfinding (Offline Routing Fallback)

**File created:** `packages/core/src/domain/routing/astar.ts`

Full A* implementation in pure TypeScript:
- **MinHeap** priority queue for O(log n) pop operations
- **Haversine heuristic** for geographic accuracy (accounts for Earth curvature)
- **Graph structure:** nodes (intersections) + weighted edges (road segments, weight = travel time in seconds)
- **`buildSimpleGraph()`** utility: takes a list of lat/lng points and connects each to its N nearest neighbors
- Returns: path (node IDs), coordinates (for rendering), total distance, total time

**API endpoint:** `GET /api/route/fallback` — same interface as `/api/route/optimize` but uses A* instead of Mapbox. Used when Mapbox rate-limits or is unreachable.

**What is A*?** A graph search algorithm that finds the shortest path between two nodes. Unlike Dijkstra (which explores all directions equally), A* uses a heuristic (estimated distance to goal) to prioritize nodes that are likely closer to the destination. This makes it much faster in practice. Haversine distance is the heuristic because it gives the straight-line distance on a sphere.

**Why build a custom fallback?** Two reasons: (1) demo reliability — if Mapbox rate-limits during a live demo, the app still routes; (2) interview talking point — shows you understand pathfinding algorithms, not just API calls.

#### 7.2 Predictive Heatmap

**File created:** `apps/web/components/HeatmapToggle.tsx`
- Mapbox heatmap layer using `type: "heatmap"` with weighted density points
- Color ramp: transparent → green → yellow → orange → red (matches severity palette)
- Toggle button in the top-right corner of the map
- Uses sample historical incident density data (in production, would pull from API)

**What is a heatmap layer?** A Mapbox layer type that visualizes point density using color gradients. Each point has a weight (0-1), and areas with many high-weight points glow red while sparse areas stay green. Useful for briefings — dispatchers can see at a glance which neighborhoods have the most incidents.

---

## Phase 3 — UX Overhaul, Command-Centre Analytics & Role Consoles (2026-04-19 → 2026-04-20)

A comprehensive design-language pass plus three new full-page experiences. The app went from "working demo" to "portfolio piece" in this phase.

### 3.1 Glass Design System

**Files:** `apps/web/app/globals.css`, `apps/web/components/BrandMark.tsx`, `apps/web/components/NavRail.tsx`, `apps/web/components/MapResetButton.tsx`

- Added CSS tokens: `.glass`, `.glass-strong`, `.glass-strip`, `.glass-card`, `.glass-row`, `.glass-divider-{t,b,l,r}`. Each uses `backdrop-filter: blur(24–32px) saturate(140–160%)` over a translucent base, with 1px subtle borders and standardized 180ms transitions for hover states.
- **Body backdrop** is now three layered radial gradients (red top-left, blue bottom-right, purple mid) anchored to the viewport — gives every glass panel something to blur against.
- **`BrandMark` component** — single source of truth for the Flarepath identity. Red radial-gradient rounded tile containing a layered SVG: emergency siren dome with glow rays, horizon seam, and a faceted two-tone navigation arrow below. Supports `showWord`, `subtitle`, `hideMark`, `animated` props; used in the nav rail, every page header, and the login screen.
- **`NavRail`** — 56px left icon rail shared across Dispatch, Teams, and Analytics. Pulsing brand mark at top, three nav items (Dispatch/Teams/Analytics) with active-state gradient glow and red left-edge indicator, Logout at bottom, tooltips on hover.
- **`MapResetButton`** — small glass home button pinned top-right on every Mapbox instance; `flyTo` restores each map's initial camera.

### 3.2 Dispatcher Dashboard (full redesign)

**Files:** `apps/web/components/DashboardShell.tsx`, `apps/web/components/LiveMap.tsx`, `apps/web/components/IncidentDetail.tsx`, `apps/web/components/UnitDetailPanel.tsx`, `apps/web/components/IncidentTicker.tsx`, `apps/web/components/StationDetailPopover.tsx`

- Grid swapped from floating glass panels to a real 4-column CSS grid: `[56px rail][300px feed][1fr map][conditional detail overlay]`. Header + ticker span the content columns; rail spans all rows.
- **LiveMap** vehicles now render as **directional chevron markers** — the arrow rotates to match the bearing of the current route segment (real compass math with `atan2(dx, dy)`). Motion is single-trip, paced to the dispatch's real `eta_seconds` (no more looping demo animation).
- **Clickable vehicle arrows** → `UnitDetailPanel` slides in from the right as a transparent glass overlay (framer-motion spring, `stiffness: 260, damping: 28`). Shows captain, crew, radio channel, ETA, distance, certifications.
- **Clickable station markers** (FS-01/FS-07/FS-30) → `StationDetailPopover` — centered glass dialog with Battalion Chief, 3 shift commanders, housed apparatus + full crew per unit, coverage area, specialties, radio frequencies, phone, established year.
- **Dispatched route** is a 3-layer animated line (glow + base + marching dashes cycling through 16 keyframes) — the classic "red flarepath" product signature.
- **Incident markers** are asymmetric fire emblems with pulsing severity halos, auto-selected type-label chips, and grounding rays.
- **Ticker** at the bottom is a marquee of active incidents + units with a pulsing LIVE badge and edge-fade mask.
- **Resolve flow** — new `POST /api/incidents/[id]/resolve` endpoint that cascades: completes all active dispatches, frees vehicles, marks incident resolved. Triggers a toast + browser Notification when any incident transitions into resolved.

### 3.3 Teams / Crew Management page

**Files:** `apps/web/app/teams/page.tsx`, `apps/web/components/teams/*`, `apps/web/lib/crew-data.ts`, `apps/web/lib/crew-store.tsx`

- New route **/teams** — three-pane crew management at 56/320/1fr/360 grid.
- **Left:** units list sorted alphabetically, custom units tagged with a sparkle icon, `+ New` button.
- **Center:** unit editor — inline rename, delete, shift toggle (A/B/C), radio-channel + station edit, captain card (gold), member rows with ↑ promote-to-captain and × remove-from-unit actions, an `+ Add new firefighter` inline form.
- **Right:** personnel pool — search by name/badge/rank, click `Assign →` or drag-drop any member onto a unit in the list or into the editor; new members can be hired directly into the pool.
- **Native HTML5 drag-and-drop** — no new dependency. Pool items become draggable with a grip-handle affordance; unit list rows + the roster panel light up green-dashed on hover.
- **`CrewProvider` + `useCrew()`** — React Context + reducer crew store wrapped around the entire app in `layout.tsx`. Persists to `localStorage` under `flarepath.crew.v3`; seeded from `crew-data.ts` on first load. Actions: `addMember`, `removeMember`, `promoteCaptain`, `createUnit`, `deleteUnit`, `renameUnit`, `updateUnitMeta`, `addToPool`, `removeFromPool`, `reset`.
- **Unit display names** — each unit has a `displayName` field carrying a user-facing name (Agni/Vayu/Surya/Hanuman/Varuna/Bhima were experimented with, now back to the operational SJFD call-signs). Look up via `displayNameFor(callSign)` helper.

### 3.4 Analytics — 15-card Command-Centre Dashboard

**Files:** `apps/web/app/analytics/page.tsx`, `apps/web/app/api/analytics/route.ts`, `apps/web/components/analytics/*` (15 card files), `apps/web/lib/postgis.ts`, `apps/web/lib/nfirs-benchmark.ts`

Replaced the thin "4 stat cards + 3 charts" page with a research-grounded 15-card dashboard based on NFPA 1710, Motorola PremierOne, Hexagon OnCall, LAFD FireStatLA, NFIRS, and Fitch UHU doctrine.

**The cards:**
1. **NFPAGauge** — radial gauge of p90 total response vs. 390s target, with call-processing / turnout / travel / total segment bars.
2. **StressMeter** — concurrent incident pressure index 0–100% with threshold marker at 80.
3. **RouteEfficiency** — planned-vs-actual ETA accuracy gauge with a 30-sample dual-line sparkline.
4. **HotspotHeatmap** — Mapbox heatmap layer with 7/30/365-day toggle + severity weighting.
5. **IncidentForecast** — seasonal-naive 4-hour forecast with confidence cone (falls back to a diurnal baseline for empty DBs).
6. **CoverageIsochrones** — Mapbox station coverage rings (4-min red, 8-min orange), uncovered incidents pulsing.
7. **UnitStatusBoard** — kanban of Available/Assigned/Ack'd/En Route/On Scene/OOS with fatigue glow after 45 min on scene; clicking any unit opens **`UnitCrewPopover`** (centered glass dialog with captain + crew + radio).
8. **ResponseFlowMap** — Mapbox arc lines from station → scene, thickness = count, colour = severity, marching dashes animate direction.
9. **TurnoutLeaderboard** — station ranking with p90 bars, green-under-80s/red-over, sparklines per station.
10. **OutlierScatter** — Recharts scatter of travel × severity; critical/high over 6 min outlined white.
11. **UHUHeatmap** — apparatus × hour-of-day grid with blue→yellow→red gradient; cells >0.5 glow red.
12. **TriageConfidence** — violin-ish box plots per severity class with AI-dispatcher agreement-rate pill.
13. **NFIRSBenchmark** — dual-bar local mix vs. US federal baseline; deviation in percentage points.
14. **ResponseDistribution** — 30-second histogram with p50/NFPA/p90 reference lines.
15. **AIInsightsFeed** — horizontal snap-scroll of Gemini post-incident summaries with auto-extracted tags (`#water-supply-delay`, `#access-issue`, `#mutual-aid`).

**Backend engineering:**
- One comprehensive `/api/analytics` endpoint computes everything in parallel.
- **`lib/postgis.ts`** — EWKB-hex parser for PostGIS `geography(POINT, 4326)`. Turns Supabase's hex strings into `[lng, lat]`. Handles SRID flag, endianness, and validates lng/lat bounds.
- Every incident and station is enriched with parsed coordinates; falls back to a 10-address seed lookup, then to a deterministic hash-based demo coord if nothing matches — so the heatmap never goes blank.
- **Dispatch timestamp synthesis** — for dispatches that are terminal but missing `en_route_at`/`on_scene_at` (force-completed by resolve), the endpoint synthesizes plausible intervals from `assigned_at + eta_seconds` so turnout and outlier cards always populate.
- **Insights synthesis** — if `incident_reports` is empty, the endpoint builds pseudo-insights from `ai_triage.reasoning` + incident metadata for recent incidents.
- All map cards now defer `new mapboxgl.Map()` by one `requestAnimationFrame` so CSS grid has measured the cell before Mapbox sizes its canvas. Plus `m.resize()` on load + ResizeObserver.
- Every map card shows a data-count badge (`N pts`, `N flows`, `N stations · N inc`) so empty state is obvious.

### 3.5 New Routes Summary

- `/` — Dispatcher dashboard (redesigned)
- `/teams` — Crew management (new)
- `/analytics` — 15-card ops dashboard (new, replaces old `(desktop)/analytics`)
- `/login` — Role picker (BrandMark refresh)
- `/api/incidents/[id]/resolve` — New cascade endpoint
- `/api/analytics` — Comprehensive rewrite

### 3.6 Key Dependencies (unchanged — no new npm deps added)

Native HTML5 drag-and-drop, framer-motion for transitions, Recharts for charts, Mapbox GL JS v3 for maps, Supabase for data, Gemini for AI triage + post-incident summaries. Crew management and unit names are a React Context+reducer + localStorage — no Zustand needed.

### 3.7 What "Done" Looked Like

- Every page uses the same `BrandMark`, `NavRail`, `.glass-card`, and hover timing for visual uniformity.
- Every Mapbox instance has a reset button + resize observer + error logging.
- Every interactive element has a keyboard path (ESC closes modals, Enter submits forms, `N` opens New Incident).
- `pnpm turbo run typecheck` — no errors introduced by Phase 3 (pre-existing NewIncidentModal type warnings remain, unrelated).

---

## Phase 4 — Unit Chief Console (in progress)

Next up: `/chief/[dispatchId]` — the captain's command view with 20 features + 20 design elements (tactical canvas, dispatcher tether, streaming order reveal, orbital crew constellation, assignment rays, PAR clock, LUNAR Mayday, Gemini tactical briefing, post-incident PDF, etc.). Grounded in NFPA 1561 accountability, NFPA 1407 RIT, ICS-201, LUNAR Mayday mnemonic, IAFC CRM radio policy, and the Tablet Command / Adashi / MSA Connected Firefighter / Active911 / First Due real-world UIs.

---

*Last updated: 2026-04-20 — Phase 3 complete (glass UI, role consoles, 15-card analytics, unit+station popovers). Phase 4 (Unit Chief) kicking off.*
