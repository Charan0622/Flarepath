# 🚒 Flarepath — AI-Powered Fire Emergency Response Platform

> *Light the path from call to scene.*
>
> A full-stack, real-time command-and-control system that helps fire departments receive, triage, dispatch, and route emergency responses in seconds — not minutes. One web app that works beautifully on a dispatcher's desktop *and* inside a firefighter's mobile Chrome browser — with full in-browser turn-by-turn navigation to the scene.
>
> The name comes from aviation: a *flarepath* is the row of lights along a runway that guides pilots in at night. This product does the same thing for a fire crew — a glowing red path from their vehicle to the incident, the instant dispatch is confirmed.

**Author:** Charan Sai Gandham  
**Status:** Design Document v1.1  
**Stack:** Next.js 14 (Responsive PWA) · Supabase · Mapbox · Google Gemini · Web Speech API · TypeScript · Turborepo · Optional Expo native shell

---

## Table of Contents

1. Executive Summary
2. Problem Statement
3. Solution Overview
4. Core Features
5. System Architecture
6. Tech Stack & Justification (Web · Mobile PWA · Optional Native)
7. Monorepo Structure
8. Database Schema (PostgreSQL)
9. AI/ML Components
10. Routing & Shortest-Path Engine (incl. §10.5 In-Browser Turn-by-Turn)
11. Real-Time Communication
12. Authentication, Authorization & Security
13. UI/UX Strategy (Responsive Desktop + Mobile PWA)
14. API Design
15. Deployment & CI/CD
16. Performance, Scalability & Observability
17. Development Roadmap
18. Future Enhancements
19. Why This Project Stands Out to Recruiters

---

## 1. Executive Summary

**Flarepath** is a mission-critical SaaS platform that modernizes how fire departments manage emergencies. Today, many stations still coordinate dispatches over radio, whiteboards, and paper logs. A single minute of delay in dispatch can mean the difference between a contained incident and catastrophic loss.

Flarepath consolidates every step of the emergency lifecycle — from citizen call-in, to AI-assisted triage, to resource assignment, to optimized routing, to post-incident analytics — into a single real-time command center with synchronized web and mobile interfaces.

**Key differentiators:**

- 🧠 **AI-first triage** — Gemini classifies severity, extracts entities, and recommends the optimal crew-vehicle pair.
- 🗺️ **Sub-second dispatch routing** — Mapbox + custom A* fallback renders a glowing red route the instant a call is assigned.
- 🧭 **In-browser turn-by-turn navigation** — Responders open the link in **Chrome on any phone** and get live, voice-guided navigation to the incident. Zero app install. Zero friction.
- ⚡ **Real-time everywhere** — Supabase Realtime streams incident state to every connected dispatcher and responder device.
- 📱 **One responsive codebase** — The same Next.js app serves the dispatcher's desktop dashboard *and* the firefighter's mobile browser — installable as a PWA for home-screen launch, push notifications, and offline support.
- 💸 **Entirely on free tiers** — Production-grade stack with $0 monthly infrastructure cost up to realistic demo traffic.

---

## 2. Problem Statement

### 2.1 The Real-World Pain

Fire departments face three compounding problems under pressure:

1. **Fragmented information.** Call details live in one system, personnel rosters in another, vehicle availability on a whiteboard, and maps in a third-party tool. Dispatchers mentally stitch these together under extreme time pressure.
2. **Suboptimal routing.** Crews often follow "the usual route" instead of the route that accounts for current traffic, road closures, and one-way streets.
3. **No feedback loop.** Historical incident data is rarely used to predict high-risk zones, pre-position crews, or improve response times over time.

### 2.2 Measurable Impact

- The NFPA reports the U.S. average fire-department response time is ~7 minutes 48 seconds. A 1-minute reduction in dispatch latency has been correlated with a measurable drop in structural damage and civilian casualties.
- Departments without integrated CAD (Computer-Aided Dispatch) systems report 20–40% longer internal-coordination time.

### 2.3 Who Is This For?

- **Primary user:** Dispatcher / Shift Manager (desktop command center)
- **Secondary user:** Firefighter / Driver (mobile, in-vehicle)
- **Tertiary user:** Chief / Analyst (desktop analytics)
- **Optional public-facing layer:** Citizen reporter (PWA lite, future phase)

---

## 3. Solution Overview

Flarepath is a three-surface product built on a **single responsive Next.js web application** plus a shared backend. The *same URL* adapts to whoever opens it — desktop dispatchers get a multi-panel command center; firefighters on mobile Chrome get a touch-optimized navigator.

| Surface | Primary User | How They Access | Key Jobs |
|---|---|---|---|
| **Command Center** | Dispatcher | Desktop Chrome / Edge | Ingest calls → triage with AI → assign crew + vehicle → monitor live map |
| **Responder View** | Firefighter / Driver | **Mobile Chrome (any phone)** — bookmark or "Add to Home Screen" as PWA | Receive push alert → accept → follow in-browser turn-by-turn red-path navigation → update on-scene status |
| **Analytics Dashboard** | Chief | Desktop browser | Response-time trends, heatmaps, crew performance, AI-generated incident summaries |

**No app store. No install required.** A firefighter can bookmark the URL, or install it as a PWA from Chrome's "Add to Home Screen" prompt — giving them a full-screen, home-icon experience with push notifications and offline support, but always just a link away from any device. An optional Expo-wrapped native build (Phase 3) adds premium background-location and notification reliability for departments that want it, but is not required.

A typical flow, end to end:

```
Citizen call ─▶ Call intake form ─▶ AI triage (severity, type, entities)
            ─▶ Auto-recommendation (best crew + vehicle based on proximity,
                skill match, availability)
            ─▶ Dispatcher one-click approves or overrides
            ─▶ Web Push alert fires to responder's phone (Chrome PWA)
            ─▶ Responder taps notification → opens directly to incident
            ─▶ Red route streams to their mobile map in real time
            ─▶ In-browser turn-by-turn begins (voice + visual)
            ─▶ Live GPS flows back to command center every few seconds
            ─▶ On-scene → En route back → Available (state machine)
            ─▶ Post-incident AI summary generated automatically
```

---

## 4. Core Features

### 4.1 MVP Features (Phase 1 — what you build for the portfolio)

**Command Center (Web)**
- Live incident feed with priority-sorted cards (color-coded by severity)
- Interactive map showing all active incidents, stations, and crews in real time
- One-click incident detail drawer with AI-triage output
- Crew & vehicle assignment modal with AI-recommended pairing
- Route preview (red glowing polyline) before dispatch confirmation
- Dispatcher role-based access

**Responder View (Mobile Chrome / PWA)**
- Web Push notifications with haptic feedback (Android native; iOS 16.4+ via installed PWA)
- One-tap from the notification directly into the incident detail
- Incident detail screen (address, type, hazards, notes) optimized for a one-thumb grip
- **In-browser turn-by-turn navigation** — voice-guided, bearing-rotated map, red route, auto-recenter (see §10.5)
- "Open in Google Maps" fallback button (native voice navigation for driving)
- Status buttons: *Acknowledged → En Route → On Scene → Returning → Available*
- Offline-safe state cache via Service Worker
- Installable to home screen as a full-screen PWA — indistinguishable from a native app at a glance

**Shared**
- Secure login (email/password + optional magic link)
- Live presence indicators
- Dark mode (critical for night-shift dispatchers — not a nice-to-have)

### 4.2 Advanced Features (Phase 2)

- AI incident summary generation for post-event reports
- Voice-to-incident: dispatcher dictates the call; Whisper (via Groq, free) transcribes and auto-fills the form
- Predictive heatmap: time-of-day × location risk overlay based on historical data
- Multi-unit dispatch (send 2 trucks + 1 ambulance, routed differently)
- Station load balancer: if the nearest station has no free engine, auto-suggest next closest
- Chat channel per incident (dispatcher ↔ on-scene crew)

### 4.3 Future / Wow Features (Phase 3)

- Citizen-facing PWA with one-tap report + auto-location
- Computer-vision module: upload a photo of the scene → classify fire type (electrical, grease, structural) using a TensorFlow.js model
- Traffic-aware re-routing during transit if a road closes mid-dispatch
- Integration with IoT smoke sensors (MQTT ingestion)

---

## 5. System Architecture

### 5.1 High-Level Diagram

```
┌───────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                │
│                                                                       │
│   ┌─────────────────────────────────────────────────────────┐         │
│   │        Next.js 14 Responsive Web App  (ONE codebase)    │         │
│   │        Served from Vercel Edge globally                 │         │
│   │                                                         │         │
│   │   ▸ Desktop Chrome/Edge → Command Center layout         │         │
│   │   ▸ Mobile Chrome       → Responder layout + PWA        │         │
│   │                          (Add to Home Screen, Push,     │         │
│   │                           Offline, Wake Lock, Geo)      │         │
│   │   ▸ Optional Expo WebView shell (Phase 3, native wrap)  │         │
│   └────────────────────────────┬────────────────────────────┘         │
│                                │                                      │
└────────────────────────────────┼──────────────────────────────────────┘
                                 │   HTTPS / WSS
                                 ▼
┌───────────────────────────────────────────────────────────────────────┐
│                       API & EDGE LAYER                                │
│                                                                       │
│   ┌──────────────────────────────────────────────────────┐            │
│   │   Next.js Route Handlers (Vercel Edge Functions)     │            │
│   │   - /api/incidents       /api/dispatch               │            │
│   │   - /api/ai/triage       /api/ai/summarize           │            │
│   │   - /api/route/optimize  /api/auth/*                 │            │
│   │   - /api/push/subscribe  /api/push/send              │            │
│   └──────────────────────────────────────────────────────┘            │
│                                                                       │
│   ┌──────────────────────────────────────────────────────┐            │
│   │   Supabase Edge Functions (Deno)                     │            │
│   │   - Webhooks, scheduled jobs, heavy compute          │            │
│   └──────────────────────────────────────────────────────┘            │
└───────────────────────────────────────────────────────────────────────┘
               │                                       │
               ▼                                       ▼
┌──────────────────────────────┐      ┌──────────────────────────────┐
│      DATA & STATE LAYER      │      │     EXTERNAL SERVICES        │
│                              │      │                              │
│  Supabase (Postgres)         │      │  Mapbox Directions API       │
│  ├─ Row-Level Security       │      │  Google Gemini API           │
│  ├─ Realtime (WebSockets)    │      │  Groq (Whisper STT)          │
│  ├─ Storage (file uploads)   │      │  Web Push (VAPID, free)      │
│  └─ Auth (JWT)               │      │  OSRM (routing fallback)     │
└──────────────────────────────┘      └──────────────────────────────┘
```

### 5.2 Architectural Patterns

- **Modular monolith** on the backend (not microservices — overkill for a portfolio and makes deployment harder on free tiers). Cleanly separated domain modules: `incidents`, `dispatch`, `routing`, `ai`, `auth`, `analytics`.
- **Event-driven core.** Incident state changes emit events via Supabase Realtime; UI subscribes rather than polls.
- **Edge-first.** Next.js Route Handlers run on Vercel Edge for sub-50ms response from anywhere in the world.
- **Shared domain layer.** A `packages/core` workspace holds TypeScript types, Zod schemas, and domain logic used by both web and mobile — single source of truth.
- **CQRS-lite.** Writes go through typed domain commands; reads are optimized views (Postgres materialized views for analytics).

### 5.3 Data Flow for a Dispatch (sequence)

```
Dispatcher clicks "Create Incident"
   │
   ├─▶ POST /api/incidents  (validated with Zod)
   │     │
   │     ├─▶ Insert into `incidents` table
   │     ├─▶ Call /api/ai/triage (Gemini) → write `ai_triage` row
   │     └─▶ Broadcast `incident.created` via Supabase Realtime
   │
   ├─▶ AI recommends crew+vehicle (GET /api/dispatch/recommendations)
   │     └─▶ Scoring: distance + skill match + current status
   │
   ├─▶ Dispatcher confirms → POST /api/dispatch
   │     │
   │     ├─▶ Create `dispatches` row (status = ASSIGNED)
   │     ├─▶ Compute route via Mapbox Directions API
   │     ├─▶ Store route polyline in `dispatches.route_geojson`
   │     ├─▶ Push notify assigned responders (Expo Push)
   │     └─▶ Broadcast `dispatch.assigned` on incident channel
   │
   └─▶ Responder app receives → renders red path → status updates flow back
```

---

## 6. Tech Stack & Justification

**Every line item is free-tier at realistic portfolio traffic.** I've called out exactly why each choice beats the alternatives.

### 6.1 Frontend

| Tech | Role | Why this over alternatives |
|---|---|---|
| **Next.js 14 (App Router)** | Web command center | RSC for fast initial loads; Route Handlers replace a separate Express backend; first-class Vercel deploys |
| **React 18 + TypeScript** | UI framework | Type-safety is non-negotiable for a system where a wrong click matters |
| **Tailwind CSS + shadcn/ui** | Styling + components | Production-grade look with full design control; no vendor lock-in like MUI |
| **Framer Motion** | Animations | Smooth red-path drawing, card transitions, drawer slides |
| **Zustand** | Client state | Lighter than Redux; fine for a dashboard with moderate state |
| **TanStack Query** | Server state + caching | Handles refetching, optimistic updates, background sync |
| **React Hook Form + Zod** | Forms + validation | Same Zod schemas reused on backend — single source of truth |
| **Mapbox GL JS** | Interactive map (web) | Free tier = 50k loads/month; best dark-theme styling; vector tiles |

### 6.2 Mobile Access (PWA-first, no install required)

The mobile experience is the **same Next.js app** rendered responsively — no separate codebase. Chrome on Android and iOS gives us a complete toolkit to match native behavior.

| Tech | Role | Why |
|---|---|---|
| **Next.js responsive layout** | Mobile-adaptive UI | Server-detects viewport; ships a touch-first layout below 768px — zero extra code to maintain |
| **Web App Manifest** | "Add to Home Screen" | Full-screen launch, custom icon, splash screen — indistinguishable from a native app visually |
| **Service Worker (Workbox)** | Offline + caching | Caches the app shell, map tiles, and the last-known incident so responders aren't stranded if signal drops |
| **Web Push API (VAPID)** | Push notifications | Free, works on Android Chrome natively and iOS 16.4+ when installed to home screen |
| **Geolocation API** (`watchPosition`) | Live GPS tracking | Streams responder position back to the server every few seconds |
| **Screen Wake Lock API** | Keep screen awake during navigation | Critical while driving — screen won't sleep mid-route |
| **Web Speech API** (`SpeechSynthesisUtterance`) | Voice turn-by-turn | Built into every modern browser — free, offline, no TTS subscription |
| **DeviceOrientation API** | Compass / bearing rotation | Rotates the map to match heading like native nav apps |
| **Vibration API** | Haptic alerts | Buzz phone on new incident assignment |
| **Mapbox GL JS (mobile mode)** | Touch-optimized map | Same library as desktop — just with mobile gesture tuning |

### 6.3 Optional Native Shell (Phase 3 — nice-to-have)

| Tech | Role | Why (only if you want it) |
|---|---|---|
| **Expo (React Native WebView wrapper)** | Native app shell | Wraps the PWA for app-store distribution, better background location, FCM/APNs push reliability on old iOS |

**Important:** this is optional. The PWA covers ~95% of real-world needs. I recommend shipping Phase 1–2 as PWA-only and adding the native wrapper only if a recruiter asks "how would you go native?" — then you have a clear answer.

### 6.4 Backend

| Tech | Role | Why |
|---|---|---|
| **Next.js Route Handlers on Vercel Edge** | Primary API | Zero-config deploy; global edge; free hobby tier |
| **Supabase Edge Functions (Deno)** | Webhooks & cron jobs | For work that shouldn't hit Vercel (scheduled summaries, heavy Gemini calls) |
| **Supabase Postgres** | Primary DB | 500MB free; RLS for auth; built-in realtime |
| **Supabase Realtime** | WebSocket layer | Free; Postgres changes → client with no extra infra |
| **Supabase Storage** | Photos, audio clips | 1GB free |
| **Supabase Auth** | Auth + JWT | Plug-and-play; RLS ties user → data at the DB level |

### 6.5 AI / ML

| Tech | Role | Why |
|---|---|---|
| **Google Gemini 1.5 Flash** | Triage, summarization, entity extraction | Generous free tier (60 RPM); fast; cheap if you scale |
| **Groq (Whisper-large-v3)** | Voice-to-text for dispatcher dictation | Blazing fast; free tier |
| **TensorFlow.js** (Phase 3) | On-device fire-type classification | Runs in browser; no backend cost |

### 6.6 Geospatial & Routing

| Tech | Role | Why |
|---|---|---|
| **Mapbox Directions API** | Route + polyline + ETA | 100k free requests/month; returns GeoJSON you can render directly |
| **OSRM (open-source)** | Offline fallback | In case Mapbox limits are hit; self-hosted or public demo server |
| **Turf.js** | Geospatial math client-side | Distance, bearing, bounding boxes without server calls |

### 6.7 DevOps & Tooling

| Tech | Role | Why |
|---|---|---|
| **Turborepo** | Monorepo orchestration | Cached builds; single `pnpm dev` starts everything |
| **pnpm** | Package manager | Disk-efficient; workspace-native |
| **GitHub Actions** | CI/CD | Free for public repos; handles tests + typecheck + lint |
| **Vercel** | Web hosting | Free hobby; preview deploys per PR; single deploy serves desktop + mobile PWA |
| **Lighthouse CI** | PWA audit gate | Blocks PRs that regress PWA score, LCP, or accessibility |
| **Sentry** | Error monitoring | Free 5k events/month |
| **PostHog Cloud** | Product analytics | Free tier |

---

## 7. Monorepo Structure

```
flarepath/
├── apps/
│   ├── web/                    # Next.js 14 — ONE responsive app for everyone
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (desktop)/            # Command Center layout (≥1024px)
│   │   │   │   ├── incidents/
│   │   │   │   ├── dispatch/
│   │   │   │   ├── map/
│   │   │   │   └── analytics/
│   │   │   ├── (responder)/          # Mobile-first layout (<1024px)
│   │   │   │   ├── alerts/
│   │   │   │   ├── incident/[id]/
│   │   │   │   └── navigate/[dispatchId]/   # Turn-by-turn screen
│   │   │   └── api/
│   │   │       ├── incidents/
│   │   │       ├── dispatch/
│   │   │       ├── ai/
│   │   │       ├── route/
│   │   │       └── push/             # Web Push subscribe/send
│   │   ├── public/
│   │   │   ├── manifest.json         # PWA manifest
│   │   │   ├── sw.js                 # Service Worker (Workbox-built)
│   │   │   └── icons/                # PWA icons (192, 512, maskable)
│   │   └── components/
│   │
│   └── native-shell/           # [OPTIONAL, Phase 3] Expo WebView wrapper
│
├── packages/
│   ├── core/                   # Shared domain (TS types, Zod, pure logic)
│   │   ├── schemas/            # Zod schemas for every entity
│   │   ├── types/              # Derived TS types
│   │   └── domain/             # Dispatch rules, scoring, state machines, A*
│   │
│   ├── ui/                     # Shared React components (work at any viewport)
│   │
│   ├── api-client/             # Typed fetch wrapper + TanStack Query hooks
│   │
│   ├── supabase/               # Generated types, RLS policies, migrations
│   │   └── migrations/
│   │
│   └── config/                 # ESLint, Prettier, tsconfig, Tailwind presets
│
├── .github/workflows/          # CI pipelines
├── turbo.json
├── pnpm-workspace.yaml
└── README.md
```

**Route-group trick:** Next.js route groups `(desktop)` and `(responder)` let you serve completely different layouts from the same app — chosen at runtime based on viewport — while still sharing the API, auth, and data layer. This is the cleanest way to do "one codebase, two experiences" and a great interview talking point.

---

## 8. Database Schema (PostgreSQL / Supabase)

All tables include `id uuid default gen_random_uuid()`, `created_at`, `updated_at`. Row-Level Security (RLS) is enabled on every table.

```sql
-- Organizations (multi-tenant ready — one row = one fire department)
organizations (id, name, timezone, created_at)

-- Users (extends supabase.auth.users)
profiles (
  id uuid PK references auth.users,
  organization_id,
  role enum('dispatcher','firefighter','chief','admin'),
  full_name, phone, avatar_url,
  skills text[],                 -- ['HAZMAT','EMT','ROPE_RESCUE']
  current_status enum('available','on_duty','off_duty','en_route','on_scene')
)

-- Stations
stations (id, organization_id, name, location geography(POINT,4326), address)

-- Vehicles (engines, ladders, ambulances)
vehicles (
  id, organization_id, station_id,
  call_sign text,                -- 'Engine 12'
  type enum('engine','ladder','tanker','ambulance','rescue'),
  capacity int,
  status enum('available','dispatched','maintenance'),
  current_location geography(POINT,4326)
)

-- Incidents (the core table)
incidents (
  id, organization_id,
  reported_at timestamptz,
  reporter_name, reporter_phone,
  location geography(POINT,4326),
  address text,
  type enum('structure_fire','vehicle_fire','wildfire','medical',
            'hazmat','rescue','false_alarm','other'),
  severity enum('low','medium','high','critical'),
  status enum('open','triaged','dispatched','on_scene','resolved','cancelled'),
  description text,
  hazards text[],
  created_by uuid references profiles
)

-- AI triage output (1:1 with incidents)
ai_triage (
  incident_id PK references incidents,
  predicted_type,
  predicted_severity,
  confidence numeric,
  extracted_entities jsonb,      -- {people_trapped: 2, floors: 3, ...}
  recommended_vehicles jsonb,
  recommended_crew_size int,
  reasoning text,
  model text,                    -- 'gemini-1.5-flash'
  latency_ms int
)

-- Dispatches (many per incident — multi-unit response)
dispatches (
  id, incident_id references incidents,
  vehicle_id references vehicles,
  crew uuid[] references profiles,
  status enum('assigned','acknowledged','en_route','on_scene',
              'returning','completed'),
  assigned_at, acknowledged_at, on_scene_at, completed_at,
  route_geojson jsonb,           -- Mapbox polyline
  distance_m int,
  eta_seconds int
)

-- Live location pings (high-volume — consider TimescaleDB extension later)
location_pings (
  id, dispatch_id, vehicle_id,
  location geography(POINT,4326),
  speed_kmh numeric,
  heading numeric,
  recorded_at timestamptz
)

-- Post-incident reports
incident_reports (
  id, incident_id,
  ai_summary text,               -- generated by Gemini
  manual_notes text,
  cause text,
  damage_estimate_usd numeric,
  injuries int,
  fatalities int
)

-- Audit log (every state change)
audit_log (id, actor_id, entity_type, entity_id, action, diff jsonb, at)
```

### Key indexes

- `GIST` on every `geography` column for fast nearest-neighbor queries
- `BRIN` on `created_at` columns in high-volume tables (`location_pings`, `audit_log`)
- Partial index on `incidents (status)` WHERE `status IN ('open','dispatched')` — the hot set

### Example: "find the 3 closest available engines to an incident"

```sql
SELECT v.id, v.call_sign,
       ST_Distance(v.current_location, $1::geography) AS meters
FROM vehicles v
WHERE v.status = 'available'
  AND v.type IN ('engine','ladder')
  AND v.organization_id = $2
ORDER BY v.current_location <-> $1::geography
LIMIT 3;
```

The `<->` operator uses the GIST index — O(log n) even with thousands of vehicles.

---

## 9. AI/ML Components

AI is on the critical path, not bolted on.

### 9.1 Incident Triage Agent (Phase 1)

**Input:** raw dispatcher-entered description + address + reporter notes.  
**Output:** structured JSON — predicted type, severity, extracted entities, recommended resources, reasoning.

**Implementation:**
- Gemini 1.5 Flash with structured output (JSON mode)
- System prompt engineered with 8–10 few-shot examples covering edge cases (false alarms, medical-disguised-as-fire, multi-hazard)
- Zod schema validates the output; if invalid, retry once then fall back to a rule-based classifier
- All outputs logged to `ai_triage` with latency and confidence for ongoing evaluation

**Why this impresses:** you're doing real-world LLM engineering — structured output, validation, fallback, observability. Not "I called ChatGPT."

### 9.2 Resource Recommendation (Phase 1)

**Not an LLM — a proper ranking model.** This is a great spot to show you know when *not* to use AI.

Score each available vehicle:

```
score = w1 * (1 / distance_km)
      + w2 * skill_match_ratio
      + w3 * recency_available_minutes
      + w4 * station_load_factor
```

Weights are configurable in `packages/core/domain/scoring.ts`. Later, you can replace the linear model with a learned gradient-boosted ranker trained on historical dispatch outcomes — a strong talking point for the interview.

### 9.3 Post-Incident Summary (Phase 2)

When an incident closes, a scheduled Supabase Edge Function:
1. Gathers dispatch timeline, location pings, notes, photos
2. Sends to Gemini with a structured summary prompt
3. Produces a 3-paragraph incident report draft + extracted metrics (response time, units involved)

### 9.4 Voice Intake (Phase 2)

Dispatcher presses and holds a mic button, speaks the emergency:

```
Audio (webm) ─▶ POST /api/ai/transcribe
            ─▶ Groq Whisper-large-v3 (free, fast)
            ─▶ Raw transcript
            ─▶ Gemini structured extract → prefills incident form
```

End-to-end latency target: **< 3 seconds**.

### 9.5 Predictive Heatmap (Phase 2)

Train a simple Poisson regression on historical incidents (features: hour-of-day, day-of-week, grid cell, weather). Render on the map as an overlay during briefings. **Not real-time — batch-refreshed nightly.**

### 9.6 Evaluation & Safety

- Every AI output includes `confidence` and is shown to the dispatcher *as a suggestion*, never auto-executed
- Dispatcher confirmation is logged — creating a ground-truth dataset for future fine-tuning
- Kill switch: a single env var disables all AI endpoints and falls back to rule-based paths

---

## 10. Routing & Shortest-Path Engine

### 10.1 Primary: Mapbox Directions API

- One call per dispatch returns distance, duration, and an encoded polyline
- Supports traffic-aware routing via the `driving-traffic` profile
- Returns GeoJSON — drop directly into the map layer
- Free tier: 100k requests/month (dispatch volume × 1 route each = plenty)

### 10.2 Why also build a custom pathfinding fallback?

Because **it's a killer interview talking point** and it's genuinely useful when Mapbox rate-limits during a demo.

Plan:
1. Download OpenStreetMap data for your demo city (Overpass API or Geofabrik)
2. Build an adjacency list graph: nodes = intersections, edges = road segments with weights (length / speed_limit)
3. Implement **A*** in TypeScript with haversine as the heuristic
4. Store the graph in a JSON file served from Supabase Storage, loaded client-side on dispatcher boot (~1–2 MB gzipped for a small city)
5. Run A* in a Web Worker so the UI doesn't freeze

```ts
// packages/core/domain/routing/astar.ts
export function aStar(
  graph: Graph,
  start: NodeId,
  goal: NodeId,
  heuristic: (a: Node, b: Node) => number = haversine
): Path {
  const openSet = new MinHeap<NodeId>();
  openSet.push(start, 0);
  const cameFrom = new Map<NodeId, NodeId>();
  const gScore = new Map<NodeId, number>([[start, 0]]);
  // ... standard A* with early termination
}
```

Expose via `/api/route/fallback` for demo reliability.

### 10.3 Rendering the Red Path

In Mapbox GL JS, the route is a styled line layer with:

```js
{
  type: 'line',
  paint: {
    'line-color': '#ff2d2d',
    'line-width': 6,
    'line-blur': 2,
    'line-opacity': 0.9,
  },
  layout: { 'line-cap': 'round', 'line-join': 'round' }
}
```

Add a subtle pulsing dash animation using `line-dasharray` interpolation for cinematic effect. On mobile, `react-native-maps` supports `<Polyline strokeColor strokeWidth />` — same effect with a small custom animation hook.

### 10.4 Live ETA Recalculation

Every 15 seconds while `dispatch.status = 'en_route'`:
- Client sends current location ping
- Server compares actual progress vs. planned polyline
- If divergence > 100m, triggers a re-route (new Mapbox call)

### 10.5 In-Browser Turn-by-Turn Navigation (The "Wow" Piece)

**This is the feature that makes recruiters lean forward.** A responder opens the dispatch link in mobile Chrome and gets a navigator that looks and feels like Google Maps — no app install, no SDK — built entirely from browser APIs.

#### What it does

When a responder taps **"Start Navigation"** on the incident screen:

1. The map goes full-screen and tilts into a 3D camera (Mapbox GL `pitch: 60°`)
2. The camera locks onto the user's current GPS position
3. The red route polyline extends from their position to the incident
4. The next maneuver is displayed at the top ("In 200 m, turn right onto MG Road")
5. A voice speaks the maneuver through the phone's speaker
6. The map rotates so "up" is always the direction of travel
7. Screen stays awake (Wake Lock API)
8. If they go off-route, it silently re-routes

#### Implementation Recipe

```ts
// apps/web/app/(responder)/navigate/[dispatchId]/NavigationClient.tsx

// 1. Fetch the route with full step-by-step instructions
const route = await fetch(
  `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
  `${origin.lng},${origin.lat};${dest.lng},${dest.lat}` +
  `?steps=true&voice_instructions=true&banner_instructions=true` +
  `&overview=full&geometries=geojson&access_token=${TOKEN}`
).then(r => r.json());

// 2. Keep the screen awake for the whole trip
const wakeLock = await navigator.wakeLock.request('screen');

// 3. Stream GPS updates
const watchId = navigator.geolocation.watchPosition(
  (pos) => {
    updateCameraPosition(pos);
    const { stepIndex, distanceToNext } = findCurrentStep(pos, route);
    maybeSpeakVoiceInstruction(route.steps[stepIndex], distanceToNext);
    sendPingToServer(pos);   // so dispatcher map updates too
    checkOffRoute(pos, route); // if >50m off, trigger re-route
  },
  (err) => showLocationError(err),
  { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
);

// 4. Voice guidance via the browser's built-in speech synthesis (FREE)
function speak(text: string) {
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.0;
  u.volume = 1.0;
  speechSynthesis.speak(u);
}

// 5. Rotate map to match heading (use device compass if available)
window.addEventListener('deviceorientationabsolute', (e) => {
  map.setBearing(360 - e.alpha);
});
```

#### Off-Route Detection & Re-Routing

```ts
function isOffRoute(pos: Coord, routeGeom: LineString): boolean {
  const snapped = turf.nearestPointOnLine(routeGeom, turf.point([pos.lng, pos.lat]));
  const distanceMeters = snapped.properties.dist * 1000;
  return distanceMeters > 50;
}
// On off-route: debounce 5s, then re-fetch route from current position
```

#### "Open in Google Maps" Fallback

Not every responder wants in-browser nav — some prefer native Google/Apple Maps for voice quality. Offer a secondary button that deep-links:

```ts
// Universal link that opens Google Maps in-app on mobile, browser on desktop
const gmapsUrl =
  `https://www.google.com/maps/dir/?api=1` +
  `&destination=${lat},${lng}` +
  `&travelmode=driving` +
  `&dir_action=navigate`;
// On iOS specifically, also offer Apple Maps: `maps://?daddr=${lat},${lng}`
```

Best of both worlds: the Flarepath in-browser navigator for a seamless branded experience, plus the one-tap escape hatch to a tool responders already trust.

#### Browser Support Reality Check

| Capability | Android Chrome | iOS Safari | iOS Chrome | Notes |
|---|:-:|:-:|:-:|---|
| Geolocation `watchPosition` | ✅ | ✅ | ✅ | Requires HTTPS |
| Web Push notifications | ✅ | ✅ (16.4+, PWA only) | ✅ (16.4+, PWA only) | iOS requires "Add to Home Screen" |
| Speech Synthesis (voice) | ✅ | ✅ | ✅ | Voices vary by OS |
| Wake Lock API | ✅ | ✅ (16.4+) | ✅ (16.4+) | |
| Device Orientation | ✅ | ✅ (permission prompt) | ✅ (permission prompt) | iOS requires user gesture to request |
| Vibration | ✅ | ❌ | ❌ | iOS limitation — fall back to sound |
| Service Worker / Install | ✅ | ✅ | ✅ | |

**The honest assessment:** on modern Android Chrome everything works flawlessly. On iOS, all core navigation features work; push notifications require the user to install the PWA to their home screen (one tap). This is an excellent tradeoff vs. requiring an App Store install.

---

## 11. Real-Time Communication

### 11.1 Supabase Realtime

Every client subscribes to Postgres changes via WebSocket:

```ts
supabase
  .channel('incidents')
  .on('postgres_changes',
      { event: '*', schema: 'public', table: 'incidents',
        filter: `organization_id=eq.${orgId}` },
      (payload) => queryClient.invalidateQueries(['incidents']))
  .subscribe();
```

Separate channels:
- `org:{id}:incidents` — all incident CRUD
- `org:{id}:dispatches` — dispatch lifecycle
- `dispatch:{id}:pings` — live vehicle location (high frequency)
- `org:{id}:presence` — who's online

### 11.2 Presence

Supabase Presence API broadcasts the online status of every dispatcher and available responder, shown as green dots in the roster.

### 11.3 Push Notifications

- **Mobile:** Expo Push Notifications. Server calls `https://exp.host/--/api/v2/push/send` with the responder's Expo push token (stored in `profiles`) when they're assigned.
- **Web:** Service Worker + Web Push API for when the dispatcher has the dashboard in a background tab.

---

## 12. Authentication, Authorization & Security

### 12.1 Auth

- Supabase Auth with email/password + magic link (passwordless option)
- JWTs signed by Supabase, validated at the edge
- Session stored in httpOnly secure cookies
- Sign-out invalidates the refresh token

### 12.2 Authorization via Row-Level Security

Every table has RLS policies enforced at the database level — **not just in the API**. Even a compromised API token can't leak data from another organization.

```sql
-- Example policy on incidents
CREATE POLICY "members see their org incidents"
ON incidents FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- Only dispatchers and admins can create incidents
CREATE POLICY "dispatchers create incidents"
ON incidents FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('dispatcher', 'admin')
      AND organization_id = incidents.organization_id
  )
);
```

### 12.3 Role Matrix

| Action | Firefighter | Dispatcher | Chief | Admin |
|---|:-:|:-:|:-:|:-:|
| View own dispatches | ✅ | ✅ | ✅ | ✅ |
| View all org incidents | ❌ | ✅ | ✅ | ✅ |
| Create incident | ❌ | ✅ | ✅ | ✅ |
| Dispatch crew | ❌ | ✅ | ✅ | ✅ |
| View analytics | ❌ | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ✅ |

### 12.4 Other Security

- All traffic HTTPS only; HSTS enabled
- Rate limiting on `/api/ai/*` endpoints (costliest) via Upstash Redis free tier
- Input validation with Zod on every Route Handler
- Secrets in Vercel env vars; never in the repo
- CSP headers, CORS locked to your domain
- SQL injection impossible (Supabase client parameterizes)
- Audit log on every state-changing operation

---

## 13. UI/UX Strategy (Web + Mobile)

### 13.1 Design Principles

1. **Glance-ability.** A dispatcher should read the state of the room in under 2 seconds.
2. **Dark-first.** Night-shift ergonomics — pure blacks, AMOLED-friendly.
3. **Color carries meaning.**
   - 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low / Resolved
   - Red is reserved for severity and routes — nothing else.
4. **Keyboard-first on web.** Cmd+K palette; hotkeys for "new incident," "dispatch," "acknowledge."
5. **One-thumb-safe on mobile.** All critical actions reachable within the bottom 60% of the screen.

### 13.2 Web Command Center Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Flarepath   [Search ⌘K]              [🔔 3]  [User ▾]        │
├─────────────┬───────────────────────────────┬───────────────┤
│             │                               │               │
│  INCIDENTS  │                               │  INCIDENT     │
│  🔴 Active  │                               │  DETAILS      │
│  ────────   │          LIVE MAP             │               │
│  🔴 12:04   │          (Mapbox)             │  [AI Triage]  │
│  Kitchen    │                               │  [Crew]       │
│  fire, 3rd  │     🚒─────red path──▶🔥      │  [Route ETA]  │
│  floor      │                               │  [Dispatch]   │
│  ────────   │          station 📍           │               │
│  🟠 11:47   │          incident 🔥          │               │
│  ...        │          vehicle 🚒           │               │
│             │                               │               │
├─────────────┴───────────────────────────────┴───────────────┤
│  Crew Roster · Presence · Shift clock                       │
└─────────────────────────────────────────────────────────────┘
```

### 13.3 Mobile Responder Flow (Chrome / PWA)

The responder's first interaction is a bookmark or a one-time "Add to Home Screen" prompt — after that, Flarepath is a tap away, no different from a native app.

- **Incoming alert** — Web Push notification with a critical sound and haptic buzz (Android). Notification title shows severity emoji + address ("🔴 Structure fire · 42 MG Road, 3rd floor").
- **One-tap deep link** — Tapping the notification opens directly to `/incident/[id]` — already authenticated via the existing PWA session.
- **Big, thumb-safe buttons** — **ACCEPT · EN ROUTE · ON SCENE · CLEAR** pinned to the bottom 40% of the screen. Buttons are 56 px tall minimum (exceeds WCAG tap-target).
- **One-tap "Start Navigation"** — launches the full-screen in-browser turn-by-turn navigator (see §10.5).
- **Secondary action: "Open in Google Maps"** — for drivers who prefer native voice navigation.
- **Map takes 70%** of the screen with the red route; bottom sheet holds incident details, hazards, and notes — swipe up to expand.
- **Offline resilience** — Service Worker caches the last-assigned incident and its route polyline, so even if the phone drops signal in a tunnel, the visual route and instructions persist.
- **No-install option** — Responders who don't want to install the PWA can just bookmark the dashboard URL. It still works — they just won't get push notifications (they'll see alerts as in-app toasts while the tab is open).

### 13.4 Shared Design Tokens

Tokens live in `packages/ui/tokens.ts`:

```ts
export const tokens = {
  severity: {
    critical: '#ff2d2d',
    high:     '#ff7b1c',
    medium:   '#ffc93c',
    low:      '#3ddc84',
  },
  bg:      { base: '#0a0a0b', raised: '#121214', ... },
  radius:  { sm: 6, md: 12, lg: 20 },
  motion:  { fast: 120, normal: 220, slow: 400 },
};
```

Tailwind config reads these once; every component — desktop or mobile — uses the same palette, spacing scale, and motion timings. One visual system, zero drift.

---

## 14. API Design

REST over HTTPS, versioned at `/api/v1/*`. All responses are JSON with a consistent envelope:

```json
{ "data": {...}, "error": null, "meta": { "traceId": "..." } }
```

### 14.1 Representative Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/incidents` | Create incident (triggers AI triage) |
| GET | `/api/v1/incidents?status=open` | List incidents (filtered, paginated) |
| GET | `/api/v1/incidents/:id` | Incident detail with triage + dispatches |
| PATCH | `/api/v1/incidents/:id` | Update status, description |
| POST | `/api/v1/dispatch` | Create dispatch (vehicle + crew) |
| GET | `/api/v1/dispatch/recommend?incidentId=` | AI-ranked crew+vehicle suggestions |
| POST | `/api/v1/dispatch/:id/ack` | Responder acknowledges |
| POST | `/api/v1/dispatch/:id/status` | Update status in state machine |
| POST | `/api/v1/location/ping` | Bulk-insert location pings |
| POST | `/api/v1/ai/triage` | Manual re-triage |
| POST | `/api/v1/ai/transcribe` | Audio → text |
| POST | `/api/v1/ai/summarize/:incidentId` | Generate report |
| GET | `/api/v1/route/optimize` | Compute route (Mapbox + fallback) |
| GET | `/api/v1/analytics/response-times` | Aggregated metrics |

### 14.2 State Machines (Enforced Server-Side)

```
Incident:   open → triaged → dispatched → on_scene → resolved
                                        ↘ cancelled

Dispatch:   assigned → acknowledged → en_route → on_scene → returning → completed
```

Illegal transitions return `409 Conflict`. The state machine lives in `packages/core/domain/state.ts` — enforced identically in UI and API.

---

## 15. Deployment & CI/CD

### 15.1 Environments

| Env | Purpose | URL |
|---|---|---|
| Preview | Every PR auto-deploys | `*.vercel.app` |
| Staging | `main` branch | `staging.flarepath.app` |
| Production | Tagged releases | `flarepath.app` |

### 15.2 CI Pipeline (GitHub Actions)

```yaml
on: [push, pull_request]

jobs:
  ci:
    steps:
      - checkout
      - setup pnpm + node 20
      - pnpm install --frozen-lockfile
      - turbo run lint typecheck test build
      - Run Supabase migration check
      - Upload Playwright traces on failure
```

### 15.3 Deploy Pipeline

1. Merge to `main` → Vercel auto-deploys the web app (serves both desktop and mobile PWA)
2. Service Worker version bumped automatically on each deploy; clients update on next visit
3. Supabase migrations run via GitHub Action → `supabase db push`
4. Sentry release created with sourcemaps
5. Lighthouse CI runs against the preview deploy and blocks merges that regress PWA score
6. Slack/Discord webhook notifies team
7. *(Optional, Phase 3)* Tagged release triggers Expo EAS build for native wrapper

### 15.4 Rollback

- Vercel: instant redeploy of previous build
- DB: every migration has a `down.sql`
- Feature flags for risky releases (PostHog or simple Supabase table)

---

## 16. Performance, Scalability & Observability

### 16.1 Performance Targets

| Metric | Target |
|---|---|
| Dashboard initial load (LCP) | < 1.8s on 4G |
| Time from "Create Incident" click → AI triage visible | < 1.5s |
| WebSocket message latency | < 300ms end-to-end |
| Route computation + render | < 800ms |
| Mobile alert receipt → screen open | < 2s |

### 16.2 How We Hit Them

- Vercel Edge Functions (global, low cold-start)
- Aggressive RSC streaming — shell renders instantly, data hydrates progressively
- Mapbox vector tiles cached by Service Worker
- `EXPLAIN ANALYZE` on every hot query; GIST indexes on geography
- TanStack Query caches with 30s stale time; optimistic updates for status changes
- Mobile: Hermes engine, `enableScreens()`, React Native New Architecture

### 16.3 Observability

| Layer | Tool |
|---|---|
| Error tracking | Sentry (web + mobile + API) |
| Structured logging | Pino → Axiom free tier |
| Metrics dashboards | Grafana Cloud free tier, Supabase built-in |
| Product analytics | PostHog (user funnels, feature flags) |
| AI observability | Custom table + LangSmith optional |

Every request carries an `x-trace-id` header, propagated through the stack and surfaced in error reports.

### 16.4 Scale Plan (Honest)

- Free-tier ceiling: ~100 dispatches/day, 10 concurrent users
- First paid step: Supabase Pro ($25/mo) — 8GB DB, unlimited realtime
- Serious scale: move `location_pings` to TimescaleDB, introduce Redis for hot caches, shard by organization

---

## 17. Development Roadmap

### Phase 1 — MVP (4 weeks, demo-ready)

- Week 1: Monorepo, Supabase schema + RLS, auth, responsive app shell (desktop + mobile layouts), PWA manifest + Service Worker scaffolding
- Week 2: Incident CRUD, Gemini triage, live map with incidents
- Week 3: Dispatch flow, Mapbox routing, red path rendering, Web Push setup
- Week 4: In-browser turn-by-turn navigator, mobile status updates, location pings, dark theme polish, demo video

### Phase 2 — Depth (3 weeks)

- Week 5: Voice intake (Groq Whisper), AI summaries
- Week 6: Analytics dashboard, response-time trends
- Week 7: Heatmap, A* fallback router, offline mode

### Phase 3 — Wow Features (optional)

- Computer-vision fire classifier (TFJS)
- Citizen PWA
- IoT smoke sensor ingest

### Deliverables for the Portfolio

1. **One live demo link** — opens beautifully on desktop *and* mobile Chrome. That's the whole pitch.
2. 90-second Loom walkthrough showing the dispatcher flow + the responder opening the link on a phone and navigating
3. Architecture diagram (this doc)
4. GitHub repo with CI badges, clean commits, conventional commit history
5. Blog post: "Building Flarepath — An AI Fire Dispatch System on Free-Tier PWAs"

---

## 18. Future Enhancements

- Multi-org federation (mutual-aid agreements between departments)
- 911 call-center API integration (E911 location data)
- Integration with building fire-alarm systems (alarm → auto-creates incident)
- Graph neural network for response-time prediction accounting for road network topology
- Digital twin of the city for training simulations
- Multi-language dispatcher interface (Hindi, Spanish, Mandarin)
- Voice agent (LiveKit + Gemini) that talks to callers while a dispatcher is busy

---

## 19. Why This Project Stands Out to Recruiters

Any bootcamp grad can build a CRUD app. Here's what makes Flarepath hit different:

1. **Domain depth.** You're not building another todo-list or clone. You chose a domain with real stakes, real constraints (latency, reliability), and real users with real workflows.
2. **Real-time at scale.** WebSockets, presence, live geolocation, push notifications — all production patterns.
3. **Thoughtful AI.** You used an LLM where it adds value (unstructured → structured), and a ranking heuristic where it doesn't. You show judgment, not hype.
4. **Distributed systems thinking.** Event-driven updates, state machines enforced server-side, RLS at the database layer, idempotent dispatch creation.
5. **Cross-platform engineering.** Monorepo, shared domain layer, web + mobile from one codebase — this is the skill modern product teams actually hire for.
6. **Performance discipline.** Explicit budgets, edge deployment, index strategy, caching tiers. You can talk numbers, not vibes.
7. **Security by construction.** RLS, Zod validation, audit logs, rate limits, threat model — the opposite of "we'll add auth later."
8. **Cost awareness.** Every component chosen for free-tier viability shows you understand *both* engineering and business constraints — rare in juniors.
9. **Observability.** Tracing, error tracking, product analytics, AI evaluation — you think about the system in production, not just in dev.
10. **Clear communication.** This document itself is a deliverable. Senior engineers write. You can too.

### Talking points for the interview

- *"How would you handle a 10× increase in dispatch volume?"* → read §16.4
- *"Why not microservices?"* → deployability on free tier, team of one, clean module boundaries inside the monolith get you 95% of the benefit
- *"How do you validate the AI is actually helping?"* → §9.6, dispatcher confirms every suggestion, creating labeled training data
- *"Walk me through what happens when someone clicks Dispatch"* → §5.3 sequence diagram

---

## Appendix A — Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=

# AI
GEMINI_API_KEY=
GROQ_API_KEY=

# Web Push (generate once with: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com

# Observability
SENTRY_DSN=
POSTHOG_KEY=
```

## Appendix B — Minimum Viable Demo Script (for recruiters)

1. Open the dashboard on your laptop — show 3 mock live incidents
2. Click "New Incident" → type "house fire, 2 adults trapped, 3rd floor" → watch AI triage populate severity + recommended resources in < 2s
3. Click the recommended engine → show route preview (red path)
4. **Pull out your phone, open the same URL in Chrome** — no install, no app store
5. Confirm dispatch on laptop → phone's Web Push notification fires; tap it
6. Phone opens to the incident; tap **Start Navigation** → full-screen map with the red route, voice says "Head south on MG Road for 400 meters"
7. Show the live location dot moving along the route on the dispatcher's laptop map — proving end-to-end real-time sync
8. Responder taps "On Scene" on the phone — watch the incident card turn orange on the laptop dashboard instantly
9. Close incident → show the AI-generated summary in the report panel

**Total runtime: ~90 seconds. That's your hook.** The moment they see a browser link become a voice-guided navigator across two devices, you've won the room.

---

*Flarepath — light the path from call to scene. Built with care. Deployed on free tiers. Ready to save minutes that save lives.*
