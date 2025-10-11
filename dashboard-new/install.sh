#!/bin/bash

# Dashboard New - Installation Script
# Version: 2.0.0-fixed
# Date: 2025-10-11

echo "🚀 Installing Dashboard New (Fixed Version)..."
echo ""

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo "❌ Error: index.html not found!"
    echo "Please run this script from the dashboard-new-deploy directory"
    exit 1
fi

# Get the target directory from user or use default
if [ -z "$1" ]; then
    echo "📁 Target directory not specified"
    echo "Usage: ./install.sh /path/to/leka_bot-main/dashboard-new"
    echo ""
    read -p "Enter target directory path: " TARGET_DIR
else
    TARGET_DIR="$1"
fi

# Validate target directory
if [ ! -d "$TARGET_DIR" ]; then
    echo "❌ Error: Target directory does not exist: $TARGET_DIR"
    read -p "Create directory? (y/n): " CREATE_DIR
    if [ "$CREATE_DIR" = "y" ]; then
        mkdir -p "$TARGET_DIR"
        echo "✅ Created directory: $TARGET_DIR"
    else
        exit 1
    fi
fi

# Backup existing files
if [ "$(ls -A $TARGET_DIR)" ]; then
    BACKUP_DIR="${TARGET_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    echo "📦 Backing up existing files to: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    cp -r "$TARGET_DIR"/* "$BACKUP_DIR/" 2>/dev/null
    echo "✅ Backup completed"
fi

# Copy files
echo "📋 Copying files to: $TARGET_DIR"
cp -r ./* "$TARGET_DIR/"
echo "✅ Files copied"

# Remove installation script from target
rm -f "$TARGET_DIR/install.sh"

# Set permissions
echo "🔒 Setting permissions..."
chmod -R 755 "$TARGET_DIR"
echo "✅ Permissions set"

echo ""
echo "✅ Installation completed successfully!"
echo ""
echo "📊 Files installed:"
echo "  - index.html"
echo "  - assets/ (CSS & JS)"
echo "  - favicon.ico"
echo "  - Documentation files"
echo ""
echo "🧪 Next steps:"
echo "  1. Test the dashboard:"
echo "     https://your-domain.com/dashboard-new/?groupId=YOUR_GROUP_ID"
echo ""
echo "  2. Check console logs (F12) for debugging"
echo ""
echo "  3. Read QUICKSTART.md for testing instructions"
echo ""
echo "📚 Documentation:"
echo "  - README.md - Overview and features"
echo "  - QUICKSTART.md - Quick start guide"
echo "  - DEPLOYMENT.md - Deployment instructions"
echo "  - CHANGELOG.md - What's changed"
echo ""
echo "🎉 Happy deploying!"

