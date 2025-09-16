# Repository Guidelines

## Project Structure & Module Organization
- This dynamic segment renders a single collection; keep slug-aware helpers (`generateStaticParams`, metadata) alongside `page.tsx`.
- Separate data loaders, presentation components, and action handlers into individual files to avoid monolithic detail pages.
- Shared UI with the overview (stats cards, price chips) should import from `app/dashboard/collections` to maintain parity.
- Store collection-specific constants (section names, tab keys) in local modules to simplify refactors.

## Build, Test, and Development Commands
- Run `npm run dev` and navigate with multiple sample IDs to validate fallback, loading, and error boundaries.
- Execute `npm run lint` before commits to confirm type safety and ensure dynamic route params are correctly typed.
- For changes requiring fresh Convex data or Python service enrichment, use `npm run all` to recreate the complete stack locally.

## Coding Style & Naming Conventions
- Use descriptive filenames (`collection-summary.tsx`, `cards-grid.tsx`, `quantity-editor.tsx`) and keep default exports minimal.
- Encode server actions in dedicated files named `actions.ts` or `mutations.ts`; import them into client wrappers via `useTransition` when needed.
- Maintain Tailwind order layout → spacing → typography → color → state, and store repeated classnames in helper utilities.
- Include brief comments near complex data joins explaining the source Convex tables and relationships.

## Testing Guidelines
- Create integration tests that hydrate the page with mock Convex responses covering empty, partial, and completed collections.
- Verify mutation paths (add/remove cards, update notes) using React Testing Library plus mocked server actions.
- Add regression tests for slug parsing and ensure invalid IDs trigger the intended redirect or 404 component.

## Commit & Pull Request Guidelines
- Reference the collection detail view in commit messages, e.g., `feat(collection-detail): add set completion chart`.
- Supply recordings that demonstrate interactions like card edits or filter toggles, and outline any schema or security changes in the PR.
- Flag downstream effects on analytics or billing when altering collection states that impact gated content.
