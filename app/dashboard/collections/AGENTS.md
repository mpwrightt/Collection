# Repository Guidelines

## Project Structure & Module Organization
- This directory powers the collections overview experience; keep list views, filters, and summary widgets in distinct files for easier maintenance.
- Shared data mappers and schema definitions should move to `@/lib/collections`; import them from server components to avoid duplication.
- Local constants for table columns or badge copy belong in helper files like `columns.ts` or `labels.ts`.
- If a component is reused by detail routes, export it from here and re-import in nested segments to maintain a single source of truth.

## Build, Test, and Development Commands
- Use `npm run dev` to validate pagination, sorting, and responsive layouts while editing.
- Run `npm run lint` prior to commits and `npm run build` before merging structural changes that affect suspense boundaries.
- Launch `npm run all` when verifying interactions that depend on Convex or the Python TCG service (price lookups, set sync).

## Coding Style & Naming Conventions
- Keep filenames descriptive (`collection-table.tsx`, `collection-empty-state.tsx`) and favor named exports for composable pieces.
- Tailwind utility ordering remains layout → spacing → typography → color → state; move repeated class lists to helpers rather than copying strings.
- Group query helpers (`getCollections`, `getCollectionStats`) in a single module and type results with Zod schemas located in `@/lib`.
- Document tricky derived values (e.g., completion percentages) in concise comments for future maintainers.

## Testing Guidelines
- Add table interaction tests covering sorting, filtering, and selection; use React Testing Library with mocked Convex responses.
- Cover data transformers with unit tests to ensure totals, rarities, and prices remain accurate.
- When editing suspense or loading states, include regression tests verifying skeleton presence while data fetches.

## Commit & Pull Request Guidelines
- Note the affected collection view in commit subjects, e.g., `fix(collections): align price column formatting`.
- Provide screenshots at desktop and mobile breakpoints plus details on any new Convex functions or migrations.
- Highlight environment variable requirements when introducing new integrations tied to collection sync.
