# Repository Guidelines

## Project Structure & Module Organization
- `motion-primitives/` houses reusable animation building blocks (scroll spies, revealers, animated backgrounds); keep each primitive in its own file.
- Export a minimal API focused on composition: pass variant configs and children, letting consumers control content.
- Store shared easing curves, durations, and viewport thresholds in local constants to keep timing consistent.
- Document dependencies on IntersectionObserver, ResizeObserver, or other browser APIs near their usage.

## Build, Test, and Development Commands
- Run `npm run dev` to validate animations and ensure primitives integrate with server components when required.
- Use `npm run lint` to catch hook misuse and ensure optional dependencies are imported lazily when needed.
- After adjusting bundler-friendly entry points, run `npm run build` to confirm tree-shaking and SSR compatibility.

## Coding Style & Naming Conventions
- Employ PascalCase filenames (`ScrollReveal`, `ParallaxContainer`) and keep helper utilities camelCase.
- Tailwind classes follow layout → spacing → typography → color → state; for dynamic class composition rely on `cn` helpers defined in `@/lib/utils`.
- Store TypeScript types next to the primitive and expose them publicly when consumers extend variants.
- Provide inline comments outlining how the primitive should be configured and any pitfalls (e.g., parent overflow requirements).

## Testing Guidelines
- Create targeted tests verifying default props, animation triggers, and cleanup behavior using React Testing Library with fake timers.
- Support visual regression tooling to capture expected states, especially when primitives influence layout.
- When observers are involved, mock them in tests and assert initialization/teardown to avoid memory leaks.

## Commit & Pull Request Guidelines
- Commit subjects should mention the primitive, e.g., `feat(motion-primitives): add scroll parallax helper`.
- Include demo videos or CodeSandbox links that show the primitive in action and provide guidance on performance considerations.
- Highlight any additional polyfills or environment requirements in the PR body so integrators can prepare deployments.
