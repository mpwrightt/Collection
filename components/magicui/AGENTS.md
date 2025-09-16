# Repository Guidelines

## Project Structure & Module Organization
- `magicui/` contains higher-level marketing and motion-rich components; keep each feature (hero grids, spotlight cards, marquee) isolated per file.
- Extract reusable tokens (gradient definitions, icon maps) into shared constants to avoid scattering duplicate values.
- Export a single public API per component and document optional props directly above the implementation.
- When components depend on external assets, reference paths under `public/` using helper constants for maintainability.

## Build, Test, and Development Commands
- Run `npm run dev` to preview animations and ensure transitions remain smooth across device widths.
- Use `npm run lint` to surface accessibility flags and TypeScript issues introduced by effect-heavy components.
- Execute `npm run build` after significant animation refactors to catch hydration or server/client mismatches.

## Coding Style & Naming Conventions
- Name files after their design vignette (`spotlight-card.tsx`, `tilt-grid.tsx`) and keep exported components PascalCase.
- Organize Tailwind classes layout → spacing → typography → color → state; store repeated gradients in helper functions.
- For Framer Motion usage, define variants at the top of the file and keep them typed with `Variant` to encourage reuse.
- Document assumptions about viewport observers or intersection thresholds in concise comments near hook usage.

## Testing Guidelines
- Provide Storybook stories or visual regression coverage to capture animation states when adjusting design tokens.
- Use lightweight unit tests to ensure required props (titles, ctas) render and optional props apply defaults correctly.
- When motion logic relies on timers, wrap tests in `act` and use fake timers to avoid flakiness.

## Commit & Pull Request Guidelines
- Reference the Magic UI component changed, e.g., `feat(magicui): introduce spotlight marquee variant`.
- Attach recordings demonstrating motion across light/dark themes and note any performance considerations in the PR.
- Coordinate with design for large visual overhauls and include approval evidence before merging.
