@echo off
echo Starting ETS2 Dashboard (Simple Version)
echo ==========================================
echo.

echo Setting up environment...
set NODE_ENV=development

echo.
echo Installing dependencies (if needed)...
if not exist "node_modules" (
    echo Installing packages...
    npm install
    echo.
)

echo Starting server...
echo.
echo The dashboard will be available at: http://localhost:5000
echo.
echo Keep this window open while using the dashboard!
echo Press Ctrl+C to stop the server.
echo.

npx tsx server/index.ts

pause