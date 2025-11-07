# Quick Start Guide - FinanceTrack

## Prerequisites

Make sure you have installed:
- Python 3.10+
- Node.js 18+
- PostgreSQL 12+

## Step-by-Step Setup

### 1. Database Setup

```bash
# Create the database
createdb financetrack

# Or using psql:
psql -U postgres
CREATE DATABASE financetrack;
\q
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies (if not already installed)
pip install -r requirements.txt

# Create .env file (if it doesn't exist)
# The file should contain:
# DATABASE_URL=postgresql://localhost:5432/financetrack
# SECRET_KEY=dev-secret-key-change-in-production
# OPENAI_API_KEY=your-key-here (optional)

# Start the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

### 3. Frontend Setup

Open a **new terminal window** and:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Start the frontend development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Running the Application

### Option 1: Run Both Servers Manually

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Option 2: Using Background Processes

**Backend:**
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
```

**Frontend:**
```bash
cd frontend
npm run dev &
```

### Option 3: Create a Startup Script

Create a file `start.sh` in the root directory:

```bash
#!/bin/bash

# Start backend
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &
BACKEND_PID=$!

# Start frontend
cd ../frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "Logs: backend.log and frontend.log"

# Wait for user interrupt
wait
```

Make it executable and run:
```bash
chmod +x start.sh
./start.sh
```

## Verify Everything is Running

1. **Check Backend:**
   ```bash
   curl http://localhost:8000/
   # Should return: {"message":"FinanceTrack API","status":"healthy"}
   ```

2. **Check Frontend:**
   ```bash
   curl http://localhost:3000/
   # Should return HTML content
   ```

3. **Open in Browser:**
   - Frontend: http://localhost:3000
   - Backend API Docs: http://localhost:8000/docs

## Stopping the Servers

### If running in foreground:
Press `Ctrl+C` in each terminal

### If running in background:
```bash
# Find and kill processes
lsof -ti:8000 | xargs kill -9  # Backend
lsof -ti:3000 | xargs kill -9  # Frontend
```

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `psql -l`
- Verify DATABASE_URL in `.env` file
- Check if port 8000 is already in use: `lsof -i:8000`

### Frontend won't start
- Check if port 3000 is already in use: `lsof -i:3000`
- Try deleting `node_modules` and reinstalling: `rm -rf node_modules && npm install`

### Database connection errors
- Ensure PostgreSQL is running
- Check database exists: `psql -l | grep financetrack`
- Verify DATABASE_URL format: `postgresql://user:password@localhost:5432/financetrack`

## Current Status

✅ Backend: http://localhost:8000 (running)
✅ Frontend: http://localhost:3000 (running)
✅ Database: financetrack (created)

## Next Steps

1. Open http://localhost:3000 in your browser
2. Register a new user account
3. Start uploading transactions!

