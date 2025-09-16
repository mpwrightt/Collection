# Repository Guidelines

## Project Structure & Module Organization
- This folder holds the authenticated dashboard experience; keep each feature (navigation, charts, collection grids) in its own file and import them into `page.tsx`.
- Group contextual components (e.g., quick actions, nav menus) under descriptive filenames and colocate supporting types with them.
- If multiple screens share UI, extract it to `@/components/dashboard` before copying code between sections.
- Maintain data hooks that wrap Convex queries in the same directory to keep dependencies explicit.

## Build, Test, and Development Commands
- Use `npm run dev` while editing to verify optimistic navigation, skeletons, and streaming responses inside the dashboard shell.
- Run `npm run lint` plus `npm run build` before merging structural changes to catch suspense or server component violations.
- When testing Convex interactions, run `npm run all` so the Python service and Convex dev server respond to dashboard requests.

## Coding Style & Naming Conventions
- Name files after the surface they render (`recent-items.tsx`, `section-cards.tsx`) and export small composable pieces instead of monolithic components.
- Favor server components for data hydration; if client state or transitions are required, isolate them to thin wrappers marked with `"use client"`.
- Keep hook names descriptive (`useDeckFilters`, `useCollectionSummary`) and colocate associated types in the same file.
- Order Tailwind classes layout → spacing → typography → color → state and keep class composition helpers (`cn`) minimal.

## Testing Guidelines
- Cover high-value widgets with React Testing Library or Storybook visual tests; include empty-state, loading, and error variations.
- Stub Convex responses via `@/lib/convexClient` utilities to avoid network coupling in unit tests.
- For navigation changes, exercise `NavMain` interactions using `user-event` to confirm optimistic routing and transitions render as expected.

## Commit & Pull Request Guidelines
- Summaries should reference the dashboard module, e.g., `fix(dashboard): stabilize collection table sort`.
- In PRs, document new analytics or totals displayed to ensure reviewers verify business logic, and attach before/after screenshots for UI adjustments.
- Note any schema or mutation updates so backend reviewers can coordinate migrations and seed data.
