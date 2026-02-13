# Smash Bros Match Logger

A full-stack web app for tracking Super Smash Bros Ultimate matches between two players (Shayne vs Matt). Built with a Flask backend and React (Vite) frontend, using CSV-based storage with session grouping and rich analytics.

## Features

- **Match logging**: Character selection (dropdowns), winner selection, optional stocks remaining, stage selection
- **Session tracking**: Games grouped into sessions (4+ hour gap starts a new session)
- **Statistics dashboard**: Win rates, streaks, monthly activity, top matchups, head-to-head breakdown
- **Per-player stats**: Win rate timelines, performance heatmaps (day/hour), character and stage stats, tearsheets
- **Character analytics**: Per-character win rates, matchup performance, stage performance, usage overview
- **Session history**: Browse sessions, session detail views, session comparison
- **Local CSV storage**: Timestamped entries with automatic session backups
- **Dark UI**: Gruvbox-inspired theme

## Setup

1. Clone the repository:

```bash
git clone https://github.com/0xHarrington/ssbu-match-logging.git
cd ssbu-match-logging
```

2. Set up the backend:

```bash
# Create and activate virtual environment
python3 -m venv backend/venv
source backend/venv/bin/activate  # On Windows: backend\venv\Scripts\activate

# Install dependencies (from project root)
pip install -r backend/requirements.txt
```

3. Set up the frontend:

```bash
cd frontend
npm install
cd ..
```

4. Run the application:

Easiest option—run both servers with the script (requires `nvm` for Node):

```bash
./dev.sh
```

This starts:

- Backend at http://127.0.0.1:5000  
- Frontend at http://localhost:5173  

Or run them separately:

**Backend** (must run from `backend/` so CSV and config paths resolve):

```bash
source backend/venv/bin/activate
cd backend
python3 app.py
```

**Frontend** (from project root):

```bash
cd frontend
npm run dev
```

## Data Format

Match data is stored in `backend/game_results.csv` with columns:

- **datetime**: Match timestamp
- **shayne_character** / **matt_character**: Characters used
- **winner**: "Shayne" or "Matt"
- **stocks_remaining**: Winner’s stocks left (optional)
- **stage**: Stage name (or "No Stage")
- **timestamp**: Unix timestamp
- **session_id**: Session identifier (derived from time gaps)

## Development Notes

- `backend/venv` is in `.gitignore`; activate it before running or developing the backend.
- After adding Python dependencies: `pip freeze > requirements.txt` and ensure `backend/requirements.txt` is updated (or run from `backend/` and use `pip freeze > requirements.txt` there).
- Deactivate the venv when done: `deactivate`.

## Contributing

Issues and pull requests are welcome. Possible extensions:

- Export (e.g. CSV/JSON)
- Support for more than two players
- Additional visualizations or filters

## License

MIT License — use and modify as you like.
