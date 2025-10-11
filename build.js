#!/usr/bin/env node

// Simple build script เพื่อแก้ปัญหา path aliases
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building TypeScript project...');

try {
  // Build Tailwind CSS first
  try {
    console.log('🎨 Building Tailwind CSS...');
    execSync('npx tailwindcss -i ./dashboard/input.css -o ./dashboard/tailwind.css --minify', { stdio: 'inherit' });
    console.log('✅ Tailwind CSS build completed');
  } catch (cssErr) {
    console.warn('⚠️ Failed to build Tailwind CSS:', cssErr && cssErr.message ? cssErr.message : cssErr);
  }

  // Run TypeScript compiler
  console.log('📦 Compiling TypeScript...');
  execSync('npx tsc', { stdio: 'inherit' });
  
  console.log('✅ TypeScript compilation completed');
  // Copy static dashboard assets to dist so Express can serve them in production
  const srcDashboardDir = path.join(__dirname, 'dashboard');
  const distDashboardDir = path.join(__dirname, 'dist', 'dashboard');

  const copyRecursiveSync = (src, dest) => {
    if (!fs.existsSync(src)) return;
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      const entries = fs.readdirSync(src);
      for (const entry of entries) {
        const srcPath = path.join(src, entry);
        const destPath = path.join(dest, entry);
        copyRecursiveSync(srcPath, destPath);
      }
    } else {
      fs.copyFileSync(src, dest);
    }
  };

  try {
    console.log('🗂️  Copying dashboard static files to dist/dashboard ...');
    copyRecursiveSync(srcDashboardDir, distDashboardDir);
    console.log('✅ Dashboard assets copied');
  } catch (copyErr) {
    console.warn('⚠️ Failed to copy dashboard assets:', copyErr && copyErr.message ? copyErr.message : copyErr);
  }

  // Build dashboard-new (React)
  try {
    console.log('⚛️  Building dashboard-new (React)...');
    const dashboardNewDir = path.join(__dirname, 'dashboard-new');
    if (fs.existsSync(dashboardNewDir)) {
      // Install dependencies if needed
      if (!fs.existsSync(path.join(dashboardNewDir, 'node_modules'))) {
        console.log('📦 Installing dashboard-new dependencies...');
        execSync('npm install', { cwd: dashboardNewDir, stdio: 'inherit' });
      }
      // Build React app
      console.log('🔨 Building React app...');
      execSync('npm run build', { cwd: dashboardNewDir, stdio: 'inherit' });
      console.log('✅ Dashboard-new build completed');
      
      // Copy built files to dist
      const srcDashboardNewDist = path.join(dashboardNewDir, 'dist');
      const distDashboardNewDir = path.join(__dirname, 'dist', 'dashboard-new', 'dist');
      if (fs.existsSync(srcDashboardNewDist)) {
        console.log('🗂️  Copying dashboard-new/dist to dist/dashboard-new/dist ...');
        copyRecursiveSync(srcDashboardNewDist, distDashboardNewDir);
        console.log('✅ Dashboard-new assets copied');
      }
    } else {
      console.warn('⚠️ dashboard-new directory not found, skipping...');
    }
  } catch (dashboardNewErr) {
    console.warn('⚠️ Failed to build dashboard-new:', dashboardNewErr && dashboardNewErr.message ? dashboardNewErr.message : dashboardNewErr);
    console.warn('   Continuing without dashboard-new...');
  }

  console.log('🚀 Build successful!');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}