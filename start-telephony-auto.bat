@echo off
REM Windows batch script with automatic .env update

echo ========================================
echo   Jefferson Dental Telephony Startup
echo   (Auto-updating .env with ngrok URL)
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Download from: https://nodejs.org
    pause
    exit /b 1
)

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
    echo Run: copy backend\.env.example backend\.env
    echo Then add your Twilio credentials
    pause
    exit /b 1
)

echo Running smart startup script...
echo.
node scripts/start-with-ngrok.js

pause
