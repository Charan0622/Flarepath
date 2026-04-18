# CLAUDE.md — Flarepath Project Context

> This file is the first thing Claude Code reads. Cursor/Windsurf pick it up too. Keep it accurate, short, and actionable. If you find yourself explaining the same thing to me twice in one session, add it here.

---

## Project One-Liner

**Flarepath** is a real-time fire emergency dispatch platform with AI triage, shortest-path routing, and **in-browser turn-by-turn navigation**. One responsive Next.js 14 app serves desktop dispatchers and mobile-browser responders from the same URL.

*Tagline: "Light the path from call to scene."* — the name comes from the row of runway lights that guide aircraft in at night; our product does the same for a fire crew, with a glowing red route the moment dispatch is confirmed.

- **North star:** deployable demo on free tiers, impressive to MNC recruiters.
- **Status:** Phase 1 MVP build — check `PLAN.md` for the active task.
- **Owner:** Solo developer (MS AI student portfolio project).

---

## Before You Do Anything

1. Read `PLAN.md` → find the section marked `[ACTIVE]`. That's what we're working on.
2. If my request doesn't match the active task, **ask** before pivoting.
3. Check existing code before creating new files. **Never** create a new utility, hook, or component if something similar already exists — extend or refactor.
4. If the right answer requires a decision I haven't made yet, **stop and ask** — don't guess and don't "leave a TODO."

---

## Tech Stack (Locked — Do Not Swap Without My Approval)

| Layer | Choice | Notes |
|---|---|---|
| Web framework | Next.js 14 App Router | RSC by default, `"use client"` only when needed |
| Language | TypeScript (strict) | No `any`. No `@ts-ignore` without a comment explaining why. |
| Styling | Tailwind CSS + shadcn/ui | Tokens in `packages/ui/tokens.ts`. No inline `style={}` except dynamic values. |
| State (server) | TanStack Query v5 | All data-fetching hooks live in `packages/api-client` |
| State (client) | Zustand | Only for truly global UI state (theme, drawer open, etc.) |
| Forms | React Hook Form + Zod | Zod schemas live in `packages/core/schemas` and are shared with the API |
| Database | Supabase Postgres | Migrations in `packages/supabase/migrations`, RLS **always on** |
| Auth | Supabase Auth | JWT in httpOnly cookies; check session in middleware |
| Realtime | Supabase Realtime | Channel naming: `org:{id}:incidents`, `dispatch:{id}:pings` |
| Maps | Mapbox GL JS | Dark-theme style; red path spec in §10.3 of design doc |
| Routing | Mapbox Directions API (primary) + custom A* (fallback) | Fallback lives in `packages/core/domain/routing` |
| AI | Google Gemini 1.5 Flash (text), Groq Whisper (audio) | Always structured output + Zod validation + retry-once fallback |
| Push | Web Push (VAPID) | No Firebase. No Expo Push (Phase 3 only). |
| Deploy | Vercel (web) | Single deploy serves desktop + mobile PWA |
| Monorepo | Turborepo + pnpm | `pnpm dev` at root runs everything |

**If a request would require a new dependency, stop and ask me first.** List the alternatives and say why you're picking one.

---

## Repo Layout

```
flarepath/
├── apps/
│   └── web/                  # Next.js 14 — serves desktop + mobile PWA
│       └── app/
│           ├── (desktop)/    # ≥1024px layout — Command Center
│           ├── (responder)/  # <1024px layout — mobile navigator
│           └── api/          # Route Handlers (Edge runtime where possible)
├── packages/
│   ├── core/                 # Pure TS: Zod schemas, types, domain rules, A*
│   ├── ui/                   # Shared components + design tokens
│   ├── api-client/           # Typed fetch wrapper + TanStack Query hooks
│   └── supabase/             # Generated types, RLS policies, migrations
├── CLAUDE.md                 # ← you are here
├── PLAN.md                   # Phase/week/task breakdown
└── .cursor/rules/            # Granular rules (auto-loaded by Cursor)
```

Don't create files outside this structure without asking.

---

## Critical Conventions

### File & export style
- **Default export** for pages (`page.tsx`) and components. **Named exports** for everything else.
- One component per file. File name = component name in PascalCase.
- Co-locate: `IncidentCard.tsx`, `IncidentCard.test.tsx`, `IncidentCard.stories.tsx` in the same folder.
- Hooks → `use*.ts` in the nearest `hooks/` folder up the tree.
- Server-only code → import `"server-only"` at the top.
- Client components → `"use client"` only when you actually need state, effects, or event handlers.

### Types & validation
- Every API input and output has a Zod schema in `packages/core/schemas/`.
- Derive TS types with `z.infer<typeof Schema>` — never hand-write a type that duplicates a schema.
- Validate at every trust boundary: request body, external API response, database row on read.
- `unknown` is fine. `any` is not.

### Error handling
- API routes return `{ data, error, meta }` envelope — never throw to the client.
- Use a `Result<T, E>` or discriminated union for domain errors (not exceptions).
- Log with structured fields (`traceId`, `userId`, `action`) — never `console.log` in committed code.

### Database
- Every migration is additive first; destructive changes require a follow-up migration + deploy gap.
- Every table has `id uuid`, `created_at`, `updated_at`, RLS enabled, and an owning organization.
- Use PostGIS `geography(POINT, 4326)` for locations. Use `<->` with a GIST index for nearest-neighbor queries.
- Regenerate Supabase types after every schema change: `pnpm supabase:types`.

### AI calls
- Always use structured output mode (JSON schema).
- Always validate with Zod. On failure: retry once with a "your previous response failed validation, here's what went wrong" prompt. On second failure: fall back to a rule-based path or error gracefully.
- Log `{ model, prompt_hash, latency_ms, input_tokens, output_tokens, confidence }` to the `ai_triage` (or equivalent) table.
- Never show raw AI output directly — always render the validated/typed fields.

### Security
- Row-Level Security is the source of truth for access control. **The API is not allowed to trust the client.**
- Never log secrets, JWTs, or PII.
- Rate-limit every `/api/ai/*` endpoint (Upstash free tier).
- CSP headers in `middleware.ts`; no `unsafe-inline` in production.

### UI
- Dark mode first. Light mode is Phase 2.
- Color **only** carries meaning for severity. Don't use red for anything except severity + the dispatched route.
- Minimum tap target on mobile: 44×44px (56px preferred for critical actions).
- Motion tokens from `packages/ui/tokens.ts` — no hardcoded durations.

---

## Commands I Run Often

```bash
# Run everything
pnpm dev

# Per-app
pnpm --filter web dev

# Type-check & lint the whole monorepo
pnpm turbo run typecheck lint

# Generate Supabase types after a schema change
pnpm supabase:types

# New migration
pnpm supabase migration new <name>

# Run tests
pnpm turbo run test

# Before opening a PR
pnpm turbo run typecheck lint test build
```

---

## What "Done" Means for a Task

A task is done when **all** of these are true:

1. ✅ It works end-to-end (I can demo it without manual tweaks).
2. ✅ Types pass (`pnpm turbo run typecheck`).
3. ✅ Lint passes (`pnpm turbo run lint`).
4. ✅ Relevant tests exist and pass (unit for pure logic, integration for API routes).
5. ✅ No `console.log`, no commented-out code, no orphaned files.
6. ✅ If it touched the DB: migration is in the repo and `pnpm supabase:types` was run.
7. ✅ If it's user-facing: works on desktop Chrome AND mobile Chrome (test both).
8. ✅ A one-line CHANGELOG entry was added to `PLAN.md` under the completed task.

---

## What You Should NOT Do

- ❌ Don't scaffold with `create-next-app` or similar after the repo is set up — work with what's there.
- ❌ Don't add a new npm package without asking.
- ❌ Don't write "placeholder" logic with `// TODO: implement this`. Either build it or ask.
- ❌ Don't introduce a new state management library, CSS framework, or ORM.
- ❌ Don't create `utils.ts`, `helpers.ts`, or `common/` grab-bag files. Put functions in the module they belong to.
- ❌ Don't write comments that explain *what* the code does. Comments explain *why*.
- ❌ Don't use `useEffect` for data fetching. Use TanStack Query.
- ❌ Don't disable lint/type errors to "move faster."
- ❌ Don't generate fake/mock data in production code paths — use Storybook or a dedicated `dev-seed/` script.
- ❌ Don't ship AI output without Zod validation.
- ❌ Don't break the mobile layout to make the desktop one work. If there's a conflict, tell me.

---

## When in Doubt

Ask me with this template:

> "Before I do X, a few options:
> - **A:** [pro, con]
> - **B:** [pro, con]
> - **C:** [pro, con]
> My recommendation: [one], because [reason]. Proceed?"

I'd much rather answer a 30-second question than untangle a wrong decision an hour later.

---

## Quick Glossary

- **Incident** — the real-world emergency (one row in `incidents`)
- **Dispatch** — the assignment of a specific vehicle + crew to an incident (many per incident)
- **Triage** — the AI-driven classification of an incident (severity, type, resources needed)
- **Responder** — a firefighter / driver in the field, using mobile Chrome
- **Dispatcher** — the person in the command center assigning resources
- **Ping** — a single GPS location update from a vehicle
- **Route** — the polyline + turn-by-turn steps from a vehicle to an incident

---

*Update this file when conventions change. It's living documentation.*
