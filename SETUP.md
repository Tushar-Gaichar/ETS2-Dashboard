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
```bash
npm run dev
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

### Port Already in Use
If port 5000 is busy, the app will use the next available port (5001, 5002, etc.)

### Can't Connect to Telemetry Server
1. Ensure Funbit ETS2 Telemetry Server is running
2. Check that ETS2 is running and you're driving
3. Verify the server shows "Connected to the simulator (ETS2)"

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