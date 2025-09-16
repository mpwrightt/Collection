# Repository Guidelines

## Project Structure & Module Organization
- `app/` holds App Router routes; keep feature folders self-contained with clear server/client boundaries.
- `components/` centralizes reusable UI primitives referenced as `@/components/...`.
- `convex/` contains database functions and jobs; update matching helpers in `lib/` when data contracts shift.
- `tcgplayer-python/` houses the FastAPI microservice and SDK consumed by Convex; `service/` exposes HTTP endpoints.
- Shared helpers live in `hooks/` and `lib/`, static assets in `public/`, docs and specs in `docs/`.

## Build, Test, and Development Commands
- `npm run dev` starts the Next.js app with Turbopack on port 3000.
- `npm run build` compiles the production bundle; pair with `npm run start` for smoke tests.
- `npm run lint` executes ESLint and Tailwind rules; fix all warnings before committing.
- `npm run all` boots the Python service, Convex dev server, and Next dev server; export `TCGPLAYER_CLIENT_ID`/`SECRET` and optional `TCGPY_PUBLIC_URL` first.
- Python tooling: `cd tcgplayer-python && make ci` for the pipeline or `make test` for fast feedback.

## Coding Style & Naming Conventions
- TypeScript uses two-space indentation, double quotes, and no semicolons; components are PascalCase, hooks `useCamelCase`, helpers camelCase.
- Order Tailwind classes layout → spacing → typography → color → state.
- Keep generated artifacts (`.next/`, Convex outputs) out of Git; rely on `npm run lint` and TypeScript diagnostics locally.
- Python code follows Black/isort (line length 88) and descriptive FastAPI handler names such as `get_collection_summary`.

## Testing Guidelines
- Add colocated `*.test.tsx` or integration tests for new UI or Convex touchpoints; mock remote calls via adapters in `lib/`.
- Frontend changes must pass `npm run lint`; adopt Playwright or Vitest when covering interactive flows.
- For the TCGplayer service, extend `tests/` with fixtures for Convex payloads and keep `make test` (≥80% coverage) green.

## Commit & Pull Request Guidelines
- Prefer Conventional Commits (`feat:`, `fix:`, `chore:`) with short imperative summaries like `feat: add set completion progress`.
- Link issues in the footer, describe backend/frontend impacts, and attach screenshots or recordings for UI updates.
- Highlight new environment variables or migrations in the PR description so reviewers can reproduce changes.

## Environment & Service Configuration
- Duplicate `.env.example` to `.env.local`, then fill Clerk, Convex, TCGplayer, and Gemini keys if used; `run_all.sh` sources them automatically.
- Keep secrets out of Git: use `npx convex env set KEY value` for server-only entries and note additions briefly in `docs/`.
