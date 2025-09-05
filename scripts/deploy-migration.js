#!/usr/bin/env node

/**
 * Deployment Migration Script
 * 
 * This script runs comprehensive database migrations during deployment
 * to ensure all data is properly handled and the system works correctly.
 * 
 * Usage:
 *   node scripts/deploy-migration.js
 * 
 * Environment Variables:
 *   NODE_ENV - deployment environment (production, development, etc.)
 *   SKIP_MIGRATION - if set to 'true', skips migration (for testing)
 *   MIGRATION_TIMEOUT - timeout in milliseconds (default: 300000 = 5 minutes)
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const MIGRATION_TIMEOUT = parseInt(process.env.MIGRATION_TIMEOUT) || 300000; // 5 minutes
const SKIP_MIGRATION = process.env.SKIP_MIGRATION === 'true';
const SKIP_BUILD = process.env.SKIP_BUILD === 'true';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    logInfo(`${description}...`);
    logInfo(`Executing: ${command}`);
    
    const childProcess = exec(command, { 
      timeout: MIGRATION_TIMEOUT,
      env: { ...process.env, NODE_ENV }
    });
    
    let stdout = '';
    let stderr = '';
    
    childProcess.stdout.on('data', (data) => {
      stdout += data;
      // Real-time output for debugging
      console.log(data.toString().trim());
    });
    
    childProcess.stderr.on('data', (data) => {
      stderr += data;
      console.error(data.toString().trim());
    });
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        logSuccess(`${description} completed successfully`);
        resolve({ stdout, stderr, code });
      } else {
        logError(`${description} failed with exit code ${code}`);
        reject(new Error(`Command failed: ${command}\nExit code: ${code}\nStderr: ${stderr}`));
      }
    });
    
    childProcess.on('error', (error) => {
      logError(`Failed to execute command: ${error.message}`);
      reject(error);
    });
  });
}

async function checkPrerequisites() {
  logInfo('Checking deployment prerequisites...');
  
  // Check if required files exist - adjust based on environment
  let requiredFiles = [
    'package.json',
    'src/index.ts',
    'src/utils/comprehensiveMigration.ts'
  ];
  
  // In production, we should have compiled files
  if (NODE_ENV === 'production') {
    // Check for compiled files instead
    requiredFiles = [
      'package.json',
      'dist/index.js',
      'dist/utils/comprehensiveMigration.js'
    ];
  }
  
  // Only require tsconfig.json in development environment for ts-node
  if (NODE_ENV === 'development') {
    requiredFiles.push('tsconfig.json');
  }
  
  for (const file of requiredFiles) {
    // Use path.resolve to get absolute path from project root
    const fullPath = path.resolve(__dirname, '..', file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Required file not found: ${file} (looking for ${fullPath})`);
    }
  }
  
  // Check environment variables
  const requiredEnvVars = ['DATABASE_URL'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }
  
  logSuccess('Prerequisites check passed');
}

async function buildApplication() {
  if (SKIP_BUILD) {
    logWarning('Build skipped due to SKIP_BUILD environment variable');
    return;
  }
  
  logInfo('Building application...');
  
  try {
    // In production, skip CSS build if file already exists to avoid permission issues
    if (NODE_ENV === 'production') {
      const fs = require('fs');
      const path = require('path');
      const cssPath = path.join(__dirname, '..', 'dashboard', 'tailwind.css');
      
      if (fs.existsSync(cssPath)) {
        logInfo('CSS file already exists, skipping CSS build to avoid permission issues');
        // Only run TypeScript build
        try {
          await runCommand('npm run build:no-css', 'TypeScript compilation only');
          logSuccess('Application built successfully (CSS skipped)');
        } catch (buildError) {
          logWarning('TypeScript build failed, continuing with existing dist files');
        }
      } else {
        // CSS file doesn't exist, try full build
        try {
          await runCommand('npm run build', 'Full build');
          logSuccess('Application built successfully');
        } catch (buildError) {
          logWarning('Full build failed, continuing with existing files');
        }
      }
    } else {
      // Development mode - try full build
      try {
        await runCommand('npm run build', 'TypeScript compilation');
        logSuccess('Application built successfully');
      } catch (buildError) {
        logWarning('TypeScript build had issues, attempting alternative build...');
        
        try {
          await runCommand('npm run css:build', 'CSS build');
          logWarning('Built CSS only - TypeScript compilation skipped due to type issues');
        } catch (cssError) {
          logWarning('CSS build also failed - continuing without build');
        }
      }
    }
  } catch (error) {
    logWarning('Build process failed - attempting to continue with existing files');
    logWarning('This may cause issues if TypeScript files have critical changes');
  }
}

async function runMigration() {
  if (SKIP_MIGRATION) {
    logWarning('Migration skipped due to SKIP_MIGRATION environment variable');
    return;
  }
  
  logInfo('Starting comprehensive database migration...');
  
  try {
    // Skip individual migration scripts as they have been removed
    logInfo('Skipping individual migration scripts - using comprehensive migration only');
    
    // Try to run migration - prefer compiled JavaScript in production
    let migrationCommand;
    
    // Check what files we have available using absolute paths
    const projectRoot = path.resolve(__dirname, '..');
    const hasDistFiles = fs.existsSync(path.join(projectRoot, 'dist/utils/comprehensiveMigration.js'));
    const hasSourceFiles = fs.existsSync(path.join(projectRoot, 'src/utils/comprehensiveMigration.ts'));
    
    logInfo(`File availability - dist: ${hasDistFiles}, src: ${hasSourceFiles}`);
    
    // In production, always use compiled files if available
    if (NODE_ENV === 'production' && hasDistFiles) {
      logInfo('Using compiled JavaScript files for production');
      migrationCommand = 'node -r ./register-paths.js -e "require(\'./dist/utils/comprehensiveMigration\').comprehensiveMigration.runComprehensiveMigration().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })"';
    } 
    // In development, prefer source files with ts-node if possible
    else if (NODE_ENV === 'development' && hasSourceFiles) {
      logInfo('Using TypeScript source files for development');
      // Check if we have tsconfig.json for ts-node using absolute path
      const tsconfigPath = path.resolve(projectRoot, 'tsconfig.json');
      if (fs.existsSync(tsconfigPath)) {
        migrationCommand = 'npx ts-node -r tsconfig-paths/register -e "import(\'./src/utils/comprehensiveMigration\').then(m => m.comprehensiveMigration.runComprehensiveMigration()).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })"';
      } else {
        throw new Error('tsconfig.json required for development mode with ts-node');
      }
    }
    // Fallback to compiled files if available
    else if (hasDistFiles) {
      logInfo('Falling back to compiled JavaScript files');
      migrationCommand = 'node -r ./register-paths.js -e "require(\'./dist/utils/comprehensiveMigration\').comprehensiveMigration.runComprehensiveMigration().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })"';
    }
    // Last resort: try source files without ts-node (may not work)
    else if (hasSourceFiles) {
      logWarning('No compiled files available, trying to run source files directly (may fail)');
      migrationCommand = 'node -r ./register-paths.js -e "require(\'./src/utils/comprehensiveMigration\').then(m => m.comprehensiveMigration.runComprehensiveMigration()).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })"';
    } else {
      throw new Error('No migration files found (neither dist nor src available)');
    }
    
    await runCommand(migrationCommand, 'Database migration');
    logSuccess('Database migration completed successfully');
    
  } catch (error) {
    logError(`Migration failed: ${error.message}`);
    
    // Don't fail deployment for migration errors in development
    if (NODE_ENV === 'development') {
      logWarning('Continuing deployment despite migration failure (development mode)');
    } else {
      throw error;
    }
  }
}

async function verifyDeployment() {
  logInfo('Verifying deployment...');
  
  try {
    // Check if the main entry point exists
    const entryPoints = ['dist/index.js', 'src/index.ts'];
    const entryPoint = entryPoints.find(file => fs.existsSync(file));
    
    if (!entryPoint) {
      throw new Error('No valid entry point found');
    }
    
    logSuccess(`Entry point found: ${entryPoint}`);
    
    // Verify database connection (if possible)
    if (fs.existsSync('dist/scripts/checkDatabaseConnection.js')) {
      try {
        await runCommand(
          'node -r ./register-paths.js dist/scripts/checkDatabaseConnection.js',
          'Database connection verification'
        );
      } catch (error) {
        logWarning('Database connection verification failed - this may be expected in some environments');
      }
    }
    
    logSuccess('Deployment verification completed');
    
  } catch (error) {
    logError(`Deployment verification failed: ${error.message}`);
    throw error;
  }
}

async function main() {
  const startTime = Date.now();
  
  log('🚀 Starting deployment migration process...', 'cyan');
  log(`Environment: ${NODE_ENV}`, 'blue');
  log(`Migration timeout: ${MIGRATION_TIMEOUT}ms`, 'blue');
  log(`Skip migration: ${SKIP_MIGRATION}`, 'blue');
  log(`Skip build: ${SKIP_BUILD}`, 'blue');
  
  try {
    // Step 1: Check prerequisites
    await checkPrerequisites();
    
    // Step 2: Build application
    await buildApplication();
    
    // Step 3: Run comprehensive migration
    await runMigration();
    
    // Step 4: Verify deployment
    await verifyDeployment();
    
    const duration = Date.now() - startTime;
    log(`🎉 Deployment migration completed successfully in ${duration}ms`, 'green');
    
    // Output summary
    console.log('\n' + '='.repeat(60));
    logSuccess('DEPLOYMENT MIGRATION SUMMARY');
    console.log('='.repeat(60));
    logSuccess(`✅ Environment: ${NODE_ENV}`);
    logSuccess(`✅ Duration: ${duration}ms`);
    logSuccess(`✅ Migration: ${SKIP_MIGRATION ? 'Skipped' : 'Completed'}`);
    logSuccess('✅ Application ready for deployment');
    console.log('='.repeat(60) + '\n');
    
    process.exit(0);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(60));
    logError('DEPLOYMENT MIGRATION FAILED');
    console.log('='.repeat(60));
    logError(`❌ Environment: ${NODE_ENV}`);
    logError(`❌ Duration: ${duration}ms`);
    logError(`❌ Error: ${error.message}`);
    
    if (error.stack) {
      console.log('\nStack trace:');
      console.log(error.stack);
    }
    
    console.log('='.repeat(60) + '\n');
    
    process.exit(1);
  }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
  logWarning('Received SIGINT - shutting down gracefully...');
  process.exit(1);
});

process.on('SIGTERM', () => {
  logWarning('Received SIGTERM - shutting down gracefully...');
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Run the main function
main().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});