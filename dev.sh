#!/usr/bin/env bash
set -euo pipefail

# Preflight: backend venv must exist
[ -f backend/venv/bin/activate ] || {
    echo "Backend venv not found. Create it first:"
    echo "  python3 -m venv backend/venv"
    echo "  backend/venv/bin/pip install -r backend/requirements.txt"
    exit 1
}

# Start Flask backend (must run from backend/ so game_results.csv and
# characters.json resolve)
source backend/venv/bin/activate
(cd backend && python3 app.py) &
BACKEND_PID=$!

echo "Started backend (PID $BACKEND_PID) on http://127.0.0.1:5000"

# Start React frontend (Vite)
cd frontend

# Prefer nvm's node when available; fall back to system node with a warning.
# nvm.sh touches unset vars, so relax -u while loading it.
set +u
if ! command -v nvm >/dev/null 2>&1; then
    # shellcheck disable=SC1090
    source "${NVM_DIR:-$HOME/.nvm}/nvm.sh" 2>/dev/null || true
fi
if command -v nvm >/dev/null 2>&1; then
    nvm use node
else
    command -v node >/dev/null 2>&1 || {
        echo "node not found: install Node.js (>=22) or nvm"
        exit 1
    }
    echo "Warning: nvm not found; using system node $(node --version)"
fi
set -u

# Install dependencies only when missing (npm install on every start is slow)
[ -d node_modules ] || npm install

# Start the frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Started frontend (PID $FRONTEND_PID) on http://localhost:5173"

echo "Both servers are running. Press Ctrl+C to stop."

# Wait for both to exit
wait $BACKEND_PID $FRONTEND_PID
