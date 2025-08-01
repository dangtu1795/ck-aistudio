# Node.js 22 and PM2 Installation Script for Windows 64-bit
# Run this in PowerShell as Administrator

Write-Host "🚀 Node.js 22 and PM2 Installation Script for Windows 64-bit" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

# Function to check if running as Administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check if running as Administrator
if (-not (Test-Administrator)) {
    Write-Host "❌ Error: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "   Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

# Function to install Chocolatey if not present
function Install-Chocolatey {
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Host "✅ Chocolatey is already installed" -ForegroundColor Green
        return
    }
    
    Write-Host "📦 Installing Chocolatey package manager..." -ForegroundColor Cyan
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Host "✅ Chocolatey installed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to install Chocolatey" -ForegroundColor Red
        exit 1
    }
}

# Function to install Node.js
function Install-NodeJS {
    Write-Host "📦 Installing Node.js 22..." -ForegroundColor Cyan
    
    # Check if Node.js is already installed
    $nodeVersion = $null
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $nodeVersion = node --version
        $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        
        if ($majorVersion -ge 22) {
            Write-Host "✅ Node.js $nodeVersion is already installed (>= v22)" -ForegroundColor Green
            return
        } else {
            Write-Host "⚠️  Node.js $nodeVersion found, upgrading to v22..." -ForegroundColor Yellow
        }
    }
    
    # Install Node.js using Chocolatey
    try {
        choco install nodejs --version=22.7.0 -y
        Write-Host "✅ Node.js 22 installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to install Node.js" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        exit 1
    }
}

# Function to install PM2
function Install-PM2 {
    Write-Host "📦 Installing PM2..." -ForegroundColor Cyan
    
    # Check if PM2 is already installed
    if (Get-Command pm2 -ErrorAction SilentlyContinue) {
        $pm2Version = pm2 --version
        Write-Host "✅ PM2 v$pm2Version is already installed" -ForegroundColor Green
        return
    }
    
    try {
        npm install -g pm2
        Write-Host "✅ PM2 installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to install PM2" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        exit 1
    }
}

# Function to verify installations
function Test-Installations {
    Write-Host ""
    Write-Host "🔍 Verifying installations..." -ForegroundColor Cyan
    Write-Host "----------------------------" -ForegroundColor Cyan
    
    $success = $true
    
    # Check Node.js
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $nodeVersion = node --version
        Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "❌ Node.js: Not found" -ForegroundColor Red
        $success = $false
    }
    
    # Check npm
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        $npmVersion = npm --version
        Write-Host "✅ npm: v$npmVersion" -ForegroundColor Green
    } else {
        Write-Host "❌ npm: Not found" -ForegroundColor Red
        $success = $false
    }
    
    # Check PM2
    if (Get-Command pm2 -ErrorAction SilentlyContinue) {
        $pm2Version = pm2 --version
        Write-Host "✅ PM2: v$pm2Version" -ForegroundColor Green
    } else {
        Write-Host "❌ PM2: Not found" -ForegroundColor Red
        $success = $false
    }
    
    if ($success) {
        Write-Host ""
        Write-Host "🎉 All installations verified successfully!" -ForegroundColor Green
    }
    
    return $success
}

# Function to create PM2 ecosystem file
function New-EcosystemFile {
    Write-Host ""
    Write-Host "📝 Creating PM2 ecosystem file..." -ForegroundColor Cyan
    
    $ecosystemContent = @'
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
    env_development: {
      NODE_ENV: 'development',
      PORT: 6000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
'@
    
    # Create ecosystem file
    $ecosystemContent | Out-File -FilePath "ecosystem.config.js" -Encoding UTF8
    
    # Create logs directory
    if (!(Test-Path "logs")) {
        New-Item -ItemType Directory -Path "logs" | Out-Null
    }
    
    Write-Host "✅ PM2 ecosystem file created: ecosystem.config.js" -ForegroundColor Green
}

# Function to install PM2 Windows service
function Install-PM2Service {
    Write-Host ""
    Write-Host "🔧 Setting up PM2 as Windows service..." -ForegroundColor Cyan
    
    try {
        # Install pm2-windows-service
        npm install -g pm2-windows-service
        
        # Install PM2 service
        pm2-service-install -n "PM2"
        
        Write-Host "✅ PM2 Windows service installed" -ForegroundColor Green
        Write-Host "   Service name: PM2" -ForegroundColor Yellow
        Write-Host "   The service will start automatically on system boot" -ForegroundColor Yellow
    } catch {
        Write-Host "⚠️  Could not install PM2 as Windows service" -ForegroundColor Yellow
        Write-Host "   You can still use PM2 manually" -ForegroundColor Yellow
    }
}

# Function to show usage instructions
function Show-Usage {
    Write-Host ""
    Write-Host "📋 Usage Instructions:" -ForegroundColor Cyan
    Write-Host "=====================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔧 Basic PM2 Commands:" -ForegroundColor Yellow
    Write-Host "   pm2 start ecosystem.config.js    # Start your application" -ForegroundColor White
    Write-Host "   pm2 stop all                     # Stop all applications" -ForegroundColor White
    Write-Host "   pm2 restart all                  # Restart all applications" -ForegroundColor White
    Write-Host "   pm2 list                         # List all applications" -ForegroundColor White
    Write-Host "   pm2 logs                         # Show logs" -ForegroundColor White
    Write-Host "   pm2 monit                        # Monitor applications" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 To start your AI Studio Worker:" -ForegroundColor Yellow
    Write-Host "   cd C:\path\to\your\nodejs-server" -ForegroundColor White
    Write-Host "   pm2 start ecosystem.config.js" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 Windows Service Commands:" -ForegroundColor Yellow
    Write-Host "   net start PM2        # Start PM2 service" -ForegroundColor White
    Write-Host "   net stop PM2         # Stop PM2 service" -ForegroundColor White
    Write-Host ""
    Write-Host "📁 Logs are saved in: .\logs\" -ForegroundColor Yellow
    Write-Host ""
}

# Main installation process
function Main {
    try {
        # Install Chocolatey
        Install-Chocolatey
        
        # Reload PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        # Install Node.js
        Install-NodeJS
        
        # Reload PATH again after Node.js installation
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        # Install PM2
        Install-PM2
        
        # Verify installations
        if (Test-Installations) {
            # Create ecosystem file
            New-EcosystemFile
            
            # Install PM2 as Windows service
            Install-PM2Service
            
            # Show usage instructions
            Show-Usage
            
            Write-Host "🎉 Installation completed successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "⚠️  IMPORTANT: Please restart your terminal to ensure PATH changes take effect" -ForegroundColor Yellow
            Write-Host ""
        } else {
            Write-Host "❌ Installation failed. Please check the errors above." -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ Unexpected error occurred: $_" -ForegroundColor Red
        exit 1
    }
}

# Run main function
Main

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
