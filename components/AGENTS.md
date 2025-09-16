# Repository Guidelines

## Project Structure & Module Organization
- This directory houses shared UI primitives for the app; group related elements into subfolders (`ui`, `magicui`, etc.) and export reused patterns from index files when appropriate.
- Keep components stateless when possible; lift data fetching into `app/` or hooks and pass explicit props.
- Store complex variants alongside the base component in files named after the surface (`data-table.tsx`, `chart-wrapper.tsx`).
- Document story usage or design references in leading comments so contributors know the origin of styled components.

## Build, Test, and Development Commands
- Run `npm run dev` to iterate with live reload and confirm consumer routes continue rendering.
- Execute `npm run lint` before committing; many components run as server components, so watch for client-only APIs.
- For motion-heavy work, consider `npm run build` to catch hydration warnings triggered by animation libraries.

## Coding Style & Naming Conventions
- Use PascalCase for component files and named exports; default exports are reserved for simple wrappers.
- Order Tailwind classes layout → spacing → typography → color → state; store repeated variants in `@/lib/utils` or local helper functions.
- Provide prop types via TypeScript interfaces located just above the component definition; use `React.FC` sparingly.
- Colocate stories or usage snippets in Markdown code fences to guide other contributors.

## Testing Guidelines
- Add React Testing Library suites for components with branching logic or accessibility requirements.
- Provide Storybook stories (when available) covering default, hover, focus, and disabled states for design review.
- For components with motion or timers, wrap tests in `act` blocks and use `jest.useFakeTimers()` as needed.

## Commit & Pull Request Guidelines
- Reference the component name in commit messages, e.g., `feat(components/ui/button): add destructive variant`.
- Include screenshots or GIFs demonstrating visual changes and note any breaking prop updates in the PR body.
- Coordinate with design when introducing new patterns; attach figma references or rationale before requesting review.
