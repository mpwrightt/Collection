# Repository Guidelines

## Project Structure & Module Organization
- `tests/` houses pytest suites for the SDK and FastAPI service; organize modules to mirror the package layout (`test_endpoints_catalog.py`, `test_service_health.py`).
- Store fixtures in `conftest.py` or a `fixtures/` subfolder for reuse across modules.
- Keep sample payloads in JSON/py files near the tests that consume them to ensure clarity.
- Separate unit and integration suites using naming or folder conventions (`integration/`), allowing selective runs.

## Build, Test, and Development Commands
- Activate `.venv` and install dev dependencies via `make install-dev` before running tests.
- Execute `make test` for the default pytest run or `make test-cov` to capture coverage reports.
- Use `pytest tests/path::test_name -k keyword` during development for focused iterations.
- Combine with `make lint` and `make type-check` to keep the pipeline green before pushing changes.

## Coding Style & Naming Conventions
- Name tests descriptively (`test_get_product_returns_200`) and use arrange-act-assert structure with blank lines between phases.
- Prefer pytest fixtures over global state; mark asynchronous tests with `pytest.mark.asyncio`.
- When mocking HTTP calls, centralize URL constants to ensure parity with client modules.
- Keep assertions specific, leveraging `pytest.raises` context managers for error paths.

## Testing Guidelines
- Cover success and failure scenarios for each endpoint, mocking third-party APIs with `responses` or `httpx_mock`.
- For FastAPI routes, use `TestClient` and fixture data to validate status codes, payload schemas, and authentication requirements.
- Maintain regression tests for caching, rate limiting, or pagination utilities to catch subtle bugs.

## Commit & Pull Request Guidelines
- Indicate test scope in commits, e.g., `test: add pricing endpoint fixtures` or `test: harden service auth cases`.
- Include test run output (command + summary) in PR descriptions for reviewer confidence.
- Document new fixtures or environment dependencies so teammates can reproduce results locally.
