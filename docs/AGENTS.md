# Repository Guidelines

## Project Structure & Module Organization
- `docs/` stores product copy, onboarding guides, and specs referenced by marketing and product teams.
- Organize Markdown files by topic with clear filenames (`billing.md`, `release-checklist.md`); group supporting assets in subfolders when necessary.
- Keep tables of contents at the top of larger documents and link to related guides inside the README or CLAUDE briefs.
- Maintain changelog notes or revision history within each doc when material informs external stakeholders.

## Build, Test, and Development Commands
- Documentation does not require build steps, but run `npm run lint` to ensure Markdown linting (if configured) passes for new files.
- Use preview tooling (VS Code Markdown preview or `npx marked`) to verify headings and code blocks render correctly.
- When docs inform backend changes, sync with the owning team before merging to prevent outdated instructions.

## Coding Style & Naming Conventions
- Follow Markdown best practices: level-one heading for titles, sentence case headings, and fenced code blocks with language tags (` ```bash `).
- Wrap environment variables and commands in backticks and keep paragraphs short (≤4 sentences) for readability.
- Reference repo paths relative to the root (`app/dashboard`) to stay consistent across guides.
- Link to external references with descriptive text instead of raw URLs.

## Testing Guidelines
- Peer review significant documentation updates to spot outdated references or missing steps.
- Validate setup instructions by walking through them in a fresh environment when possible.
- Keep screenshots or diagrams versioned and update alt text when visual assets change.

## Commit & Pull Request Guidelines
- Start commit summaries with `docs:` (e.g., `docs: detail tcg service setup`) to signal documentation changes.
- In PRs, list affected guides and summarize the audience (developers, support, marketing) so reviewers can loop in stakeholders.
- Mention dependencies on forthcoming code changes to coordinate release timing and avoid stale docs.
