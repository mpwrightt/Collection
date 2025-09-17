# TCG Collection Tracker

Collection Tracker is a full-stack web application for managing trading card game (TCG) collections, tracking market value, building decks with legality checks, and bridging directly to TCGplayer for catalog and pricing data. The stack pairs a Next.js 15 App Router front end with Convex real-time functions, Clerk authentication, and an optional FastAPI microservice for high-throughput TCGplayer requests.

## Highlights
- Manage collections with nested folders, targets, tags, and rich pricing metrics backed by Convex
- Track market value using cached TCGplayer pricing data with scheduled refresh and on-demand sync
- Build decks across MTG, Pokémon, and Yu-Gi-Oh! with section-aware editing, holdings comparison, and format metadata
- Generate deck analysis and upgrade suggestions through the Gemini-powered AI assistant
- "Buy missing" integrations that compute deltas versus collections and prepare CSV/quicklist exports for TCGplayer
- `run_all.sh` orchestrates the Next.js dev server, Convex dev environment, and local Python microservice in one command

## Architecture Overview
- **Next.js App (`app/`, `components/`, `hooks/`, `lib/`)**: App Router UI, dashboard widgets, data hooks, and shared utilities. Tailwind v4 + shadcn/ui provide styling primitives.
- **Convex backend (`convex/`)**: Serverless queries, mutations, actions, and HTTP routes for collections, decks, pricing cache, Clerk webhooks, and TCGplayer orchestration.
- **TCGplayer Python service (`tcgplayer-python/`)**: FastAPI + SDK that mirrors catalog/media/pricing endpoints with rate limiting and caching. Used when `TCGPY_PUBLIC_URL` is available; otherwise Convex calls TCGplayer directly.
- **Authentication & Billing**: Clerk handles auth, sessions, and optional billing; JWT template `convex` drives secure Convex access.
- **Documentation (`docs/`)**: Living specs covering setup, schema, API usage, frontend flows, and operational runbooks.

## Project Layout
- `app/` – App Router routes (`/` landing, `/dashboard` collections/decks analytics, API routes)
- `components/` – Reusable UI primitives and feature components (collections dialogs, tables, charts)
- `convex/` – Convex schema, queries, mutations, actions, and HTTP handlers for Clerk + TCGplayer
- `tcgplayer-python/` – FastAPI microservice and reusable Python SDK for TCGplayer
- `docs/` – Product requirements, setup, schema reference, integration guides, and change log
- `lib/`, `hooks/` – Shared utilities, data adapters, and custom React hooks used across the app
- `public/` – Static assets and icons

## Getting Started
1. **Install prerequisites**: Node 18+, pnpm or npm, Convex CLI (`npm i -g convex`), Python 3.10+ for the service, and a Clerk + TCGplayer account.
2. **Install dependencies**: `pnpm install` (or `npm install`).
3. **Copy environment template**: `cp .env.example .env.local` and populate the values listed below.
4. **Configure Convex server env** (runs in the cloud even during dev):
   ```bash
   npx convex env set TCGPLAYER_CLIENT_ID "..."
   npx convex env set TCGPLAYER_CLIENT_SECRET "..."
   npx convex env set TCGPLAYER_API_VERSION "v1.39.0"
   # Optional: expose local Python service via tunnel and share the URL
   npx convex env set TCGPY_SERVICE_URL "https://your-public-tunnel"  # or let run_all.sh manage it
   ```
5. **Run the stack**:
   - Easiest: `npm run all` → executes `run_all.sh` to launch the Python service (port 8787), Convex dev, and Next.js dev.
   - Manual: in separate terminals run `npx convex dev`, `npm run dev`, and (optional) `cd tcgplayer-python && uvicorn service.app:app --reload --port 8787`.
6. Sign in with your Clerk account. The dashboard loads demo data if `NEXT_PUBLIC_CONVEX_URL` is unset, otherwise live collection data syncs via Convex.

### Environment Variables
| Scope | Variable | Notes |
| --- | --- | --- |
| Next.js | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| Next.js | `CLERK_SECRET_KEY` | Server-side Clerk key (keep secret) |
| Next.js | `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` | Clerk domain from the `convex` JWT template |
| Next.js | `NEXT_PUBLIC_CONVEX_URL` | Provided by `npx convex dev`; enables live data instead of demo mode |
| Next.js | `NEXT_PUBLIC_CLERK_SIGN_*` | Dashboard redirect targets after auth |
| Convex | `TCGPLAYER_CLIENT_ID`, `TCGPLAYER_CLIENT_SECRET`, `TCGPLAYER_API_VERSION` | TCGplayer API credentials & version |
| Convex (optional) | `TCGPY_SERVICE_URL` | Publicly reachable FastAPI service URL; omit for direct TCGplayer access |
| Convex (optional) | `CLERK_WEBHOOK_SECRET` | Set via Clerk dashboard if webhooks are enabled |
| Convex (optional) | `GOOGLE_API_KEY`, `GEMINI_MODEL` | Enables Gemini-powered deck analysis |

## Key Workflows
- **Collections**: `convex/collections.ts` powers CRUD, summaries, valuation, and completion tracking. UI lives in `app/dashboard/collections/` with dialogs for folder creation, targets, and sorting.
- **Pricing**: `convex/pricing.ts` fetches prices via Convex actions, writes to `pricingCache`, and hydrates dashboard + deck estimates. Refresh buttons trigger background actions with rate limiting.
- **Deck Builder**: `convex/decks.ts` + `app/dashboard/decks/` manage deck lists, sections, legality metadata, and holdings diffing. `convex/ai.ts` integrates Gemini for analysis and suggestions.
- **TCGplayer service**: `tcgplayer-python/service/` exposes catalog, pricing, and media endpoints; `run_all.sh` installs dependencies and keeps it running locally.
- **"Buy Missing" flow**: Deck and collection deltas produce CSV/quicklists for TCGplayer imports (see `convex/tcg.ts` and dashboard actions).

## Scripts
- `npm run dev` – Next.js dev server (Turbopack)
- `npx convex dev` – Convex backend (required for live data)
- `npm run all` – Run Python service + Convex + Next.js via `run_all.sh`
- `npm run build` / `npm run start` – Production build and start
- `npm run lint` – ESLint + Tailwind rules
- `cd tcgplayer-python && make test` – Python service/unit tests
- `cd tcgplayer-python && make ci` – Full Python pipeline

## Testing & Quality
- Frontend: run `npm run lint` before committing; add Vitest/Playwright tests alongside new UI where possible.
- Backend/Convex: leverage `docs/CONVEX.md` for query/action contracts; add integration tests when touching pricing or deck flows.
- Python service: keep coverage ≥80% with `make test`; fixtures live in `tcgplayer-python/tests/`.

## Documentation & Support
- Start with `docs/SETUP.md` for step-by-step environment configuration.
- `docs/FRONTEND.md`, `docs/CONVEX.md`, and `docs/TCGPLAYER.md` cover feature flows, data contracts, and API expectations.
- `PRD.md` outlines the product vision, milestones, and non-goals.
- Operational tips and troubleshooting live in `docs/RUNBOOK.md`.

## Contributing
Follow Conventional Commits (e.g., `feat: add deck legality checks`), keep `npm run lint` and `make test` green, and update docs when data contracts change. For shared secrets, use `npx convex env set` instead of committing to `.env.local`.

