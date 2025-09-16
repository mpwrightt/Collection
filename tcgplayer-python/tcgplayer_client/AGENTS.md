# Repository Guidelines

## Project Structure & Module Organization
- `tcgplayer_client/` defines the Python SDK; keep models, endpoints, and utilities organized by API area (catalog, pricing, authentication).
- Core client functionality resides in `__init__.py` and `client.py`; extend endpoints within the `endpoints/` subpackage.
- Store shared data contracts in `models.py` or dedicated modules, and reuse them across endpoints to avoid drift.
- Use `__all__` exports sparingly—prefer explicit imports in consumers for clarity.

## Build, Test, and Development Commands
- From the repo root, activate the virtualenv (`source .venv/bin/activate`) and install dependencies via `make install` or `pip install -r requirements.txt`.
- Run `make test` to execute pytest suites covering this package; target functions with unit tests before adding integration coverage.
- Execute `make type-check` (MyPy) and `make lint` (Flake8) to ensure style and typing compliance.
- Use `make format` to apply Black/isort when adjusting modules.

## Coding Style & Naming Conventions
- Modules and functions use snake_case names; classes and enums adopt PascalCase.
- Represent API responses with Pydantic models or TypedDicts; annotate return types to keep MyPy accurate.
- Keep docstrings concise but include references to the official TCGplayer endpoints and required scopes.
- Centralize HTTP configuration (timeouts, retries) in utilities rather than duplicating constants across endpoints.

## Testing Guidelines
- Unit tests should mock HTTP requests using `responses` or `pytest-httpx`, asserting correct URLs, query params, and error handling.
- Validate model serialization/deserialization with sample payload fixtures kept in `tests/fixtures`.
- When adding caching or rate limiting, include regression tests covering edge conditions and concurrency scenarios.

## Commit & Pull Request Guidelines
- Commits should highlight the affected area, e.g., `feat(client): support group pricing search`.
- PR descriptions must summarize new endpoints, parameters, and breaking changes for downstream users.
- Include evidence of `make test`, `make type-check`, and `make lint` runs, plus note any docs updates required.
