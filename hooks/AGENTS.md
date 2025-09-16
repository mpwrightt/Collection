# Repository Guidelines

## Project Structure & Module Organization
- `hooks/` contains reusable React hooks shared across app routes and components; keep domain-specific logic grouped into separate files.
- Structure hooks by purpose (`useDeckFilters`, `useClipboard`, `useThemeSync`) and colocate supporting types or constants within the same file.
- Export hooks directly from the root of this directory to simplify imports using the `@/hooks` alias.
- Move heavy utilities or pure functions to `@/lib` and import them here to maintain separation between stateful hooks and stateless helpers.

## Build, Test, and Development Commands
- Run `npm run dev` to exercise hooks inside development pages or Storybook stories while iterating.
- Execute `npm run lint` to ensure ESLint’s hooks plugin catches dependency array mistakes and rule violations.
- Use `npm run test` (if configured) or targeted React Testing Library suites to confirm behavior before committing.

## Coding Style & Naming Conventions
- Hook filenames mirror their exported name (`useFooBar.ts`); keep file contents limited to a single exported hook plus small helpers.
- Document expected inputs/outputs in TypeScript types and include concise usage examples in comments when behavior is non-obvious.
- Avoid side effects during render; wrap asynchronous work inside `useEffect` or event handlers and guard for server/client boundaries.
- Order Tailwind classes inside hook-provided class strings using layout → spacing → typography → color → state when relevant.

## Testing Guidelines
- Add unit tests with React Testing Library’s `renderHook` to cover state transitions, error cases, and cleanup behavior.
- Mock external services (Convex, Clerk, browser APIs) to keep tests deterministic and fast.
- Validate that hooks clean up subscriptions or listeners in `useEffect` cleanup blocks to prevent memory leaks in production.

## Commit & Pull Request Guidelines
- Prefix commits with the hook name when practical, e.g., `feat(hooks): add useDeckFilters`.
- In PR descriptions, explain where the hook is consumed and note any new dependencies or environment assumptions.
- Provide reproduction steps or small demos if the hook addresses a race condition or intricate UX scenario.
