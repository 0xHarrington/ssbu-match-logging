# Smash Bros Match Logger

A minimalist full-stack web application for tracking Super Smash Bros matches between two players. Built with Flask backend and React frontend, using a simple CSV-based storage system.

## Features

- Quick character selection via dropdowns for both players
- Single-click winner selection
- Optional tracking of remaining stocks for the winner
- Local CSV storage with timestamped entries
- Clean, dark-mode interface inspired by the Gruvbox color scheme

## Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/smash-match-logger.git
cd smash-match-logger
```

2. Set up the backend:

```bash
# Create and activate virtual environment
python3 -m venv backend/venv
source backend/venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

3. Set up the frontend:

```bash
cd frontend

# Install Node.js dependencies
npm install
```

4. Run the application:

The easiest way to run both the frontend and backend is to use the provided script:

```bash
./dev.sh
```

This will start:

- Backend server on http://127.0.0.1:5000
- Frontend development server on http://localhost:5173

Alternatively, you can run them separately:

Backend:

```bash
source backend/venv/bin/activate
python3 app.py
```

Frontend:

```bash
cd frontend
npm run dev
```

## Data Format

The application stores match data in `game_results.csv` with the following columns:

- datetime: Timestamp of the match
- shayne_character: Character selected by Shayne
- matt_character: Character selected by Matt
- winner: Who won the match
- stocks_remaining: How many stocks the winner had left (optional)

## Development Notes

- The virtual environment (`backend/venv`) is included in `.gitignore`
- Always activate the virtual environment before running or developing the backend
- After installing new Python packages, update `requirements.txt`:

```bash
pip freeze > requirements.txt
```

- To deactivate the virtual environment when you're done:

```bash
deactivate
```

## Contributing

Feel free to open issues or submit pull requests. Some ideas for future improvements:

- Match history visualization
- Statistics dashboard
- Character win rate tracking
- Export functionality
- Support for more than two players

## License

MIT License - feel free to use and modify as needed.
