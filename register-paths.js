// Path alias registration for runtime
const moduleAlias = require('module-alias');
const path = require('path');

// Register path aliases
moduleAlias.addAliases({
  '@': path.join(__dirname, 'dist'),
  '@/types': path.join(__dirname, 'dist/types'),
  '@/models': path.join(__dirname, 'dist/models'),
  '@/services': path.join(__dirname, 'dist/services'),
  '@/controllers': path.join(__dirname, 'dist/controllers'),
  '@/middleware': path.join(__dirname, 'dist/middleware'),
  '@/utils': path.join(__dirname, 'dist/utils')
});

console.log('✅ Path aliases registered');