# Standalone Mode Guide

## Overview
The ETS2 Dashboard frontend can run in **standalone mode** for demos or when the backend is unavailable. In standalone mode, the UI renders immediately with default telemetry values and does not attempt WebSocket or API connections.

## Environment Variable
- `VITE_STANDALONE=true` enables standalone mode.
- If unset or set to anything other than `"true"`, the app behaves normally (attempts to connect to the backend).

## What Changes in Standalone Mode

### WebSocket Hook (`useWebSocket`)
- **No WebSocket connection** is created.
- **No auto-connect** on mount.
- **No ping/pong** keep-alive.
- Returns **default telemetry state** matching the schema.
- Returns `isConnected: false`.
- `connect`, `disconnect`, and `sendMessage` become no-ops with console logs.

### Dashboard Page
- Shows a small yellow banner: *"Standalone mode – backend offline"*.
- Hides connection status UI (connect/disconnect buttons).
- Hides the connection prompt.
- Hides the connection modal.
- Skips `/api/user` fetch for layout persistence.

### Controls Page
- All control buttons show *"Standalone mode – controls disabled"* when clicked.
- Hides the "Load controls.sii" button and file input.
- No WebSocket messages are sent.

### Default Telemetry State
All telemetry fields are populated with safe defaults:
- Speed: 0 km/h
- Engine RPM: 800 / Max: 2200
- Fuel: 350 / Capacity: 700
- Gear: 0
- All booleans: `false`
- Strings: empty or sensible placeholders
- Timestamps: current ISO time or `null` where appropriate

## Running Modes

### Local Development (Backend)
```bash
# From root
npm run dev
# or
cd client && npm run dev
```
- `VITE_STANDALONE` is unset.
- Connects to WebSocket at `ws://localhost:5000/ws`.
- Fetches APIs from `http://localhost:5000/api/*`.

### Standalone (No Backend)
```bash
# From client directory
VITE_STANDALONE=true npm run build
VITE_STANDALONE=true npm run preview
# Or build once then serve static files
```
- `VITE_STANDALONE=true` is set at build time.
- No network requests to backend.
- UI renders immediately with defaults.

### Vercel Deployment
- In Vercel dashboard, set **Environment Variable**: `VITE_STANDALONE=true`.
- Build command: `npm run build` (run from `client/` directory).
- Output directory: `dist/`.
- No backend required.

## Implementation Notes

### Files Modified
- `client/src/hooks/use-websocket.tsx` – Added `IS_STANDALONE` guards and default telemetry.
- `client/src/pages/dashboard.tsx` – Added banner, hid connection UI, gated API fetch.
- `client/src/pages/controls.tsx` – Guarded command sending, passed `isStandalone` prop.
- `client/src/components/control-panel.tsx` – Added `isStandalone` prop, hid upload UI, disabled controls.
- `package.json` – Added `cross-env` for Windows compatibility (scripts).

### Build-Time Flag
`import.meta.env.VITE_STANDALONE` is injected by Vite at build time, so the standalone behavior is compiled into the bundle.

### Backward Compatibility
- Existing behavior is unchanged when `VITE_STANDALONE` is not set.
- All backend code remains intact; only frontend UI paths are gated.

## Testing Standalone Mode
```bash
cd client
VITE_STANDALONE=true npm run build
VITE_STANDALONE=true npm run preview
# Open http://localhost:4173
# You should see the dashboard with default values and a yellow banner.
```

## Future Enhancements
- Allow runtime toggle (e.g., URL param `?standalone=true`).
- Add a mock data generator that periodically updates telemetry.
- Add a configuration UI to adjust default values in standalone mode.
