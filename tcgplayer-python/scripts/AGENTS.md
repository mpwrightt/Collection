# Repository Guidelines

## Project Structure & Module Organization
- `scripts/` holds automation helpers for release, maintenance, and data seeding tasks.
- Keep each script focused on a single workflow (e.g., `refresh_tokens.py`, `sync_products.py`) and document required arguments in module-level docstrings.
- Store shared utilities in `scripts/utils.py` or the root package to avoid duplicating logic.
- Include usage examples in comments so teammates can run scripts confidently.

## Build, Test, and Development Commands
- Activate the project virtualenv before running scripts (`source ../.venv/bin/activate`).
- Install dependencies via `make install-dev` to ensure CLI tools (click, typer) are available.
- When scripts modify external services, test against sandbox credentials first and document the environment in PRs.
- Add `make` targets for frequently used scripts to standardize invocation.

## Coding Style & Naming Conventions
- Use snake_case filenames and functions; adopt click/typer command groups for argument parsing when applicable.
- Place configuration constants at the top of the file and read sensitive values from environment variables.
- Include informative logging via `logging` module and set default log levels to `INFO` for clarity without noise.
- Document exit codes and error handling expectations near the main entry point.

## Testing Guidelines
- Add unit tests for reusable helpers in `tests/scripts` or inline with other suites.
- For scripts hitting external APIs, supply mock clients or use VCR fixtures to simulate responses.
- Perform dry-run or `--preview` modes where possible to allow safe verification without side effects.

## Commit & Pull Request Guidelines
- Commits should mention the script, e.g., `feat(scripts): add product sync CLI`.
- Provide command examples and environment prerequisites in the PR description, along with test evidence.
- Coordinate scheduling or cron changes with operations to prevent overlapping automation.
