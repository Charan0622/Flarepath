# Flarepath — Build Instructions & Tech Log

> This file is updated after every phase. It logs every setup step, technology definition, and decision made during the build.

---

## Phase 0 — Pre-Build Setup

### Steps Completed

#### 1. Python Virtual Environment
- Created `.venv/` using `python3 -m venv .venv` (Python 3.9.6)
- Installed `nodeenv` and `pnpm` (v10.33.0) inside the venv to avoid global permission issues
- **Why venv?** Provides an isolated environment for tooling without requiring `sudo` for global installs

#### 2. Git Repository Initialized
- `git init` in project root
- Remote added: `https://github.com/Charan0622/Flarepath.git`
- `.gitignore` created covering: `node_modules/`, `.venv/`, `.next/`, `.env*`, IDE files, OS files, Turbo cache

#### 3. pnpm Monorepo with Turborepo
- `pnpm init` at root — creates the workspace root `package.json`
- `pnpm-workspace.yaml` — declares `apps/*` and `packages/*` as workspace members
- `turbo.json` — configures task pipeline (`build`, `dev`, `lint`, `typecheck`, `test`) with dependency ordering and caching

#### 4. Next.js 14 App (`apps/web`)
- Created with `create-next-app@14` — App Router, TypeScript strict, Tailwind CSS, ESLint
- Dark-themed "Hello Flarepath" landing page with severity badge previews
- Route groups created: `(desktop)/` for command center, `(responder)/` for mobile layout, `api/` for route handlers
- **Why route groups?** Next.js route groups `(name)` allow different layouts for desktop vs. mobile from the same app without affecting the URL structure

#### 5. Shared Packages Created

| Package | Purpose |
|---|---|
| `@flarepath/config` | Shared TSConfig base, Tailwind preset, ESLint/Prettier configs |
| `@flarepath/core` | Pure TypeScript: Zod schemas, derived types, domain logic (state machines, scoring, A*) |
| `@flarepath/ui` | Shared React components + design tokens (severity colors, radii, motion) |
| `@flarepath/api-client` | Typed fetch wrapper + TanStack Query hooks for data fetching |
| `@flarepath/supabase` | Generated Supabase types, RLS policies, migration tracking |

#### 6. Design Tokens
- Defined in `packages/ui/src/tokens.ts`
- Severity palette: critical `#ff2d2d`, high `#ff7b1c`, medium `#ffc93c`, low `#3ddc84`
- Background scale: base `#0a0a0b`, raised `#121214`, overlay `#1a1a1e`, muted `#2a2a2e`
- Motion: fast 120ms, normal 220ms, slow 400ms
- Tailwind preset in `packages/config/tailwind.preset.js` mirrors these tokens

#### 7. Environment Variables
- `.env.example` created with all required keys: Supabase, Mapbox, Gemini, Groq, VAPID, Sentry, PostHog, Upstash

#### 8. VAPID Keys Generated (Phase 0.3)
- Generated using `npx web-push generate-vapid-keys`
- Public and private keys ready for `.env.local`
- **What are VAPID keys?** Voluntary Application Server Identification keys authenticate your server to send Web Push notifications without a third-party service like Firebase

#### 9. Visual Identity Locked (Phase 0.4)
- Product name: **Flarepath**
- Logomark: Custom SVG — layered flame shape using severity colors (red outer, orange mid, yellow core) with a path line underneath
- Favicon: 32x32 PNG derived from the SVG
- PWA icons: 192x192 and 512x512 PNGs for home screen installation
- `manifest.json`: standalone display, dark background (#0a0a0b), red theme (#ff2d2d)
- Severity palette confirmed: critical `#ff2d2d`, high `#ff7b1c`, medium `#ffc93c`, low `#3ddc84`

#### 10. Demo City Selected (Phase 0.2)
- **City:** San Jose, California, USA
- **Why:** Silicon Valley resonance for US/MNC recruiters, real SJFD station data, excellent OSM coverage
- **3 Fire Stations:** SJFD Station 1 (225 N Market St, Downtown), Station 7 (800 Emory St, West), Station 30 (3030 Alum Rock Ave, East)
- **6 Vehicles:** 3 engines, 1 ladder, 1 tanker, 1 rescue — distributed across stations
- **10 Incident Scenarios:** Covering structure fire, vehicle fire, wildfire, hazmat, rescue, false alarm — with realistic San Jose addresses (Santana Row, SoFA District, Alum Rock Park, Willow Glen, etc.)
- Seed data file: `packages/core/src/seed/demo-city.ts`

---

## Tech Stack Definitions

| Technology | What It Is | Why We Use It |
|---|---|---|
| **Next.js 14** | React meta-framework with App Router, RSC, and Route Handlers | Server components for fast loads; API routes eliminate a separate backend; deploys to Vercel for free |
| **TypeScript (strict)** | Typed superset of JavaScript | Catches bugs at compile time; critical for a system where wrong data can cause dispatch errors |
| **Tailwind CSS** | Utility-first CSS framework | Rapid styling with design tokens; no CSS-in-JS runtime cost |
| **shadcn/ui** | Copy-paste component library built on Radix UI | Production-grade accessible components with full design control |
| **Turborepo** | Monorepo build orchestrator | Caches builds across packages; single `pnpm dev` starts everything |
| **pnpm** | Fast, disk-efficient package manager | Workspace-native; strict dependency resolution prevents phantom deps |
| **Zod** | TypeScript-first schema validation | Shared between client and server; validates AI outputs, API inputs, DB rows |
| **TanStack Query v5** | Server state management for React | Handles caching, refetching, optimistic updates, background sync |
| **Zustand** | Lightweight client state manager | Only for truly global UI state (theme, drawer open); simpler than Redux |
| **React Hook Form** | Performant form library | Minimal re-renders; pairs with Zod for validated forms |
| **Supabase** | Postgres + Auth + Realtime + Storage as a service | RLS for row-level security; built-in WebSocket realtime; generous free tier |
| **Mapbox GL JS** | Vector map library | Best dark-theme styling; free tier of 50k loads/month; supports 3D pitch for navigation |
| **Google Gemini 1.5 Flash** | LLM for structured text analysis | Generous free tier (60 RPM); used for incident triage with structured JSON output |
| **Groq Whisper** | Speech-to-text API | Fastest Whisper inference; free tier; used for voice intake (Phase 2) |
| **Web Push (VAPID)** | Browser push notification standard | Free, no Firebase dependency; works on Android Chrome natively, iOS 16.4+ as PWA |
| **Vercel** | Frontend deployment platform | Free hobby tier; preview deploys per PR; edge functions globally |
| **PostGIS** | Geospatial extension for PostgreSQL | Enables `geography(POINT)` columns and `<->` nearest-neighbor queries with GIST indexes |

---

## Repo Structure (Current)

```
flarepath/
├── .venv/                    # Python venv with pnpm installed locally
├── .gitignore
├── .env.example
├── package.json              # Workspace root
├── pnpm-workspace.yaml       # Workspace member declarations
├── turbo.json                # Turborepo task pipeline
├── CLAUDE.md                 # AI assistant instructions
├── PLAN.md                   # Phase/task breakdown
├── Flarepath-Project-Doc.md  # Full design document
├── instructions.md           # ← this file
├── apps/
│   └── web/                  # Next.js 14 app
│       └── app/
│           ├── (desktop)/    # Desktop command center layout
│           ├── (responder)/  # Mobile responder layout
│           ├── api/          # Route handlers
│           ├── layout.tsx    # Root layout (dark theme)
│           ├── page.tsx      # Hello Flarepath landing
│           └── globals.css   # Tailwind + CSS variables
└── packages/
    ├── config/               # tsconfig.base.json, tailwind.preset.js
    ├── core/                 # Zod schemas, types, domain logic
    │   └── src/
    │       ├── schemas/
    │       ├── types/
    │       └── domain/
    ├── ui/                   # Shared components + design tokens
    │   └── src/
    │       ├── tokens.ts
    │       └── index.ts
    ├── api-client/           # Typed fetch + TanStack Query hooks
    │   └── src/
    └── supabase/             # Generated types, migrations
        ├── src/
        └── migrations/
```

---

## Phase 1 — MVP (Week 1-4)
*Will be updated as tasks are completed.*

---

## Phase 2 — Depth (Week 5-7)
*Will be updated after Phase 1 ships.*

---

## Phase 3 — Wow Features
*Optional. Will be updated if pursued.*

---

*Last updated: 2026-04-17 — Phase 0 complete, Phase 1 ready to begin*
