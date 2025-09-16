# Repository Guidelines

## Project Structure & Module Organization
- `convex/` contains database schema, queries, and mutations powering the app; group related functions by domain (collections, decks, billing).
- Keep `schema.ts` authoritative for data models; update types in `@/lib` when adjusting table definitions.
- Server modules exposing HTTP routes or cron jobs should live beside the resources they manage with clear filenames (`collections.ts`, `billing-webhooks.ts`).
- Avoid editing files under `_generated/`; they are overwritten by Convex codegen—reference them but extend logic elsewhere.

## Build, Test, and Development Commands
- Use `npm run all` or `npx convex dev` to run Convex locally while iterating; this folder relies on a running Convex deployment for validation.
- Execute `npx convex deploy` (with appropriate environment) only after review and secret configuration.
- Run `npm run lint` to ensure imported utilities and TypeScript definitions stay synchronized.

## Coding Style & Naming Conventions
- Name queries as `getEntity`/`listEntities` and mutations as `createEntity`/`updateEntity`; keep them in camelCase.
- Store shared validation logic and zod schemas in `@/lib` or dedicated `validators.ts` modules within the same domain folder.
- Keep comments concise but specific—document data assumptions, access control, and side effects above each export.
- Reference environment variables via `ctx.env` and document new keys in `docs/` or the root AGENTS guide.

## Testing Guidelines
- Add unit tests for data helpers in `@/lib` and replicate complex mutation paths with Convex testing utilities or integration suites.
- Validate access rules by writing tests that exercise role-based branches and ensure unauthorized access is rejected.
- Before merging, run smoke tests with `npx convex run` or manual API calls to confirm new fields populate as expected.

## Commit & Pull Request Guidelines
- Use commit prefixes tied to the domain, e.g., `feat(convex): add deck price mutation`.
- Document schema changes, required migrations, and environment variables in the PR description; include sample payloads when relevant.
- Coordinate deploy timing with frontend owners to avoid runtime mismatches between client and server.
