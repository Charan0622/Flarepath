<div align="center">

# Flarepath

**_Light the path from call to scene._**

A three-role, real-time fire emergency dispatch platform — citywide command, rolling-truck command, and firefighter HUD — all driven by one Next.js app, one Supabase schema, and one shared live state.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000?style=for-the-badge&logo=vercel&logoColor=white)](https://flarepath-peach.vercel.app)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20PostGIS-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Mapbox](https://img.shields.io/badge/Mapbox-GL%20JS%20v3-4264fb?style=for-the-badge&logo=mapbox&logoColor=white)](https://www.mapbox.com)
[![Gemini](https://img.shields.io/badge/Google-Gemini%201.5%20Flash-8e75f1?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)

**Live demo** → [flarepath-peach.vercel.app](https://flarepath-peach.vercel.app)
Pick any role — Dispatcher · Unit Chief · Unit Member — and watch the same incident update from three perspectives in real time.

</div>

![Login — pick your role](./Login%20Home%20Page.png)

---

## What it is

A portfolio-grade prototype of the operational stack a fire department actually runs: the dispatcher's command center, the captain's rolling command in the front seat of the engine, and the individual firefighter's personal heads-up display on the hoseline. Three completely different UIs, one shared incident in PostgreSQL, cross-role state sync on the wire, and AI triage + route optimization threading through the whole thing.

Grounded in **NFPA 1710 / 1561 / 1407 / 1981 / 1982**, the **LUNAR mayday** mnemonic, and real fire-service UX from **Tablet Command, Adashi, Active911, IamResponding, MSA G1, Scott EPIC 3, Dräger FPS 7000**, and **FirstNet**.

---

## The three consoles

<table>
<tr>
<td width="33%" valign="top">

### 📟 **Dispatcher**
_Citywide command center_

- Live feed of every open incident, priority-sorted
- Mapbox dark-theme city map with stations, vehicles, and red-glow routes
- **AI triage** — Gemini 1.5 Flash classifies severity, extracts entities, recommends crew size + vehicle types, all with Zod-validated structured output
- One-click dispatch with ranked vehicle recommendations
- Voice incident intake (Groq Whisper)
- Citizen reports from a public PWA
- Post-incident PDF report (Gemini-generated)
- 15-card analytics: NFPA 1710 benchmarks, coverage isochrones, response-flow heatmap, hotspots, dispatch funnels, AI confidence, forecast

![Dispatcher — incident detail with AI vehicle recommendations](./Dispatcher%20Home%20Page.png)

</td>
<td width="33%" valign="top">

### ⭐ **Unit Chief**
_Rolling command · Tablet Command-style_

- **Tactical canvas** with hot (10 m) / warm (30 m) / cold (100 m) zones per NFPA 1500
- **Orbital crew constellation** — each ring = SCBA air%, each halo = live HR
- Assignment rays with streaming text when orders go out
- NFPA 1561 **PAR** (Personnel Accountability Report) with 60 s radial drain
- NFPA 1407 **RIT** (Rapid Intervention Team) two-in/two-out tracker
- NFPA 1710 benchmark ladder (turnout / arrival / effective response force)
- **LUNAR mayday curtain** with pre-filled fields + haptic pulse
- Pre-plan card (occupancy, construction, Knox-box, hazards)
- Water-supply gauge (GPM + residual PSI)
- Gemini tactical briefing on demand
- Cascade resolve → auto-generated post-incident HTML report

![Unit Chief — tactical canvas + orbital crew constellation](./Unit%20Chief%20Home%20page.png)

</td>
<td width="33%" valign="top">

### 🔥 **Unit Member**
_Firefighter HUD · glove-friendly mobile_

- SCBA air-percent ring + heart-rate halo + radio-hot aura around your avatar
- Scene mini-map: tactical zones, captain tether, **braided-DNA buddy thread**, exit spine, nearest hydrants
- **FLIR-style TIC** (thermal imaging) toggle — hue-rotate + saturate filter on the canvas
- NFPA 1981 **low-air banner** at ≤ 33% air, heartbeat haptic below 15%
- Turn-by-turn maneuver tile while en route
- 3-hydrant flow card (BLUE/GREEN/ORANGE by GPM class)
- Action dock — 96×96 PTT orb, 72×72 status, 72×72 MAYDAY (triple-tap defeat)
- **Voice command orb** — "Flarepath, mark hazard / route exit / mayday / ack par"
- Evidence capture (auto-geotag photos + hold-to-record voice notes)
- Crew chatter side-channel
- Smoke-mode high-contrast invert rendering

![Unit Member — firefighter HUD with scene map + hydrants + action dock](./Unit%20Member%20Home%20page.png)

</td>
</tr>
</table>

### LUNAR Mayday — the most critical interaction in the app

When a firefighter triple-taps **MAYDAY**, a full-screen curtain drops with the five **LUNAR** fields pre-filled from their current state (**L**ocation · **U**nit · **N**ame · **A**ssignment-Air · **R**esources needed). Submission haptic-pulses every connected role's browser — chief's console flashes red, dispatcher's map badges the incident. This is the interaction the entire NFPA accountability system exists to enable.

![Mayday — LUNAR curtain with pre-filled fields](./Mayday%20calling%20page.png)

---

## Architecture

```
         ┌──────────────────────────────────────────────────────────────┐
         │                    Next.js 14 App Router                     │
         │                     (one deployment)                          │
         │                                                               │
         │   /         /chief/[id]        /unit/[id]       /analytics   │
         │ (dispatch)   (chief)            (firefighter)                 │
         │     │            │                   │                        │
         └─────┼────────────┼───────────────────┼────────────────────────┘
               │            │                   │
               │            │                   │  cross-role sync:
               │            │ chief-store       │   localStorage bridge
               │            │ ◀─writes─▶        │   (useChiefMirror polls +
               │            │ member-store      │    listens to 'storage')
               │            │                   │
         ┌─────┼────────────┼───────────────────┼────────────────────────┐
         │     ▼            ▼                   ▼                        │
         │                  RSC + Route Handlers (Node + Edge)           │
         │                                                               │
         │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ │
         │ │ Supabase    │ │ Mapbox      │ │ Gemini      │ │ Groq     │ │
         │ │ Postgres +  │ │ Directions  │ │ 1.5 Flash   │ │ Whisper  │ │
         │ │ PostGIS +   │ │ + Geocoding │ │ (triage +   │ │ (voice   │ │
         │ │ RLS + Auth  │ │             │ │  reports)   │ │  intake) │ │
         │ └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘ │
         └───────────────────────────────────────────────────────────────┘
```

- **One deployment** serves dispatcher (desktop-first), chief (tablet/desktop), and firefighter HUD (mobile-first) from the same Next.js build.
- **Three React Context stores** (`crew-store`, `chief-store`, `member-store`) persist role-specific state in `localStorage`; `useChiefMirror(dispatchId)` bridges them live across browser tabs.
- **Edge middleware** enforces Supabase auth on every route with a fail-open guard so a flaky env var can't 500 the whole app.
- **PostGIS `geography(POINT, 4326)`** on every location, GIST indexes for nearest-neighbor queries.
- **Zod-validated AI** — every Gemini call has structured output + retry-once on validation failure + rule-based fallback on second failure.
- **`{ data, error, meta: { traceId } }`** envelope on every API response.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| **Framework** | Next.js 14 App Router | Server Components by default, Edge middleware for auth, the right tool for three-device responsive |
| **Language** | TypeScript (strict) | No `any`, no silent coercions |
| **UI** | Tailwind CSS + custom glass tokens | Glass-card surfaces, scanline-header sweeps, severity-tinted chrome |
| **Animation** | Framer Motion | Halo pulses, assignment bursts, PAR drain, LUNAR curtains |
| **Data viz** | Recharts v3 | 15 analytics cards (funnel, forecast, coverage, hotspots, confidence grids) |
| **Maps** | Mapbox GL JS v3 | Dark theme, 3D camera, route glow, marching-dash ants, chevron bearings |
| **State (server)** | TanStack Query v5 | `staleTime: 60s`, `refetchOnWindowFocus: false`, retry-once |
| **State (client)** | React Context + useReducer | crew / chief / member stores + localStorage persistence |
| **Forms** | React Hook Form + Zod | Shared schemas between client + API |
| **Database** | Supabase Postgres | RLS on every table, PostGIS for geography |
| **Auth** | Supabase Auth (JWT cookies) | Edge-runtime SSR via `@supabase/ssr` |
| **AI — triage + reports** | Google Gemini 1.5 Flash | Structured JSON output, sub-2-second responses |
| **AI — voice** | Groq Whisper (large-v3) | Voice intake + in-app commands |
| **Routing** | Mapbox Directions API | With custom A* fallback in `@flarepath/core` |
| **Push** | Web Push (VAPID) | No FCM, no Expo — browser-native |
| **Deploy** | Vercel | Edge runtime for middleware, Serverless for API routes |
| **Monorepo** | pnpm workspaces | Was Turbo; removed in Phase 5 for simpler deploys |

---

## Getting started

### Prerequisites

- **Node.js 20.x** (the repo pins this in `.nvmrc` and `engines.node`)
- **pnpm 10.x** — `npm i -g pnpm@10.33.0` or use Corepack
- Accounts on **Supabase, Mapbox, Google AI Studio, Groq** (free tiers are fine)

### 1. Clone + install

```bash
git clone https://github.com/Charan0622/Flarepath.git
cd Flarepath
pnpm install
```

### 2. Configure environment

Copy the template and fill in your keys:

```bash
cp .env.example apps/web/.env.local
```

Required keys — grab each from its dashboard (links in `apps/web/.env.local`'s section headers):

| Key | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same |
| `SUPABASE_SERVICE_ROLE_KEY` | same (secret — **server only**) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | mapbox.com → Access Tokens |
| `GEMINI_API_KEY` | aistudio.google.com → Get API Key |
| `GROQ_API_KEY` | console.groq.com → API Keys |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | `mailto:you@example.com` |

### 3. Migrate the database

Supabase dashboard → **SQL Editor** → run each file in order:

```
packages/supabase/migrations/
  00001_organizations_profiles.sql
  00002_full_schema.sql
  00003_incident_reports.sql
  00004_phase3_features.sql
  00005_fix_rls.sql
```

Then seed the demo organization so the three role logins have a home:

```sql
INSERT INTO organizations (id, name, timezone)
VALUES ('4a780897-794c-42eb-9944-e81cb8e00623', 'San Jose Fire Department', 'America/Los_Angeles')
ON CONFLICT (id) DO NOTHING;
```

### 4. Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and pick a role on the login screen. The demo-auth route will self-seed stations, vehicles, incidents, and an active dispatch the first time a chief or firefighter logs in — no manual data entry needed.

---

## Deploy to Vercel

The repo is preconfigured — `apps/web/vercel.json` tells Vercel exactly what to do.

1. **Import** the GitHub repo in Vercel.
2. On the "Configure Project" dialog, set **Root Directory = `apps/web`**.
3. Framework preset auto-detects as Next.js; don't override the build/install/output commands.
4. In **Environment Variables**, hit **Paste .env** and paste your whole `apps/web/.env.local` file.
5. **Deploy.**

Post-deploy sanity check: `https://<your-app>.vercel.app/api/debug/me` should return non-zero row counts for organizations, profiles, vehicles, dispatches. If it returns zeros, your env vars are set but don't match your local Supabase URL.

---

## The 90-second demo

1. Open the deployed URL on your laptop + your phone, side by side.
2. **On laptop:** log in as **Dispatcher** → you see the citywide map with active dispatches.
3. **On phone:** log in as **Unit Member** → you see a firefighter HUD with SCBA air gauge, tactical scene map, and action dock.
4. **On a second laptop window:** log in as **Unit Chief** → you see the command console with orbital crew constellation.
5. On the chief's window, click **Call PAR** on a crew member. On the firefighter's phone, a full-screen amber overlay demands acknowledgement with a 60 s countdown.
6. Tap **I AM OK** on the firefighter — the chief's constellation flips that member's halo to green.
7. On the firefighter, triple-tap **MAYDAY** → LUNAR curtain with five pre-filled fields → submit. The chief's console flashes red; the dispatcher's map badges the incident.
8. On the chief's console, click **Resolve Incident** → Gemini generates a post-incident HTML report that auto-prints.

Three roles, one incident, live sync — the whole point of the app.

---

## Project structure

```
flarepath/
├── apps/web/                      # Next.js 14 app (one deployment)
│   ├── app/
│   │   ├── (desktop)/             # dispatcher-only routes
│   │   ├── (responder)/           # mobile responder routes
│   │   ├── analytics/             # 15-card ops dashboard
│   │   ├── chief/                 # chief console
│   │   ├── unit/                  # unit member HUD
│   │   ├── teams/                 # crew management
│   │   ├── login/                 # 3-role picker
│   │   ├── report/                # citizen report PWA
│   │   └── api/                   # route handlers
│   │       ├── auth/demo/         # 3-role demo-user bootstrap
│   │       ├── ai/triage/         # Gemini classify + score
│   │       ├── ai/transcribe/     # Groq Whisper
│   │       ├── chief/[id]/        # chief data + report
│   │       ├── unit/[id]/         # unit HUD data
│   │       ├── dispatch/          # create/list/active/escalate
│   │       ├── incidents/         # CRUD + resolve
│   │       ├── analytics/         # one-shot ops metrics
│   │       └── debug/me/          # server-state diagnostic
│   ├── components/
│   │   ├── chief/                 # tactical canvas, crew constellation,
│   │   │                          # LUNAR curtain, PAR clock, RIT, pre-plan...
│   │   ├── unit/                  # avatar gauge, scene mini-map,
│   │   │                          # action dock, PTT, evidence capture...
│   │   └── analytics/             # 15 recharts card components
│   ├── lib/
│   │   ├── chief-store.tsx        # Context + reducer for chief state
│   │   ├── member-store.tsx       # same for members, + useChiefMirror bridge
│   │   ├── chief-data.ts          # zones, hydrants, biometric synthesis
│   │   ├── crew-data.ts           # SJFD call signs, ranks, demo crew
│   │   ├── supabase/              # SSR + middleware + API clients
│   │   ├── ai/                    # triage + extract + summarize (Gemini)
│   │   ├── demo-seed.ts           # station→vehicle→incident→dispatch bootstrap
│   │   └── postgis.ts             # EWKB hex → [lng, lat] parser
│   ├── vercel.json
│   └── .env.local                 # gitignored
├── packages/
│   ├── core/                      # @flarepath/core — Zod schemas, A* fallback
│   └── supabase/migrations/       # SQL migrations in order
├── pnpm-workspace.yaml
├── .env.example
└── README.md                      # you are here
```

---

## Standards & research

Flarepath is deliberately grounded in real fire-service UX and standards rather than generic SaaS dashboards.

### NFPA standards
- **NFPA 1500** — Standard on Fire Department Occupational Safety, Health, and Wellness Program (hot/warm/cold control zones)
- **NFPA 1407** — Standard for Training Fire Service Rapid Intervention Crews (RIT two-in / two-out)
- **NFPA 1561** — Standard on Emergency Services Incident Management System (PAR, accountability)
- **NFPA 1710** — Standard for Career Fire Departments (turnout ≤ 80 s, first-engine arrival ≤ 4 min, ERF ≤ 8 min)
- **NFPA 1981** — Standard on Open-Circuit SCBA (EOSTI low-air alert at 33% cylinder pressure)
- **NFPA 1982** — Standard on PASS (Personal Alert Safety System)

### Operational doctrine
- **LUNAR mayday** — Location · Unit · Name · Assignment/Air · Resources needed
- **ICS-201** — Incident Briefing form (pre-plan + assignments)
- **IAFC CRM** — Crew Resource Management radio policy

### UX benchmarks
- **Tablet Command** — tactical command worksheets
- **Adashi C&C** — incident command boards
- **Active911 / IamResponding** — responder mobile apps
- **MSA G1 / Scott EPIC 3 / Dräger FPS 7000** — SCBA HUDs
- **FLIR K-series** — thermal imaging palettes
- **FirstNet** — public-safety LTE UX
- **Motorola PremierOne / Hexagon OnCall** — dispatch CAD

---

## What I built (and what it taught me)

Phase 0 → Phase 5 spans from empty repo to a three-role, cross-synced, Vercel-deployed platform. The `instructions.md` file is a blow-by-blow build log — 1,400+ lines covering every technical decision, every standard referenced, every bug (including the 18 distinct Vercel deploy blockers in Phase 5). Worth skimming if you want to see the actual messy middle of building something like this.

### Things worth highlighting

- **Cross-role live sync without a backend realtime channel.** Chief and Member stores both persist to localStorage keyed on `dispatchId`; `useChiefMirror()` in the member store polls its chief's key every 2 s and listens to `storage` events for cross-tab instant-sync. Visibility-gated so backgrounded HUDs don't burn CPU. In prod this would be a Supabase Realtime channel — the bridge is the demo-mode substitute.
- **Crew journey animation from station to scene.** `crewJourneyPosition(now, startedAt, index)` in `chief-data.ts` returns `[lng, lat]` for each crew member based on a staged timeline: `staging → traveling (interpolated on route) → dispersing → on_scene`. Drives the chief's tactical canvas with 10 fps rAF.
- **Braided DNA buddy thread.** Between paired firefighters on the member's scene map, rendered as two offset sine-wave polylines in a shared geojson source. Amplitude is 3 meters in map coords (converted via cos-latitude); 60 steps per strand, phase-offset by π.
- **Edge-middleware fail-open.** Supabase auth runs on every request. If env vars are missing or Supabase hiccups, middleware falls back to `NextResponse.next()` instead of 500'ing the whole app — learned the hard way in Phase 5.
- **Lazy SDK construction.** Every external SDK (Gemini, Groq, Supabase admin, web-push) is instantiated inside its request handler, never at module scope. Build-time "collect page data" can never trip on a missing env var.
- **FLIR thermal palette via CSS filter.** Turning the map into a thermal imager doesn't require a new basemap — just `hue-rotate(-50deg) saturate(2) contrast(1.5) brightness(0.8)` on the Mapbox canvas element.

### Analytics — 15 cards, grounded in NFPA 1710

NFPA 1710 compliance gauges, 4-hour incident forecast, hotspot heatmap, station coverage isochrones, AI-confidence grids, dispatch funnels, turnout leaderboards — all driven by one `/api/analytics` endpoint that parallel-queries every relevant table.

![Analytics — 15-card ops dashboard](./Dispatcher%20Analytics%20Page.png)

### Crew management — drag-drop, custom units

Build engines and ladders from your personnel pool. Drag firefighters onto a roster, promote one to captain, create custom call-signs. Everything persists to localStorage and reflects across the chief's crew constellation.

![Teams — drag-drop personnel pool](./Dispatcher%20Crew%20management%20Page.png)

### Citywide hotspot view

Zoom out on the dispatcher map to see every active incident at once, color-coded by severity. Click any station or vehicle marker for its popover, click any incident for the AI-ranked dispatch panel.

![Dispatcher — citywide hotspot view](./Dispatcher%20home%20page%202.png)

### Things I cut

- **Turborepo** — one-app workspace didn't benefit from it; strict envMode added a failure mode that broke Vercel's env injection. Removed in Phase 5 for a ~60% simpler deploy config.
- **Three workspace packages** (`@flarepath/ui`, `@flarepath/api-client`, `@flarepath/config`) — scaffolded in Phase 0 for a future multi-app structure but never wired up; deleted in the Phase 5 cleanup.
- **Ghost dispatcher cursor, A/B/C/D size-up radial menu** — iterated visual flourishes the user rejected during review.

---

## Status

**Phase 5 complete.** The app is live, all three roles render correctly against a shared Supabase, cross-role sync works end-to-end, and the production build reproduces locally under the exact Vercel command chain. Further phases would add real Supabase Realtime (replacing the localStorage bridge), Turf-based spatial indexing on the chief's tactical canvas, and a real hydrant-GPM dataset from OpenStreetMap. All nice-to-haves; nothing blocks the demo.

**Deployment:** [flarepath-peach.vercel.app](https://flarepath-peach.vercel.app)
**Repo:** [github.com/Charan0622/Flarepath](https://github.com/Charan0622/Flarepath)

---

<div align="center">

Built by **[Charan Sai Gandham](https://github.com/Charan0622)**.

_Every second burns. We light the fastest way through._

</div>
