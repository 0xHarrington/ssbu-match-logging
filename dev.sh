#!/bin/bash

# Start Flask backend
python3 app.py &
BACKEND_PID=$!

echo "Started backend (PID $BACKEND_PID) on http://127.0.0.1:5000"

# Start React frontend (Vite)
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Started frontend (PID $FRONTEND_PID) on http://localhost:5173"

echo "Both servers are running. Press Ctrl+C to stop."

# Wait for both to exit
wait $BACKEND_PID $FRONTEND_PID 