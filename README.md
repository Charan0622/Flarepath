# Flarepath — AI-Powered Fire Emergency Dispatch

> *Light the path from call to scene.*

A real-time fire emergency dispatch platform with AI triage, shortest-path routing, and **in-browser turn-by-turn navigation**. One responsive Next.js 14 app serves desktop dispatchers and mobile-browser responders from the same URL.

---

## Features

### Command Center (Desktop)
- Live incident feed with priority-sorted cards, color-coded by severity
- Interactive Mapbox map with real-time incident and station markers
- AI-powered triage via Google Gemini — classifies severity, extracts entities, recommends resources
- One-click dispatch with ranked vehicle recommendations and route preview
- Red glowing route path rendered on the map the moment dispatch is confirmed
- Supabase Realtime — every connected tab updates within 500ms

### Responder View (Mobile)
- Web Push notifications with severity emoji and haptic feedback
- One-tap from notification directly to incident details
- Big, thumb-safe status buttons: Acknowledge → En Route → On Scene → Clear
- **In-browser turn-by-turn navigation** — voice-guided, 3D camera, bearing rotation
- Screen Wake Lock keeps the phone alive during navigation
- "Open in Google Maps" fallback for drivers who prefer native nav

### AI & Intelligence
- Gemini 1.5 Flash triage with structured JSON output + Zod validation
- Retry-once on validation failure, rule-based fallback on second failure
- Resource recommendation scoring: distance + vehicle type match + station load
- Every AI call logged with model, latency, confidence, tokens

### Architecture
- Modular monorepo (Turborepo + pnpm) with shared domain layer
- Row-Level Security on every table — the database is the access control boundary
- PostGIS geography columns with GIST indexes for nearest-neighbor queries
- State machines enforced server-side for incident and dispatch lifecycles
- Standard API envelope: `{ data, error, meta: { traceId } }`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, RSC) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| State (server) | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Database | Supabase Postgres + PostGIS |
| Auth | Supabase Auth (JWT, RLS) |
| Realtime | Supabase Realtime (WebSockets) |
| Maps | Mapbox GL JS |
| Routing | Mapbox Directions API |
| AI | Google Gemini 1.5 Flash |
| Push | Web Push (VAPID) |
| Voice | Web Speech API (SpeechSynthesis) |
| Deploy | Vercel |
| Monorepo | Turborepo + pnpm |

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 10+

### Setup

```bash
# Clone
git clone https://github.com/Charan0622/Flarepath.git
cd Flarepath

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example apps/web/.env.local
# Fill in your keys: Supabase, Mapbox, Gemini, VAPID

# Run database migrations
# → Paste the SQL files from packages/supabase/migrations/ into the Supabase SQL Editor

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
flarepath/
├── apps/web/              # Next.js 14 — one app for desktop + mobile
│   ├── app/
│   │   ├── (desktop)/     # Sidebar layout for dispatchers
│   │   ├── (responder)/   # Mobile layout for firefighters
│   │   │   ├── incident/  # Incident view + status buttons
│   │   │   └── navigate/  # Turn-by-turn navigation
│   │   └── api/           # REST endpoints
│   ├── components/        # React components
│   └── lib/               # Supabase clients, AI triage, utilities
├── packages/
│   ├── core/              # Zod schemas, domain logic, scoring
│   ├── ui/                # Design tokens, shared components
│   ├── config/            # TSConfig, Tailwind preset
│   └── supabase/          # DB clients, migrations
└── .github/workflows/     # CI pipeline
```

---

## Demo Flow (90 seconds)

1. Open dashboard on desktop — see live incidents on the dark map
2. Click **"New Incident"** → type a fire description → watch AI triage populate in <2s
3. Click **"Dispatch"** → see ranked vehicle recommendations → confirm
4. Red route draws from station to incident on the map
5. Open the same URL on mobile — get the push notification
6. Tap **"Start Navigation"** — full-screen 3D map with voice guidance
7. Watch the vehicle dot move on the dispatcher's map in real-time
8. Tap **"On Scene"** → incident card updates instantly on desktop

---

## License

MIT

---

*Built by [Charan](https://github.com/Charan0622) — MS in Artificial Intelligence*
