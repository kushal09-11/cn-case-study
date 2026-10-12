#!/bin/bash
# Bash Startup Script for Wi-Fi Congestion & QoS Simulation Project

echo "=========================================================="
echo "  Starting Wi-Fi Congestion & QoS Simulation Platform     "
echo "=========================================================="

# 1. Start Backend in background
echo "[1/2] Starting Python FastAPI Backend on http://localhost:8000..."
cd backend
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!
cd ..

sleep 2

# 2. Start Frontend
echo "[2/2] Starting React Vite Frontend on http://localhost:5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "=========================================================="
echo " Services running in background!"
echo " Frontend: http://localhost:5173"
echo " Backend:  http://localhost:8000"
echo " API Docs: http://localhost:8000/docs"
echo " Press Ctrl+C to terminate both servers."
echo "=========================================================="

trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM
wait
