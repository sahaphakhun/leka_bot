#!/bin/bash
set -e

echo "🚀 Starting Railway Build..."

# 1. Build Backend
echo "📦 Building Backend..."
npm ci --include=dev
npm run css:build
npx tsc

# 2. Build Dashboard New (React)
echo "⚛️  Building Dashboard New (React)..."
cd dashboard-new
npm ci
npm run build
cd ..

# 3. Copy files
echo "📋 Copying files..."
node build.js

echo "✅ Build Complete!"
