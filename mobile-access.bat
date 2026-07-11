@echo off
echo Finding your PC's IP address for mobile access...
echo.

echo Your PC's IP addresses:
ipconfig | findstr /i "IPv4"

echo.
echo =============================================
echo   Mobile Access Instructions
echo =============================================
echo.
echo 1. Make sure your PC and phone are on the same WiFi network
echo.
echo 2. On your phone's browser, go to one of these addresses:
echo    http://[YOUR-IP]:5000
echo.
echo 3. Replace [YOUR-IP] with one of the IPv4 addresses shown above
echo    (Usually starts with 192.168.x.x)
echo.
echo Example: If your IP is 192.168.1.100, use:
echo          http://192.168.1.100:5000
echo.
echo 4. In the dashboard, connect to: localhost:25555
echo    (The ETS2 server address stays as localhost)
echo.
echo =============================================
echo.

echo Checking Windows Firewall...
netsh advfirewall firewall show rule name="Node.js" >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Windows Firewall may block mobile access
    echo.
    echo To allow mobile access:
    echo 1. Open Windows Security
    echo 2. Go to Firewall ^& network protection
    echo 3. Click "Allow an app through firewall"
    echo 4. Add Node.js or allow port 5000
    echo.
) else (
    echo Firewall rule found for Node.js
)

pause