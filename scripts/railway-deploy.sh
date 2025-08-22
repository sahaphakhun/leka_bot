#!/bin/bash

# Railway Deployment Script with Auto-Migration
# This script ensures database schema compatibility during Railway deployment

echo "🚀 Starting Railway deployment with auto-migration..."
echo "📊 Environment: $NODE_ENV"
echo "🎯 Database URL: ${DATABASE_URL:0:20}..."

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Step 2: Build the application
echo "🔨 Building application..."
npm run build

# Step 3: Run comprehensive auto-migration
echo "🔄 Running auto-migration system..."
npm run db:auto-migrate

# Step 4: Optional - Run group name migration if needed
echo "🏷️ Running group name migration..."
npm run db:migrate-group-names || echo "⚠️ Group name migration failed, continuing..."

echo "✅ Deployment preparation completed!"
echo "🎯 Starting application..."

# Step 5: Start the application (Railway will handle this)
exec npm start