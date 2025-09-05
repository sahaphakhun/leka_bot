// Path alias registration for runtime
const moduleAlias = require('module-alias');
const path = require('path');

// Determine if we're in development or production
// Use try-catch to handle cases where process.env is not yet available
let isDevelopment = false;
let baseDir = 'dist'; // Default to production

try {
  // Always use dist for compiled builds
  isDevelopment = false;
  baseDir = 'dist';
} catch (error) {
  // If anything fails, default to production mode
  console.warn('Warning: Could not determine environment, defaulting to production mode');
  isDevelopment = false;
  baseDir = 'dist';
}

// Register path aliases
moduleAlias.addAliases({
  '@': path.join(__dirname, baseDir),
  '@/types': path.join(__dirname, baseDir, 'types'),
  '@/models': path.join(__dirname, baseDir, 'models'),
  '@/services': path.join(__dirname, baseDir, 'services'),
  '@/controllers': path.join(__dirname, baseDir, 'controllers'),
  '@/middleware': path.join(__dirname, baseDir, 'middleware'),
  '@/utils': path.join(__dirname, baseDir, 'utils')
});

// Only log if we're not in a migration context to avoid noise
if (typeof process !== 'undefined' && process.argv && !process.argv.some(arg => arg.includes('migration'))) {
  console.log(`✅ Path aliases registered for ${isDevelopment ? 'development' : 'production'} mode`);
}