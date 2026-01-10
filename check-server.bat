@echo off
echo Checking if server is running locally...
echo.

echo Checking what's using port 5000:
netstat -ano | findstr :5000
echo.

echo Testing connection to localhost:5000:
curl -s http://localhost:5000 > nul 2>&1
if %errorlevel% equ 0 (
    echo SUCCESS: Server is responding on localhost:5000
) else (
    echo FAILED: No server responding on localhost:5000
    echo.
    echo This means your local server is not running.
    echo Please start it using one of these methods:
    echo.
    echo Method 1: Double-click start.bat
    echo Method 2: In VS Code terminal run: npx tsx server/index.ts
)

pause