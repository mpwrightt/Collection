# Repository Guidelines

## Project Structure & Module Organization
- `react-bits/` hosts animation and interaction snippets sourced from the React Bits library; keep each effect in its own file and expose simple props.
- Link to original inspiration notes in comments to preserve attribution and design intent.
- If you adapt a snippet to multiple contexts, extract shared logic into `@/lib/animation` and import across components.
- Maintain clear separation between presentation and control hooks—keep heavy state in a sibling hook file when necessary.

## Build, Test, and Development Commands
- Run `npm run dev` to preview transitions and validate they integrate cleanly in consumer routes.
- Execute `npm run lint` and fix flagged side-effects, ensuring hooks follow the Rules of Hooks.
- When altering bundler configuration or dynamic imports, run `npm run build` to verify SSR compatibility.

## Coding Style & Naming Conventions
- Use PascalCase for component exports and camelCase for helper utilities; file names should mirror the exported component.
- Tailwind order remains layout → spacing → typography → color → state. For repeated combos, extract `const baseClass` constants.
- Place Framer Motion variant definitions above the component function and keep them strongly typed.
- Document any dependency on requestAnimationFrame or browser-only APIs in a comment near the usage.

## Testing Guidelines
- Provide lightweight tests that confirm required props render and optional callbacks fire; use fake timers for time-based sequences.
- Rely on Storybook visual checks or Percy snapshots to detect regressions in animation-heavy components.
- When hooks manage DOM observers, include unit tests that assert cleanup occurs on unmount.

## Commit & Pull Request Guidelines
- Name commits after the component, e.g., `refactor(react-bits): simplify magic spring carousel`.
- Share videos demonstrating the before/after animation behavior and call out performance trade-offs in the PR.
- Confirm licensing requirements if importing new snippets and include attribution links where required.
