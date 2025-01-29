# Smash Bros Match Logger

A minimalist full-stack web application for tracking Super Smash Bros matches between two players. Built with Flask and vanilla JavaScript, using a simple CSV-based storage system.

## Features

- Quick character selection via dropdowns for both players
- Single-click winner selection
- Optional tracking of remaining stocks for the winner
- Local CSV storage with timestamped entries
- Clean, dark-mode interface inspired by the Gruvbox color scheme

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/yourusername/smash-match-logger.git
cd smash-match-logger
```

2. Install dependencies:

```bash
pip install flask
```

3. Run the application:

```bash
python app.py
```

4. Open your browser and navigate to `http://localhost:5000`

## Data Format

The application stores match data in `game_results.csv` with the following columns:

- datetime: Timestamp of the match
- shayne_character: Character selected by Shayne
- matt_character: Character selected by Matt
- winner: Who won the match
- stocks_remaining: How many stocks the winner had left (optional)

## Contributing

Feel free to open issues or submit pull requests. Some ideas for future improvements:

- Match history visualization
- Statistics dashboard
- Character win rate tracking
- Export functionality
- Support for more than two players

## License

MIT License - feel free to use and modify as needed.
