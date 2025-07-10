@echo off
echo ETS2 Dashboard Troubleshooting
echo ================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

echo Checking npm...
npm --version
echo.

echo Checking if port 5000 is in use...
netstat -ano | findstr :5000
if %errorlevel% equ 0 (
    echo WARNING: Port 5000 is already in use
    echo You may need to stop other applications using this port
)
echo.

echo Checking project dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
) else (
    echo Dependencies already installed
)
echo.

echo Attempting to start the server...
echo If this fails, check the error messages above
echo.
set NODE_ENV=development
npx tsx server/index.ts