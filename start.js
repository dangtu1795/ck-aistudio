#!/usr/bin/env node

// Start script with Chrome detection
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting AI Studio Worker Node.js Server...\n');

// Check if Chrome is installed
function checkChrome() {
    try {
        // Try to detect Chrome on macOS
        const chromePathMac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        if (fs.existsSync(chromePathMac)) {
            console.log('✅ Chrome detected at:', chromePathMac);
            return true;
        }

        // Try to run chrome command
        execSync('which google-chrome', { stdio: 'ignore' });
        console.log('✅ Chrome detected in PATH');
        return true;
    } catch (error) {
        console.log('⚠️  Chrome not detected. Please make sure Google Chrome is installed.');
        console.log('   Download from: https://www.google.com/chrome/');
        return false;
    }
}

// Check dependencies
function checkDependencies() {
    const packageJsonPath = path.join(__dirname, 'package.json');
    const nodeModulesPath = path.join(__dirname, 'node_modules');

    if (!fs.existsSync(nodeModulesPath)) {
        console.log('⚠️  Dependencies not installed. Running npm install...');
        try {
            execSync('npm install', { stdio: 'inherit' });
            console.log('✅ Dependencies installed successfully\n');
        } catch (error) {
            console.error('❌ Failed to install dependencies');
            process.exit(1);
        }
    } else {
        console.log('✅ Dependencies already installed\n');
    }
}

function main() {
    checkDependencies();
    checkChrome();

    console.log('🌟 Starting server on http://0.0.0.0:6000');
    console.log('📝 Server logs:');
    console.log('─'.repeat(50));

    // Start the server
    require('./server.js');
}

if (require.main === module) {
    main();
}
