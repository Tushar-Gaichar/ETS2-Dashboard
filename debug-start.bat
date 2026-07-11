@echo off
title ETS2 Dashboard Debug Startup
echo ETS2 Dashboard Debug Startup
echo ===============================
echo.

echo Current directory:
cd
echo.

echo Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js from https://nodejs.org
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
echo Node.js found!
echo.

echo Checking npm...
npm --version
echo npm found!
echo.

echo Checking project files...
if not exist "package.json" (
    echo ERROR: package.json not found. Are you in the correct folder?
    echo Make sure you're running this from the ETS2-Dashboard folder.
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
echo package.json found!
echo.

echo Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies - this may take a few minutes...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
) else (
    echo Dependencies already installed!
)
echo.

echo Checking if port 5000 is available...
netstat -an | findstr :5000 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo WARNING: Port 5000 is already in use!
    echo You may need to close other applications using this port.
    echo.
)

echo Setting environment...
set NODE_ENV=development
echo Environment set to development
echo.

echo Starting the ETS2 Dashboard server...
echo.
echo ===========================================
echo   Dashboard will be available at:
echo   http://localhost:5000
echo.
echo   Keep this window open!
echo   Press Ctrl+C to stop the server
echo ===========================================
echo.

npx tsx server/index.ts

echo.
echo Server stopped.
echo Press any key to exit...
pause >nul