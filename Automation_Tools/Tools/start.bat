@echo off
echo Starting Unified Data Tools...

REM Check if directories exist
if not exist unified-backend (
    echo Error: unified-backend directory not found
    exit /b
)

if not exist unified-app (
    echo Error: unified-app directory not found
    exit /b
)

REM Start the backend server
echo Starting backend server...
start cmd /k "cd unified-backend && python app.py"

REM Wait for the backend to start
timeout /t 2 /nobreak > nul

REM Start the frontend server
echo Starting frontend server...
start cmd /k "cd unified-app && ng serve --open"

echo Both servers are now running.
