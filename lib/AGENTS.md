# Repository Guidelines

## Project Structure & Module Organization
- `lib/` hosts shared utilities, adapters, and domain helpers consumed across the app, Convex functions, and Python service.
- Group files by concern (e.g., `auth`, `collections`, `tcg`) and avoid large catch-all modules; export focused functions and types.
- Keep environment-aware logic (Convex client factories, analytics adapters) isolated so they can be mocked easily in tests.
- Provide index files when exposing multiple helpers from a folder, but maintain explicit exports to preserve tree-shaking.

## Build, Test, and Development Commands
- Run `npm run lint` after editing to ensure TypeScript types and ESLint rules pass for shared utilities.
- For functions bridging Convex or external APIs, execute `npm run all` or targeted integration tests to confirm runtime behavior.
- Use `npm run build` before merging foundational changes to verify there are no bundler regressions.

## Coding Style & Naming Conventions
- Use `camelCase` for functions, `PascalCase` for classes or types, and prefer named exports over defaults.
- Document tricky transforms or data contracts with succinct comments and align naming with the underlying Convex or REST resources.
- Keep TypeScript types near their usage; export them for wider consumption using suffixes like `Props`, `Params`, or `Response`.
- Avoid introducing React-specific imports here—keep this folder framework-agnostic unless a file explicitly targets the frontend.

## Testing Guidelines
- Write unit tests for data manipulation and validation logic; store them alongside the source (`file.test.ts`) or in a nearby `__tests__` directory.
- Mock external services using lightweight fixtures and ensure edge cases (null data, API errors) are covered.
- When functions influence pricing or billing, add regression tests that assert numeric accuracy and rounding rules.

## Commit & Pull Request Guidelines
- Mention the utility or domain touched, e.g., `refactor(lib/collections): streamline progress calculation`.
- Provide examples of before/after usage in the PR description to help reviewers apply the change mentally.
- Highlight any new dependencies, environment keys, or performance considerations introduced by the helper.
