# Repository Guidelines

## Project Structure & Module Organization
- `endpoints/` contains modules grouped by TCGplayer API domain (catalog, pricing, inventory); each file should wrap related REST routes.
- Keep public functions thin: construct request payloads, call the shared HTTP client, and parse responses via shared models.
- Store endpoint-specific constants (paths, query parameters) at the top of the file for easy discovery.
- When logic grows complex, move helpers into adjacent `_utils.py` files to keep endpoints readable.

## Build, Test, and Development Commands
- Activate the virtualenv (`source ../.venv/bin/activate`) and install dependencies via `make install` at the repo root.
- Run `make test` to execute pytest; focus on covering new endpoints with request/response assertions.
- Execute `make lint` and `make type-check` to ensure code adheres to Flake8 and MyPy rules.
- Use `make format` after modifying modules to apply Black and isort automatically.

## Coding Style & Naming Conventions
- Module names align with API areas (`catalog.py`, `pricing.py`), functions use snake_case verbs (`get_product_details`).
- Accept explicit parameters instead of `**kwargs` to maintain strong typing; use Optional types sparingly.
- Document rate limits or pagination behavior in docstrings to guide consumers.
- Reuse shared error handling helpers instead of duplicating try/except blocks across modules.

## Testing Guidelines
- Write unit tests with `responses` or `pytest-httpx` that stub HTTP interactions and verify constructed URLs, headers, and payloads.
- Include negative tests covering HTTP failures and ensure exceptions propagate meaningful messages.
- When adding pagination helpers, test edge cases like empty pages and truncated results using fixtures.

## Commit & Pull Request Guidelines
- Reference the endpoint domain in commit messages, e.g., `feat(endpoints): add sealed product search`.
- Summarize new routes, parameters, and fallback behavior in the PR description and link to TCGplayer documentation where relevant.
- Provide evidence of passing lint, type check, and pytest runs for reviewer confidence.
