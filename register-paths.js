// Path alias registration for runtime
const moduleAlias = require('module-alias');
const path = require('path');

// Determine if we're in development or production
const isDevelopment = process.env.NODE_ENV === 'development';
const baseDir = isDevelopment ? 'src' : 'dist';

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

console.log(`✅ Path aliases registered for ${isDevelopment ? 'development' : 'production'} mode`);