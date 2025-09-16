# Repository Guidelines

## Project Structure & Module Organization
- Deck-specific UI, filters, and analytics live here; keep list views, detail panels, and modals in separate files for clarity.
- Fetch Convex data within server components and pass only the minimal props into client components such as drag-and-drop lists.
- Shared deck utilities (sorting, normalization) should move to `@/lib/decks` to support reuse across routes.
- Keep modal or sheet components beside their trigger with filenames like `deck-builder-dialog.tsx` to simplify discovery.

## Build, Test, and Development Commands
- Start `npm run dev` while iterating to validate DnD, optimistic updates, and navigation.
- Run `npm run lint` to catch client/server boundary violations and TypeScript regressions before pushing.
- For flows that rely on the Python TCG service (e.g., card search), use `npm run all` so Convex and the service respond locally.

## Coding Style & Naming Conventions
- Name components after the surface they render (`DeckSummaryCard`, `DeckFiltersPanel`) and keep supporting hooks prefixed with `use`.
- Encapsulate drag handles and sensors in dedicated files; avoid burying third-party configuration inside large components.
- Tailwind ordering stays layout → spacing → typography → color → state; prefer utility classes over inline styles.
- Include short comments before complex reducers or state machines describing the intent of transitions.

## Testing Guidelines
- Write integration tests covering deck creation, update, and reorder scenarios; mock Convex mutations through adapters in `@/lib/convexClient`.
- Exercise drag-and-drop flows with `@dnd-kit` testing utilities or Storybook interaction tests to prevent regression.
- Validate derived metrics (card counts, mana curves) with unit tests that run independently of the UI when possible.

## Commit & Pull Request Guidelines
- Frame commits with the deck feature name, e.g., `feat(decks): add commander quick stats panel`.
- In PRs, describe the lifecycle of deck objects and any new Convex functions required, and attach before/after imagery for visual widgets.
- Call out data migrations or breaking schema updates and coordinate with backend maintainers for deployment timing.
