# Repository Guidelines

## Project Structure & Module Organization
- `service/` implements the FastAPI app consumed by Convex; keep routers grouped by domain (`inventory.py`, `pricing.py`) and register them in `app.py`.
- Shared dependencies (auth, clients, settings) live in `dependencies.py` or `config.py`; import them into routers as needed.
- Store response schemas in `schemas.py` using Pydantic models and reuse them between endpoints.
- Keep background tasks, schedulers, or startup hooks near `app.py` with concise docstrings detailing their purpose.

## Build, Test, and Development Commands
- Activate the virtualenv and install dev dependencies (`make install-dev`) before running the service locally.
- Start the API with `uvicorn service.app:app --reload --port 8787`; `npm run all` from the repo root handles this automatically during full-stack runs.
- Use `make lint`, `make type-check`, and `make test` routinely to ensure service health.
- For manual testing, hit `/health` and other endpoints with `httpie` or `curl` using test credentials.

## Coding Style & Naming Conventions
- Modules use snake_case filenames; routers adopt nouns (`pricing_router`), while dependency functions read like actions (`get_authorized_session`).
- Annotate request and response models explicitly and set response_model on FastAPI routes for strong typing.
- Store environment variable handling in a central settings object and avoid reading from `os.environ` throughout the codebase.
- Document authentication flows, token lifetimes, and external API dependencies in comments or module docstrings.

## Testing Guidelines
- Cover routers with pytest using FastAPI’s `TestClient`; assert status codes, payload shapes, and error responses.
- Mock TCGplayer HTTP calls via `responses` or `pytest-httpx` to keep tests deterministic.
- Add regression tests for auth refresh flows and rate-limiting logic to prevent production outages.

## Commit & Pull Request Guidelines
- Prefix commits with `service:` when touching this folder, e.g., `feat(service): expose product pricing endpoint`.
- Provide sample requests/responses and testing evidence in PR descriptions, noting any new environment variables or secrets.
- Coordinate deployment timing with frontend/backend teams to ensure Convex integrations consume the updated API immediately.
