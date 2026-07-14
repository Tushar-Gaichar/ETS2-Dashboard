# ETS2 Dashboard - Local Setup Guide

## Prerequisites
- Node.js (LTS version) from https://nodejs.org
- Visual Studio Code (optional but recommended)
- Funbit ETS2 Telemetry Server running on your PC
- [vJoy](http://vjoystick.sourceforge.net/) driver (recommended - see
  "Controls Setup" below; the dashboard falls back to keyboard injection
  without it, which is less reliable)

## Quick Setup

### 1. Download and Extract
2. Extract to a folder (e.g., `C:\ETS2-Dashboard`)

### 2. Install Dependencies
```bash
cd ETS2-Dashboard
npm install
```

### 3. Start the Application

**For Windows users, use one of these methods:**

**Method 1 (Recommended): Double-click start.bat**
- Just double-click the `start-simple.bat` file in your project folder

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

> **Controls now use vJoy by default** - see "Controls Setup" below before
> expecting the dashboard buttons to do anything in-game. `ETS2_INPUT_METHOD`
> can be set to `sendinput` or `sendkeys` to fall back to keyboard injection
> instead, but vJoy is the recommended and most reliable method.

### 4. Access the Dashboard
- **Local PC**: http://localhost:5000
- **Mobile/Other devices**: http://YOUR-PC-IP:5000

### 5. Configure Connection
1. In the dashboard, click the connection button
2. Enter server address: `localhost:25555`
3. Make sure ETS2 telemetry server is running
4. Start ETS2 and begin driving

## Controls Setup (vJoy)

Dashboard buttons send commands to the server, which presses a **virtual
joystick button** via [vJoy](http://vjoystick.sourceforge.net/) - the same
mechanism a physical button box uses. This is far more reliable than
simulating keyboard presses, since it doesn't depend on the game window
having focus.

**One-time setup:**
1. Install the vJoy driver and open "Configure vJoy". Enable at least one
   device with **Number of Buttons** set to 18 or more (32 is a safe choice
   with room to grow).
2. In ETS2: **Options → Controls**, and bind each action below to the
   matching vJoy button number on your device, the same way you'd bind a
   physical joystick button.
3. Run `npm install` again if you haven't since adding vJoy support - it
   compiles a small native addon and needs the Windows Build Tools
   (`npm install --global windows-build-tools` if you don't have Visual
   Studio Build Tools already).

**Default button mapping:**

| Command | vJoy Button |
|---|---|
| Engine toggle | 1 |
| Electrical toggle | 2 |
| Parking lights | 3 |
| Low beam | 4 |
| High beam | 5 |
| Beacon | 6 |
| Aux front lights | 7 |
| Aux roof lights | 8 |
| Horn (short) | 9 |
| Horn (long) | 10 |
| Cruise control | 11 |
| Retarder | 12 |
| Differential lock | 13 |
| Lift axle | 14 |
| Trailer lift axle | 15 |
| Shift up | 16 |
| Shift down | 17 |
| Range splitter | 18 |

Defined in `server/services/vjoy.ts` (`defaultVjoyButtonMap`) if you want to
change the numbers.

**Relevant environment variables:**
- `ETS2_INPUT_METHOD` - `vjoy` (default), `sendinput`, or `sendkeys`
- `ETS2_VJOY_DEVICE_ID` - which vJoy device number to use (falls back to
  `DEFAULT_VJOY_DEVICE_ID` in `server/services/vjoy.ts` if unset - currently `3`)
- `DISABLE_VJOY_VERSION_CHECK` - set to silence a harmless startup warning
  about the vJoy driver version if you're using the official vJoy build
  (the Node package targets a fork's SDK; the warning is cosmetic)

> A setup helper that reads your `controls.sii` and writes matching vJoy
> bindings automatically is planned, but not built yet - for now, binding
> each action in ETS2's control settings is a manual one-time step.

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

### Dashboard Buttons Don't Do Anything In-Game

**If using vJoy (the default):**
1. **Check the server console.** Every failure now throws a specific error
   (vJoy not enabled, device already in use, button not configured, etc.)
   instead of failing silently.
2. **vJoy driver not enabled** - open "Configure vJoy" and confirm it shows
   as enabled with a device configured.
3. **Device already acquired by something else** - only one application can
   hold a given vJoy device at a time. Close SimHub or any other tool using
   the same device number, or set `ETS2_VJOY_DEVICE_ID` to an unused one.
4. **Not enough buttons configured** - "Configure vJoy" → Number of Buttons
   needs to be at least 18 (see the mapping table above).
5. **Nothing happens but no error either** - the button press reached vJoy
   fine, but ETS2 isn't bound to it yet. Go to Options → Controls in-game and
   bind the action to the matching vJoy button number.

**If using `ETS2_INPUT_METHOD=sendinput` or `sendkeys`:**
1. **Don't run ETS2 as Administrator** unless you also run this dashboard's
   server as Administrator. Windows blocks synthetic keyboard input from a
   non-elevated process to an elevated one (UIPI) - this fails silently,
   with no error in the console.
2. **Avoid exclusive fullscreen.** Use ETS2's "Fullscreen (windowed)" or
   plain windowed display mode in Options → Graphics.
3. **Window/process mismatch.** The server looks for the `eurotrucks2.exe`
   process by default, falling back to a window titled
   `Euro Truck Simulator 2`. Override with `ETS2_PROCESS_NAME` /
   `ETS2_WINDOW_TITLE` if needed.
4. **Check the server console** - it prints exactly which window/process was
   targeted (`[ets2-controls] Targeting window: ...`), so a wrong-window
   match is visible instead of silent.

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