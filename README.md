# Smash Bros Match Logger

A minimalist full-stack web application for tracking Super Smash Bros matches between two players. Built with Flask and vanilla JavaScript, using a simple CSV-based storage system.

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

2. Create and activate a virtual environment:

On Windows:

```bash
python -m venv venv
venv\Scripts\activate
```

On macOS/Linux:

```bash
python3 -m venv venv
source venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

If you're setting up the project for the first time, create `requirements.txt`:

```bash
pip install flask
pip freeze > requirements.txt
```

4. Run the application:

```bash
python app.py
```

5. Open your browser and navigate to `http://localhost:5000`

## Data Format

The application stores match data in `game_results.csv` with the following columns:

- datetime: Timestamp of the match
- shayne_character: Character selected by Shayne
- matt_character: Character selected by Matt
- winner: Who won the match
- stocks_remaining: How many stocks the winner had left (optional)

## Development Notes

- The virtual environment (`venv`) is included in `.gitignore`
- Always activate the virtual environment before running or developing the application
- After installing new packages, update `requirements.txt`:

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
