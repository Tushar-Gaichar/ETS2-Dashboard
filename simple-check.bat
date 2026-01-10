@echo off
title ETS2 Dashboard Simple Check
color 0A
echo ===================================
echo   ETS2 Dashboard Simple Check
echo ===================================
echo.

echo Step 1: Checking Node.js...
node --version 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT installed
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org
    echo.
    echo Choose the LTS version and install with default settings.
    echo After installation, restart this script.
    goto end
) else (
    echo [OK] Node.js is installed
)

echo.
echo Step 2: Checking npm...
npm --version 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is NOT working
    echo.
    echo This usually means Node.js was not installed correctly.
    echo Please reinstall Node.js from https://nodejs.org
    goto end
) else (
    echo [OK] npm is working
)

echo.
echo Step 3: Checking current folder...
if not exist "package.json" (
    echo [ERROR] package.json not found
    echo.
    echo You are in the wrong folder!
    echo Current folder: %cd%
    echo.
    echo Please navigate to the ETS2-Dashboard folder first.
    goto end
) else (
    echo [OK] Found package.json
)

echo.
echo Step 4: Checking dependencies...
if not exist "node_modules" (
    echo [INFO] Dependencies not installed yet
    echo Installing now... this may take a few minutes
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        goto end
    )
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies already installed
)

echo.
echo Step 5: Starting server...
echo.
echo ========================================
echo   Server starting...
echo   Dashboard will be at: localhost:5000
echo   Keep this window open!
echo ========================================
echo.

set NODE_ENV=development
npx tsx server/index.ts

:end
echo.
echo ========================================
echo   Press any key to close...
echo ========================================
pause >nul