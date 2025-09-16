#!/usr/bin/env bash
set -euo pipefail

# Project root
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# Load local environment if present (export all)
set +u
if [ -f .env ]; then
  set -a; source .env; set +a
fi
if [ -f .env.local ]; then
  set -a; source .env.local; set +a
fi
set -u

# Verify required env for Python TCG service
if [[ -z "${TCGPLAYER_CLIENT_ID:-}" || -z "${TCGPLAYER_CLIENT_SECRET:-}" ]]; then
  echo "[run_all] ERROR: Please set TCGPLAYER_CLIENT_ID and TCGPLAYER_CLIENT_SECRET in .env or environment."
  exit 1
fi

PY_DIR="$ROOT_DIR/tcgplayer-python"
VENV_DIR="$PY_DIR/.venv"

# Ensure Python venv and install deps
if [ ! -d "$VENV_DIR" ]; then
  echo "[run_all] Creating Python venv at $VENV_DIR"
  python3 -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"
python -m pip install -U pip wheel >/dev/null

# Install the Python client in editable mode + service deps
python -m pip install -e "$PY_DIR" >/dev/null
python -m pip install -r "$PY_DIR/service/requirements.txt" >/dev/null

echo "[run_all] Starting TCGplayer Python service on http://127.0.0.1:8787"
(
  cd "$PY_DIR"
  exec uvicorn service.app:app --host 127.0.0.1 --port 8787 --reload
) &
PY_PID=$!

# Wait for service to respond
ATTEMPTS=25
until curl -fsS "http://127.0.0.1:8787/health" >/dev/null 2>&1 || [ $ATTEMPTS -eq 0 ]; do
  echo "[run_all] Waiting for Python service... ($ATTEMPTS)"
  ATTEMPTS=$((ATTEMPTS-1))
  sleep 0.5
done

if ! curl -fsS "http://127.0.0.1:8787/health" >/dev/null 2>&1; then
  echo "[run_all] ERROR: Python service failed to start. Check logs above."
  kill $PY_PID || true
  exit 1
fi

echo "[run_all] Configuring Convex environment variables"
# Important: Convex runs in the cloud and cannot reach localhost (127.0.0.1).
# If you want Convex to call the Python service, expose it via a public tunnel
# and set TCGPY_PUBLIC_URL to that HTTPS URL before running this script.
if [[ -n "${TCGPY_PUBLIC_URL:-}" ]]; then
  echo "[run_all] Using public Python service URL: $TCGPY_PUBLIC_URL"
  npx convex env set TCGPY_SERVICE_URL "$TCGPY_PUBLIC_URL" >/dev/null
else
  echo "[run_all] No public Python service URL provided; removing TCGPY_SERVICE_URL so Convex uses direct TCG API"
  npx convex env rm TCGPY_SERVICE_URL >/dev/null || true
fi

# Provide TCGplayer credentials to Convex (server-side actions)
if [[ -n "${TCGPLAYER_CLIENT_ID:-}" ]]; then
  npx convex env set TCGPLAYER_CLIENT_ID "$TCGPLAYER_CLIENT_ID" >/dev/null || true
fi
if [[ -n "${TCGPLAYER_CLIENT_SECRET:-}" ]]; then
  npx convex env set TCGPLAYER_CLIENT_SECRET "$TCGPLAYER_CLIENT_SECRET" >/dev/null || true
fi
if [[ -n "${TCGPLAYER_API_VERSION:-}" ]]; then
  npx convex env set TCGPLAYER_API_VERSION "$TCGPLAYER_API_VERSION" >/dev/null || true
fi

# Optional Gemini settings (only set if present locally)
if [[ -n "${GOOGLE_API_KEY:-}" ]]; then
  npx convex env set GOOGLE_API_KEY "$GOOGLE_API_KEY" >/dev/null || true
fi
if [[ -n "${GEMINI_MODEL:-}" ]]; then
  npx convex env set GEMINI_MODEL "$GEMINI_MODEL" >/dev/null || true
fi

echo "[run_all] Installing Node dependencies (if needed)"
npm install >/dev/null

echo "[run_all] Starting Convex dev"
(
  exec npx convex dev
) &
CONVEX_PID=$!

# Small delay to let Convex attach
sleep 1

echo "[run_all] Starting Next.js dev server"
(
  exec npm run dev
) &
NEXT_PID=$!

# Cleanup on exit
cleanup() {
  echo "\n[run_all] Shutting down..."
  kill $NEXT_PID >/dev/null 2>&1 || true
  kill $CONVEX_PID >/dev/null 2>&1 || true
  kill $PY_PID >/dev/null 2>&1 || true
  wait $NEXT_PID $CONVEX_PID $PY_PID 2>/dev/null || true
}
trap cleanup INT TERM EXIT

# Wait for processes
wait $NEXT_PID $CONVEX_PID $PY_PID
