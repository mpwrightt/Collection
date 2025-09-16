# Repository Guidelines

## Project Structure & Module Organization
- This segment handles subscription-gated content; keep paywalled components, loading states, and CTA banners inside this folder.
- Route metadata, layout wrappers, and guard logic should live next to `page.tsx` to keep the entry point self-contained.
- Shared billing UI belongs in `@/components/billing`; import from there rather than duplicating plans or pricing tables.
- Store helper constants (feature lists, copy) in local files with descriptive names like `features.ts` to simplify updates.

## Build, Test, and Development Commands
- Run `npm run dev` to verify clerk gating and redirect flows locally; ensure you are signed in with a test user covering both subscribed and unsubscribed states.
- Execute `npm run lint` before committing to validate client/server boundaries and check for unused imports.
- When modifying gating logic that touches Convex or Clerk webhooks, run `npm run all` to bring up supporting services for end-to-end validation.

## Coding Style & Naming Conventions
- Keep component file names PascalCase and describe the surface (`PremiumHighlights`, `UpgradeBanner`).
- Guard logic should be encapsulated in helpers like `assertSubscriber` placed near the route and re-used across client components.
- Tailwind classes follow layout → spacing → typography → color → state ordering; store repeated class sets in `@/lib/styles`.
- Document any conditional redirects or middleware expectations via short comments near the guard implementation.

## Testing Guidelines
- Create scenario tests that render the route with mock subscription states; stub Clerk context to assert redirects and banners.
- Cover CTAs and action buttons with interaction tests to confirm they navigate to the desired billing or upgrade route.
- If new Convex mutations are introduced for premium workflows, add corresponding unit tests under `convex/` and mention them in your PR.

## Commit & Pull Request Guidelines
- Mention the gated route in commits (e.g., `feat(payment-gated): add premium decks grid`) and include gifs showing both authorized and locked states.
- Outline any new environment variables or webhook configuration so reviewers can mirror the setup locally.
- Call out copy changes for marketing review when updating plan descriptions or pricing highlights.
