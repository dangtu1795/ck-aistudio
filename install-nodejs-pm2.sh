#!/bin/bash

# Node.js 22 and PM2 Installation Script for Git Bash (Windows 64-bit)
# This script installs Node.js 22 and PM2 process manager

echo "🚀 Node.js 22 and PM2 Installation Script for Windows 64-bit"
echo "============================================================"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to download and install Node.js
install_nodejs() {
    echo "📦 Installing Node.js 22..."
    
    # Define Node.js version and download URL
    NODE_VERSION="22.7.0"
    NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip"
    NODE_DIR="node-v${NODE_VERSION}-win-x64"
    INSTALL_DIR="/c/Program Files/nodejs"
    
    echo "   • Downloading Node.js v${NODE_VERSION}..."
    
    # Create temporary directory
    TEMP_DIR="/tmp/nodejs-install"
    mkdir -p "$TEMP_DIR"
    cd "$TEMP_DIR"
    
    # Download Node.js
    if command_exists curl; then
        curl -L "$NODE_URL" -o "nodejs.zip"
        elif command_exists wget; then
        wget "$NODE_URL" -O "nodejs.zip"
    else
        echo "❌ Error: Neither curl nor wget is available. Please install one of them."
        exit 1
    fi
    
    if [ ! -f "nodejs.zip" ]; then
        echo "❌ Error: Failed to download Node.js"
        exit 1
    fi
    
    echo "   • Extracting Node.js..."
    
    # Extract Node.js (using PowerShell since unzip might not be available)
    powershell.exe -Command "Expand-Archive -Path 'nodejs.zip' -DestinationPath '.'" 2>/dev/null
    
    if [ ! -d "$NODE_DIR" ]; then
        echo "❌ Error: Failed to extract Node.js"
        exit 1
    fi
    
    echo "   • Installing Node.js to $INSTALL_DIR..."
    
    # Create installation directory and copy files
    mkdir -p "$INSTALL_DIR"
    cp -r "$NODE_DIR"/* "$INSTALL_DIR/"
    
    # Add Node.js to PATH if not already there
    NODE_PATH="/c/Program Files/nodejs"
    if [[ ":$PATH:" != *":$NODE_PATH:"* ]]; then
        echo "   • Adding Node.js to PATH..."
        echo 'export PATH="/c/Program Files/nodejs:$PATH"' >> ~/.bashrc
        export PATH="/c/Program Files/nodejs:$PATH"
    fi
    
    # Clean up
    cd /
    rm -rf "$TEMP_DIR"
    
    echo "✅ Node.js installation completed!"
}

# Function to install PM2
install_pm2() {
    echo "📦 Installing PM2..."
    
    # Install PM2 globally
    if npm install -g pm2; then
        echo "✅ PM2 installation completed!"
    else
        echo "❌ Error: Failed to install PM2"
        exit 1
    fi
}

# Function to verify installations
verify_installations() {
    echo ""
    echo "🔍 Verifying installations..."
    echo "----------------------------"
    
    # Check Node.js
    if command_exists node; then
        NODE_VER=$(node --version)
        echo "✅ Node.js: $NODE_VER"
    else
        echo "❌ Node.js: Not found"
        return 1
    fi
    
    # Check npm
    if command_exists npm; then
        NPM_VER=$(npm --version)
        echo "✅ npm: v$NPM_VER"
    else
        echo "❌ npm: Not found"
        return 1
    fi
    
    # Check PM2
    if command_exists pm2; then
        PM2_VER=$(pm2 --version)
        echo "✅ PM2: v$PM2_VER"
    else
        echo "❌ PM2: Not found"
        return 1
    fi
    
    echo ""
    echo "🎉 All installations verified successfully!"
    return 0
}

# Function to create PM2 ecosystem file
create_ecosystem_file() {
    echo ""
    echo "📝 Creating PM2 ecosystem file..."
    
    cat > ecosystem.config.js << 'EOF'
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
EOF
    
    # Create logs directory
    mkdir -p logs
    
    echo "✅ PM2 ecosystem file created: ecosystem.config.js"
}

# Function to show usage instructions
show_usage() {
    echo ""
    echo "📋 Usage Instructions:"
    echo "====================="
    echo ""
    echo "🔧 Basic PM2 Commands:"
    echo "   pm2 start ecosystem.config.js    # Start your application"
    echo "   pm2 stop all                     # Stop all applications"
    echo "   pm2 restart all                  # Restart all applications"
    echo "   pm2 list                         # List all applications"
    echo "   pm2 logs                         # Show logs"
    echo "   pm2 monit                        # Monitor applications"
    echo ""
    echo "🚀 To start your AI Studio Worker:"
    echo "   cd /path/to/your/nodejs-server"
    echo "   pm2 start ecosystem.config.js"
    echo ""
    echo "💡 To make PM2 start on system boot:"
    echo "   pm2 startup"
    echo "   pm2 save"
    echo ""
    echo "📁 Logs are saved in: ./logs/"
    echo ""
}

# Main installation process
main() {
    echo "🔍 Checking current installations..."
    
    # Check if Node.js is already installed and version
    if command_exists node; then
        CURRENT_VERSION=$(node --version | sed 's/v//')
        MAJOR_VERSION=$(echo $CURRENT_VERSION | cut -d. -f1)
        
        if [ "$MAJOR_VERSION" -ge 22 ]; then
            echo "✅ Node.js v$CURRENT_VERSION is already installed (>= v22)"
        else
            echo "⚠️  Node.js v$CURRENT_VERSION found, but v22+ is recommended"
            read -p "Do you want to install Node.js 22? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                install_nodejs
            fi
        fi
    else
        echo "❌ Node.js not found"
        install_nodejs
    fi
    
    # Check if PM2 is installed
    if command_exists pm2; then
        PM2_VERSION=$(pm2 --version)
        echo "✅ PM2 v$PM2_VERSION is already installed"
    else
        echo "❌ PM2 not found"
        install_pm2
    fi
    
    # Verify installations
    if verify_installations; then
        # Create ecosystem file
        create_ecosystem_file
        
        # Show usage instructions
        show_usage
        
        echo "🎉 Installation completed successfully!"
        echo ""
        echo "⚠️  IMPORTANT: Please restart your Git Bash terminal or run:"
        echo "   source ~/.bashrc"
        echo ""
    else
        echo "❌ Installation failed. Please check the errors above."
        exit 1
    fi
}

# Check if running on Windows
if [[ "$OSTYPE" != "msys" && "$OSTYPE" != "win32" ]]; then
    echo "⚠️  Warning: This script is designed for Git Bash on Windows."
    echo "   Current OS type: $OSTYPE"
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Run main function
main
