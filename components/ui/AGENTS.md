# Repository Guidelines

## Project Structure & Module Organization
- `ui/` collects foundational primitives (buttons, inputs, dialogs); keep each component in its own file with matching filename and export.
- When wrapping shadcn/radix parts, isolate the integration logic here and expose a clean API to higher-level components.
- Shared tokens (sizes, variants) should live in `@/lib/ui` or local constants modules for consistency.
- Keep example usage snippets in doc comments to illustrate recommended composition patterns.

## Build, Test, and Development Commands
- Use `npm run dev` and consume components from a scratch page or Storybook story to validate behavior.
- Run `npm run lint` to catch accessibility or TypeScript issues introduced by prop changes.
- Execute `npm run build` if you alter server/client boundaries to ensure components are compatible with server rendering.

## Coding Style & Naming Conventions
- Maintain PascalCase component names (e.g., `Dialog`, `FormField`); avoid default exports to encourage tree-shaking.
- Use Tailwind utility ordering layout → spacing → typography → color → state and group variant classnames in helpers like `class-variance-authority`.
- Document any controlled/uncontrolled expectations in TypeScript types and keep props objects typed explicitly.
- When extending third-party components, prefix internal helpers with `_` to signal private usage within the file.

## Testing Guidelines
- Provide React Testing Library tests for key primitives focusing on accessibility (focus order, ARIA attributes) and keyboard behavior.
- For variant logic, add snapshot tests or explicit asserts verifying className composition.
- Ensure interactive elements handle disabled states and propagate refs; include tests using `forwardRef` when relevant.

## Commit & Pull Request Guidelines
- Commits should call out the component and change type, e.g., `fix(components/ui/input): correct dark theme border`.
- Supply visual artifacts demonstrating states you touched and describe any migration steps for downstream usage.
- Mention new required props or breaking API shifts prominently in the PR description.
