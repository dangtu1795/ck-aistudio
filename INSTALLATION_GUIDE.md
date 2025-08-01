# Node.js 22 and PM2 Installation Scripts

This folder contains installation scripts to set up Node.js 22 and PM2 process manager on Windows 64-bit systems.

## 📁 Files Included

1. **`install-nodejs-pm2.bat`** - Simple batch file (double-click to run)
2. **`install-nodejs-pm2.ps1`** - PowerShell script (recommended)
3. **`install-nodejs-pm2.sh`** - Bash script for Git Bash
4. **`ecosystem.config.js`** - PM2 configuration file (created automatically)

## 🚀 Installation Methods

### Method 1: Batch File (Easiest)
1. **Right-click** on `install-nodejs-pm2.bat`
2. Select **"Run as administrator"**
3. Follow the on-screen instructions

### Method 2: PowerShell (Recommended)
1. **Right-click** on PowerShell and select **"Run as administrator"**
2. Navigate to the script directory:
   ```powershell
   cd "C:\path\to\your\nodejs-server"
   ```
3. Run the script:
   ```powershell
   .\install-nodejs-pm2.ps1
   ```

### Method 3: Git Bash
1. Open **Git Bash as administrator**
2. Navigate to the script directory:
   ```bash
   cd /c/path/to/your/nodejs-server
   ```
3. Make the script executable and run:
   ```bash
   chmod +x install-nodejs-pm2.sh
   ./install-nodejs-pm2.sh
   ```

## 📦 What Gets Installed

### Node.js 22
- Latest Node.js 22.x version
- npm package manager
- Added to system PATH

### PM2 Process Manager
- PM2 process manager
- PM2 Windows service (optional)
- PM2 ecosystem configuration file

## 🔧 PM2 Usage

After installation, you can use these commands:

### Basic Commands
```bash
# Start your application
pm2 start ecosystem.config.js

# Stop all applications
pm2 stop all

# Restart all applications
pm2 restart all

# List all applications
pm2 list

# Show logs
pm2 logs

# Monitor applications
pm2 monit
```

### Windows Service Commands
```cmd
# Start PM2 service
net start PM2

# Stop PM2 service
net stop PM2
```

## 📋 PM2 Ecosystem Configuration

The script creates an `ecosystem.config.js` file with the following configuration:

```javascript
module.exports = {
  apps: [{
    name: 'ai-studio-worker',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 6000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

## 🚀 Quick Start Guide

1. **Install Node.js and PM2** using one of the methods above
2. **Navigate** to your nodejs-server directory
3. **Start your application**:
   ```bash
   pm2 start ecosystem.config.js
   ```
4. **Check status**:
   ```bash
   pm2 list
   ```
5. **View logs**:
   ```bash
   pm2 logs
   ```

## 📁 Log Files

Logs are automatically saved to:
- `./logs/err.log` - Error logs
- `./logs/out.log` - Output logs  
- `./logs/combined.log` - Combined logs

## 🔧 Troubleshooting

### Script Execution Policy Error
If you get an execution policy error in PowerShell:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Permission Denied
Make sure to run the scripts as Administrator.

### Node.js Already Installed
The scripts will detect existing Node.js installations and ask if you want to upgrade.

### PM2 Service Issues
If PM2 service installation fails, you can still use PM2 manually without the service.

## 🆘 Support

If you encounter issues:

1. **Check Prerequisites**:
   - Windows 64-bit
   - Administrator privileges
   - Internet connection

2. **Manual Installation**:
   - Download Node.js from: https://nodejs.org/
   - Install PM2: `npm install -g pm2`

3. **Alternative Package Managers**:
   - Use Chocolatey: `choco install nodejs pm2`
   - Use Scoop: `scoop install nodejs` then `npm install -g pm2`

## 📝 Notes

- The scripts install Chocolatey package manager for easier dependency management
- PM2 Windows service allows your applications to start automatically on system boot
- All installations are system-wide and require Administrator privileges
- The scripts are designed for Windows 64-bit systems but may work on other architectures
