#!/bin/bash
set -e

echo "🚀 Starting Railway Build..."

# 1. Install backend deps if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing backend dependencies..."
  npm ci --include=dev
fi

# 2. Build backend assets
echo "🛠️  Building Backend..."
npm run css:build
npx tsc

# 3. Build Dashboard New (React)
echo "⚛️  Building Dashboard New (React)..."
cd dashboard-new
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dashboard-new dependencies..."
  npm ci
fi
npm run build
cd ..

# 4. Copy static assets into dist without rebuilding
echo "📋 Preparing production assets..."
SKIP_INTERNAL_BUILD=true node build.js

echo "✅ Build Complete!"
