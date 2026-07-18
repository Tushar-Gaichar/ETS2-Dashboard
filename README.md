# ETS2 Dashboard - Local Setup Guide

## Prerequisites
- Node.js (LTS version) from https://nodejs.org
- Visual Studio Code (optional but recommended)
- Funbit ETS2 Telemetry Server running on your PC
- [vJoy](http://vjoystick.sourceforge.net/) driver - **required**. Controls
  are sent exclusively through a virtual joystick device now (see "Controls
  Setup" below); there's no keyboard-injection fallback anymore, since it
  turned out to be too unreliable in practice (window focus issues,
  DirectInput games not consistently seeing injected key events).

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

> **Controls require vJoy** - see "Controls Setup" below before expecting
> the dashboard buttons to do anything in-game. There's no alternative
> input method to fall back to; vJoy needs to be installed and configured.

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
mechanism a physical button box uses. This is the only input method the
dashboard uses; it doesn't depend on the game window having focus, unlike
simulating keyboard presses (which is why that approach was dropped).

**One-time setup:**
1. Install the vJoy driver and open "Configure vJoy". Enable at least one
   device with **Number of Buttons** set to 38 or more (40 is a safe choice
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
| Light modes (off/parking/low beam - the one key ETS2 exposes for this) | 3 |
| High beam | 5 |
| Beacon | 6 |
| Horn (short) | 9 |
| Horn (long) | 10 |
| Cruise control | 11 |
| Differential lock | 13 |
| Lift axle | 14 |
| Trailer lift axle | 15 |
| Shift up | 16 |
| Shift down | 17 |
| Retarder increase | 19 |
| Retarder decrease | 20 |
| Left window up | 21 |
| Left window down | 22 |
| Right window up | 23 |
| Right window down | 24 |
| Front suspension raise | 25 |
| Front suspension lower | 26 |
| Rear suspension raise | 27 |
| Rear suspension lower | 28 |
| Suspension reset (resets both front and rear together) | 29 |
| Parking brake | 30 |
| Wipers (cycle) | 31 |
| Left turn signal | 32 |
| Right turn signal | 33 |
| Hazard lights | 34 |
| Trailer suspension raise | 35 |
| Trailer suspension lower | 36 |
| Trailer attach/detach | 37 |
| Engine brake | 38 |

Button numbers 4, 7, 8, 12, and 18 are intentionally unused - they belonged
to features that got removed (standalone low beam, front/roof aux lights,
a single toggle-style retarder, range splitter) because ETS2 doesn't
actually expose independent controls for them.

Defined in `server/services/vjoy.ts` (`defaultVjoyButtonMap`) if you want to
change the numbers.

**Relevant environment variables:**
- `ETS2_VJOY_DEVICE_ID` - which vJoy device number to use (falls back to
  `DEFAULT_VJOY_DEVICE_ID` in `server/services/vjoy.ts` if unset - currently `3`)
- `DISABLE_VJOY_VERSION_CHECK` - set to silence a harmless startup warning
  about the vJoy driver version if you're using the official vJoy build
  (the Node package targets a fork's SDK; the warning is cosmetic)

## Settings Page

### Control Bindings reference
Upload your `controls.sii` on the Settings page to see a read-only table of
which in-game action is bound to which button - useful for double-checking
your ETS2 binds actually line up with the vJoy button numbers above. This
only displays your bindings; it doesn't change anything.

> Note: the joystick-binding line format this parses hasn't been verified
> against a real `controls.sii` yet - keyboard-binding lines are confirmed
> working, but if your joystick bindings show up as a raw string instead of
> a clean "device · button" pair, that's expected fallback behavior, not a
> bug. The parsing lives in `server/services/controls.ts`.

### Mouse Steer with vJoy
Switching ETS2's input to keyboard+vJoy normally disables mouse steering
entirely - there's no in-game menu option to re-enable it. It can be
brought back by editing two values (`c_mousesteer` and `c_relatsteer`)
directly inside your profile's `controls.sii`. The dashboard can do this
edit for you, but **the whole workflow has to be followed in order**, or it
won't stick:

1. In ETS2, at the title screen, open your profile and **turn off Steam
   Cloud** for it. If you skip this, Steam Cloud can silently sync your old
   `controls.sii` right back over the edit the next time it syncs.
2. **Close ETS2 completely.**
3. Find that profile's `controls.sii` on disk (inside your ETS2 profile
   folder) and upload it on the Settings page, under "Mouse Steer with
   vJoy".
4. The dashboard edits the two values and gives you back a modified file -
   click **Download edited controls.sii**.
5. Replace the original `controls.sii` in that same profile folder with the
   downloaded one.
6. Start ETS2 back up.

The dashboard never touches this file on your disk directly - it only edits
whatever content you upload and hands back the result, so nothing happens
to your actual profile until you manually replace the file yourself in step 5.

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
1. **Check the server console.** Every failure throws a specific error
   (vJoy not enabled, device already in use, button not configured, etc.)
   instead of failing silently.
2. **vJoy driver not enabled** - open "Configure vJoy" and confirm it shows
   as enabled with a device configured.
3. **Device already acquired by something else** - only one application can
   hold a given vJoy device at a time. Close SimHub or any other tool using
   the same device number, or set `ETS2_VJOY_DEVICE_ID` to an unused one.
4. **Not enough buttons configured** - "Configure vJoy" → Number of Buttons
   needs to be at least 29 (see the mapping table above).
5. **Nothing happens but no error either** - the button press reached vJoy
   fine, but ETS2 isn't bound to it yet. Go to Options → Controls in-game and
   bind the action to the matching vJoy button number.

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