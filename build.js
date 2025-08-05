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
  console.log('🚀 Build successful!');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}