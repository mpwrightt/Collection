# Repository Guidelines

## Project Structure & Module Organization
- `public/` hosts static assets (images, fonts, favicons) served directly by Next.js; organize assets into subfolders by feature or media type.
- Keep filenames descriptive (`dashboard-empty-state.png`, `pricing-bg.svg`) and avoid spaces for easier referencing.
- Document asset ownership in a README or comment when usage spans multiple features.
- For multi-format assets (webp/png), store them together and note preferred fallback behavior.

## Build, Test, and Development Commands
- No build steps run within this folder, but updates impact `next build`; run it before merging to confirm bundler paths remain correct.
- Use `npm run dev` to verify assets render and load with expected dimensions and alt text.
- When adding large files, evaluate compression and ensure Git LFS or CDN flows are not required.

## Coding Style & Naming Conventions
- Maintain kebab-case file names and include resolution hints (`@2x`, `mobile`) when storing multiple variants.
- Provide accessible alt text references in consuming components; store canonical copy in `docs/` if reused.
- Place manifest or metadata files (e.g., `site.webmanifest`) at the root and update them alongside favicon refreshes.
- Track license or attribution details in a local `ATTRIBUTION.md` if assets demand it.

## Testing Guidelines
- Manually verify asset loading in the app, ensuring responsive images pick up the correct size and format.
- For icons and logos, use visual regression tests or screenshot comparisons when making design updates.
- Validate caching headers and CDN paths during staging reviews if static assets change significantly.

## Commit & Pull Request Guidelines
- Summaries should mention asset changes, e.g., `chore(public): update hero background art`.
- In PRs, describe the context, include preview screenshots, and call out any file size implications or compression steps.
- Confirm licensing or attribution updates accompany new third-party assets before merging.
