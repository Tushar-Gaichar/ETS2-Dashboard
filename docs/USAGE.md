# ETS2 Dashboard - Usage Guide

This guide explains how to run the dashboard, connect it to ETS2 telemetry, and use in‑game controls.

## Requirements
- Windows PC running Euro Truck Simulator 2
- Funbit ETS2 Telemetry Server running on the same PC as ETS2
  - Default API base: http://localhost:25555
  - Telemetry endpoint: http://localhost:25555/api/ets2/telemetry
- Node.js 18 or newer on the PC hosting this dashboard server

## Install and Run (Development)
```bash
npm install
npm run dev
```
Then open the printed local URL in your browser.

## Build and Run (Production)
```bash
npm run build
npm start
```
This builds the client with Vite and bundles the server with esbuild, then serves the production build.

## Connect to the ETS2 Telemetry Server
1. Click the "Connect" button in the header.
2. Enter the base URL for your Funbit ETS2 Telemetry Server, for example:
   - Same PC: `http://localhost:25555`
   - Over LAN (phone/tablet): `http://<your_pc_lan_ip>:25555`
3. Save. The dashboard will connect and start streaming telemetry data.

## Use the Controls Page
- Open the Controls page and press the buttons to trigger actions (engine, lights, horn, gears, etc.).
- The server injects key input to the ETS2 window on Windows.

### Load your keybinds from controls.sii (recommended)
1. Click "Load controls.sii" on the Controls page.
2. Select your `controls.sii` file, typically at:
   `C:\Users\<you>\Documents\Euro Truck Simulator 2\profiles\<profile_hash>\controls.sii`
3. The server parses your binds and updates its mappings automatically.

## Troubleshooting Input Injection
- If keys are not reaching ETS2, try the SendKeys fallback mode.
  - Set the environment variable and restart the server:
    - `ETS2_USE_SENDKEYS=1`
  - For testing, you can override the target window title (e.g., use Notepad):
    - `ETS2_WINDOW_TITLE="Untitled - Notepad"`

Environment variables:
- `ETS2_WINDOW_TITLE` — Override the window to send input to. Example: `ETS2_WINDOW_TITLE="Untitled - Notepad"`
- `ETS2_USE_SENDKEYS` — Set to `1` to use WScript SendKeys fallback instead of SendInput.

## Access from Mobile over Wi‑Fi
- Ensure your phone and PC are on the same network.
- On the phone browser, open: `http://<your_pc_lan_ip>:<dashboard_port>`
- Use the same telemetry base URL in the connection dialog (PC’s IP with port 25555).

## Notes
- The old "Add widget" builder has been removed from the dashboard page.
- Resizable panels and layout persistence for panel widths remain available.
