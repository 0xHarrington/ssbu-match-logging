from flask import Flask, render_template, request, jsonify
from datetime import datetime
import csv
import os

app = Flask(__name__)

# Ensure the CSV file exists with headers
def ensure_csv_exists():
    headers = ['datetime', 'shayne_character', 'matt_character', 'winner', 'stocks_remaining']
    if not os.path.exists('game_results.csv'):
        with open('game_results.csv', 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(headers)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/log_game', methods=['POST'])
def log_game():
    data = request.json
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    with open('game_results.csv', 'a', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            timestamp,
            data['shayneCharacter'],
            data['mattCharacter'],
            data['winner'],
            data['stocksRemaining'] or ''
        ])
    
    return jsonify({"status": "success"})

if __name__ == '__main__':
    ensure_csv_exists()
    app.run(debug=True)