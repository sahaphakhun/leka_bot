#!/usr/bin/env node

// Simple build script เพื่อแก้ปัญหา path aliases
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building TypeScript project...');

try {
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

  console.log('🚀 Build successful!');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}