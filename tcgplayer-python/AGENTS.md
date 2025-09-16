# Repository Guidelines

## Project Structure & Module Organization
- `tcgplayer-python/` contains the Python SDK and FastAPI service supporting TCGplayer integrations.
- Core client code lives in `tcgplayer_client/`; keep endpoints under `tcgplayer_client/endpoints` and shared models near their consumers.
- The FastAPI app resides in `service/`; align REST routes with Convex expectations and document payload shapes in docstrings.
- Scripts and automation helpers sit under `scripts/`; use the Makefile to orchestrate CI-equivalent tasks.

## Build, Test, and Development Commands
- Create/activate a virtualenv (`python -m venv .venv && source .venv/bin/activate`) before installing dependencies.
- Run `make install` or `pip install -r requirements.txt` for runtime packages and `make install-dev` for lint/test extras.
- Execute `make test` for pytest, `make format` for Black, `make lint` for Flake8, `make type-check` for MyPy, and `make security` for Bandit/Safety.
- Use `uvicorn service.app:app --reload --port 8787` or `npm run all` from the repo root to start the FastAPI service locally.

## Coding Style & Naming Conventions
- Adhere to Black formatting (line length 88) and isort ordering; run `make format` before committing.
- Modules use snake_case filenames; classes are PascalCase and functions snake_case.
- Place Pydantic models alongside the endpoints that consume them and include docstrings describing field semantics.
- Keep secrets in environment variables; never hardcode credentials in source.

## Testing Guidelines
- Target ≥80% coverage on new modules; measure with `make test-cov`.
- Mock external HTTP calls (TCGplayer, Gemini) using fixtures or `responses` to keep tests deterministic.
- Add integration tests under `tests/service` when FastAPI routes evolve, ensuring request/response schemas stay stable.

## Commit & Pull Request Guidelines
- Prefix commits with the domain, e.g., `feat(python): add product search endpoint` or `fix(service): refresh token caching`.
- Summarize API contract changes in the PR description and link to any Convex or frontend dependencies.
- Include testing evidence (command outputs or coverage summaries) and note environment variable updates for reviewers.
