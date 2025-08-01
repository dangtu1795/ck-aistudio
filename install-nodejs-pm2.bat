@echo off
REM Node.js 22 and PM2 Installation Script for Windows 64-bit
REM This batch file will run the PowerShell script with Administrator privileges

echo 🚀 Node.js 22 and PM2 Installation Script for Windows 64-bit
echo ============================================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Running as Administrator
    goto :run_installation
) else (
    echo ⚠️  This script needs Administrator privileges
    echo    Requesting elevation...
    echo.
    
    REM Request Administrator privileges and run PowerShell script
    powershell -Command "Start-Process PowerShell -ArgumentList '-ExecutionPolicy Bypass -File ""%~dp0install-nodejs-pm2.ps1""' -Verb RunAs"
    goto :end
)

:run_installation
echo Running PowerShell installation script...
powershell -ExecutionPolicy Bypass -File "%~dp0install-nodejs-pm2.ps1"

:end
echo.
echo Installation script completed.
pause
