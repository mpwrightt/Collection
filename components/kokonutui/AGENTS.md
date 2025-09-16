# Repository Guidelines

## Project Structure & Module Organization
- `kokonutui/` contains themed widgets and layout flourishes inspired by Kokonut UI. Keep each component in a dedicated file and provide a concise prop surface.
- Store shared gradients, icon sets, and typography tokens in local constants so they can evolve independently from other libraries.
- If a pattern becomes broadly useful, promote it to `components/ui` while preserving compatibility wrappers here.
- Include quick usage examples in comments to illustrate composition patterns for marketing and dashboard consumers.

## Build, Test, and Development Commands
- Use `npm run dev` when iterating to verify light/dark variants, responsive behavior, and animation smoothness.
- Run `npm run lint` to catch accessibility and TypeScript issues across these styled components.
- Execute `npm run build` after major updates to guarantee SSR compatibility and hydration stability.

## Coding Style & Naming Conventions
- Files and exports use PascalCase (`AuroraCard`, `GradientBorder`); internal helpers stay camelCase.
- Maintain Tailwind ordering layout → spacing → typography → color → state and centralize repeated combos in helper constants.
- Document optional props and default values directly above the component to assist future contributors.
- For motion-enhanced pieces, define Framer Motion variants at the top of the file and type them explicitly.

## Testing Guidelines
- Provide Storybook coverage or screenshot diffs for primary states to avoid regressions in visual polish.
- Use React Testing Library to ensure semantic elements (buttons, headings) expose correct roles and aria attributes.
- When components accept render props or child functions, add unit tests verifying they are invoked with expected arguments.

## Commit & Pull Request Guidelines
- Reference the Kokonut UI component touched, e.g., `feat(kokonutui): add aurora background block`.
- Attach design references or motion captures to PRs along with notes on theme token changes.
- Flag dependencies on new assets under `public/` so reviewers can confirm deployment paths.
