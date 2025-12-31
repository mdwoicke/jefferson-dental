@echo off
REM Windows batch script to start all telephony services

echo ========================================
echo   Jefferson Dental Telephony Startup
echo ========================================
echo.

REM Check if ngrok is installed
where ngrok >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: ngrok is not installed!
    echo Install it with: npm install -g ngrok
    echo Or download from: https://ngrok.com/download
    pause
    exit /b 1
)

REM Check if backend .env exists
if not exist backend\.env (
    echo ERROR: backend\.env not found!
    echo Please create backend\.env with your Twilio credentials.
    echo See backend\.env.example for template.
    pause
    exit /b 1
)

REM Check if backend dependencies are installed
if not exist backend\node_modules (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

REM Check if frontend dependencies are installed
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)

echo.
echo All checks passed!
echo.
echo Starting services in new windows...
echo.

REM Start ngrok in new window
start "ngrok" cmd /k "ngrok http 3001"
timeout /t 3 /nobreak >nul

echo ngrok started (check the ngrok window for URL)
echo.
echo IMPORTANT: Update backend\.env with the ngrok HTTPS URL
echo Example: BACKEND_HOST=https://abc123.ngrok.io
echo.
pause

REM Start backend in new window
start "Backend Server" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak >nul

REM Start frontend in new window
start "Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo All services started in separate windows!
echo ========================================
echo.
echo ngrok URL:     Check the ngrok window
echo Backend:       http://localhost:3001
echo Frontend:      http://localhost:3000
echo ngrok inspect: http://localhost:4040
echo.
echo Press any key to exit this window (services will keep running)
pause >nul
