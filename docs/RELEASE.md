# ETS2 Dashboard - Release Checklist

Use this checklist to prepare a clean build for shipping.

## 1) Clean install and build
```bash
npm ci
npm run build
```

## 2) Smoke test production build
```bash
npm start
```
Verify:
- Dashboard loads without the widgets builder UI
- Connection dialog works and telemetry streams
- Controls page sends commands. For a quick test:
  - `ETS2_WINDOW_TITLE="Untitled - Notepad"` (to target Notepad)
  - Toggle `ETS2_USE_SENDKEYS=1` if SendInput fails

## 3) Git hygiene and privacy
Add these to `.gitignore` (if not present) to avoid committing personal/runtime files:
- `.env`, `.env.*`, `.env.local`
- `*.log`, `npm-debug.log*`, `yarn-debug.log*`, `pnpm-debug.log*`
- `.vscode/`, `.idea/`, `Thumbs.db`, `desktop.ini`
- `.next/`, `out/`, `build/`, `.turbo/`, `.vercel/`, `coverage/`
- `server/data/` (runtime storage like `users.json` if created)

The app does not save `controls.sii` to disk or upload it externally; uploaded content is parsed in memory on your server.

## 4) Tag and ship
- Commit changes
- Tag a version (e.g., `v1.0.0`) and push
- Provide users the Usage Guide (docs/USAGE.md)
