@echo off
echo Starting ETS2 Dashboard...
echo.
echo Make sure:
echo 1. Node.js is installed
echo 2. Funbit ETS2 Telemetry Server is running
echo 3. ETS2 is running and you're driving
echo.
pause

echo Installing dependencies...
npm install

echo.
echo Starting the dashboard...
echo Open your browser to: http://localhost:5000
echo For mobile access use: http://YOUR-PC-IP:5000
echo.
npm run dev