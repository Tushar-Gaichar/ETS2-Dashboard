# ETS2 Dashboard - Local Setup Guide

## Prerequisites
- Node.js (LTS version) from https://nodejs.org
- Visual Studio Code (optional but recommended)
- Funbit ETS2 Telemetry Server running on your PC

## Quick Setup

### 1. Download and Extract
1. Download the project ZIP from Replit
2. Extract to a folder (e.g., `C:\ETS2-Dashboard`)

### 2. Install Dependencies
```bash
cd ETS2-Dashboard
npm install
```

### 3. Start the Application

**For Windows users, use one of these methods:**

**Method 1 (Recommended): Double-click start.bat**
- Just double-click the `start.bat` file in your project folder

**Method 2: Manual commands in VS Code terminal**
```cmd
set NODE_ENV=development
npx tsx server/index.ts
```

**Method 3: PowerShell in VS Code**
```powershell
$env:NODE_ENV="development"
npx tsx server/index.ts
```

### 4. Access the Dashboard
- **Local PC**: http://localhost:5000
- **Mobile/Other devices**: http://YOUR-PC-IP:5000

### 5. Configure Connection
1. In the dashboard, click the connection button
2. Enter server address: `localhost:25555`
3. Make sure ETS2 telemetry server is running
4. Start ETS2 and begin driving

## Troubleshooting

### Dashboard Won't Start (localhost:5000 not reachable)
1. **Check terminal for errors** - Look for error messages when starting
2. **Port already in use** - If port 5000 is busy, try:
   ```cmd
   netstat -ano | findstr :5000
   ```
   Then kill the process or use a different port
3. **Missing dependencies** - Run `npm install` again
4. **Node.js version** - Ensure you have Node.js 18+ installed

### Server Startup Errors
- **"NODE_ENV not recognized"** - Use the Windows commands above instead of `npm run dev`
- **"tsx not found"** - Run `npm install` to install dependencies
- **Port permission issues** - Try running as administrator

### Can't Connect to Telemetry Server
1. Ensure Funbit ETS2 Telemetry Server is running
2. Check that ETS2 is running and you're driving  
3. Verify the server shows "Connected to the simulator (ETS2)"
4. Use `localhost:25555` as the connection address

### Mobile Access Issues
1. Ensure both devices are on the same WiFi network
2. Check Windows Firewall allows connections on port 5000
3. Use your PC's actual IP address, not localhost

## Network Configuration

### Find Your PC's IP Address
```cmd
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter.

### Windows Firewall
If mobile devices can't connect:
1. Windows Security → Firewall & network protection
2. Allow an app through firewall
3. Add Node.js or allow port 5000

## File Structure
```
ETS2-Dashboard/
├── client/           # React frontend
├── server/           # Express backend
├── shared/           # Common types and schemas
├── package.json      # Dependencies and scripts
└── README.md         # Project information
```
