# Repository Guidelines

## Project Structure & Module Organization
- Each subfolder represents a routed segment in the Next.js App Router; colocate pages, layouts, loading states, and route handlers inside the same directory.
- Keep server components in `page.tsx` or nested files by default and mark client components explicitly with `"use client"`.
- Share cross-route utilities via `@/lib` and route metadata via `generateMetadata`; avoid duplicating constants defined higher in the tree.
- Store helper fragments (cards, tables, filters) in sibling files named after the feature, e.g., `inventory-table.tsx`.

## Build, Test, and Development Commands
- Use `npm run dev` from the repo root to test updates; the App Router supports hot refresh in this folder.
- Run `npm run lint` to validate TypeScript and Tailwind usage before committing route-level changes.
- When adjusting data fetching, run `npm run all` if the Convex or Python services are required to exercise the screen end-to-end.

## Coding Style & Naming Conventions
- Components exported from this directory use PascalCase file names; keep default exports minimal and prefer named exports for reusable pieces.
- Compose Tailwind classes in the order layout → spacing → typography → color → state to support readability in diffs.
- Prefer async server components that fetch via Convex functions; for client interactivity, split the logic into a small hook in `@/hooks` plus a presentation component.
- Keep route-level metadata (`metadata` or `generateMetadata`) near the top of each file and document unusual redirects in a leading comment.

## Testing Guidelines
- Add colocated tests when a route exposes complex UI logic; `page.test.tsx` or `component.test.tsx` should live alongside the component.
- Mock Convex calls via helpers in `@/lib/convexClient` to keep tests deterministic.
- Verify that loading states and empty states render by using React Testing Library snapshots or storybook stories (if available).

## Commit & Pull Request Guidelines
- Reference the route path in your commit summary when practical, e.g., `feat(app/dashboard): add card creator CTA`.
- Provide GIFs or screenshots covering the primary viewport widths in the PR description.
- Note any dependency on new Convex mutations or environment variables so reviewers can sync supporting services.
