# Windows Setup Instructions

## Quick Start

1. **Download and extract** the project to a folder like `C:\ETS2-Dashboard`

2. **Open Command Prompt or PowerShell** in the project folder:
   - Hold Shift + Right-click in the folder
   - Select "Open PowerShell window here" or "Open command window here"

3. **Run the debug startup script**:
   ```
   debug-start.bat
   ```

4. **Wait for the server to start** - you should see:
   ```
   [time] [express] serving on port 5000
   ```

5. **Open your browser** to `http://localhost:5000`

## Alternative Manual Method

If the batch file doesn't work, try these commands manually:

```cmd
npm install
set NODE_ENV=development
npx tsx server/index.ts
```

## Common Issues

### "Node.js not found"
- Install Node.js from https://nodejs.org
- Choose the LTS version
- Restart your command prompt after installation

### "package.json not found"
- Make sure you're in the correct folder
- The folder should contain package.json, server/, client/, etc.

### "Port already in use"
- Close other applications using port 5000
- Or change the port in the code

### Batch file closes immediately
- The debug-start.bat file will stay open and show errors
- Read the error messages to understand what went wrong

## Success Indicators

When working correctly, you should see:
1. Dependencies install successfully
2. Server starts with "serving on port 5000"
3. Browser opens to a working dashboard
4. You can connect to your ETS2 telemetry server

## Next Steps

Once the dashboard is running:
1. Make sure your Funbit ETS2 telemetry server is running
2. Start ETS2 and begin driving
3. In the dashboard, click connect and enter `localhost:25555`
4. You should see live telemetry data