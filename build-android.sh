#!/bin/bash
# EDU Mentor AI - Android APK Packaging Script (using Capacitor)

echo "🚀 EDU Mentor AI - Android APK Builder"
echo "========================================"

# Check if Node.js is available
if ! command -v npm &> /dev/null; then
    echo "❌ Node.js and npm are required. Please install Node.js 18+"
    exit 1
fi

# Navigate to project root
cd "$(dirname "$0")" || exit 1

# Create Capacitor project structure
echo "📦 Setting up Capacitor for Android..."

# Check if package.json exists, if not create one
if [ ! -f "package.json" ]; then
    cat > package.json << 'EOF'
{
  "name": "edu-mentor-ai",
  "version": "1.0.0",
  "description": "Offline AI Tutor for Tamil Nadu Students",
  "main": "index.js",
  "scripts": {
    "build": "echo 'Static app - no build needed'",
    "cap:init": "npx cap init 'EDU Mentor AI' com.edumentor.ai",
    "cap:add:android": "npx cap add android",
    "cap:sync": "npx cap sync",
    "cap:open:android": "npx cap open android"
  }
}
EOF
fi

# Install Capacitor
echo "📦 Installing Capacitor..."
npm install @capacitor/core @capacitor/cli @capacitor/android

# Initialize Capacitor if not already done
if [ ! -f "capacitor.config.ts" ] && [ ! -f "capacitor.config.json" ]; then
    echo "🔧 Initializing Capacitor..."
    cat > capacitor.config.json << 'EOF'
{
  "appId": "com.edumentor.ai",
  "appName": "EDU Mentor AI",
  "webDir": "edu-mentor-ai/frontend",
  "server": {
    "url": "http://127.0.0.1:8000",
    "cleartext": true
  },
  "android": {
    "allowMixedContent": true
  }
}
EOF
fi

# Add Android platform
if [ ! -d "android" ]; then
    echo "📱 Adding Android platform..."
    npx cap add android
fi

# Sync files
echo "🔄 Syncing project files..."
npx cap sync android

echo ""
echo "✅ Android project setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Install Android Studio: https://developer.android.com/studio"
echo "2. Run: npx cap open android"
echo "3. Build APK from Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)"
echo ""
echo "📁 APK will be in: android/app/build/outputs/apk/debug/"
