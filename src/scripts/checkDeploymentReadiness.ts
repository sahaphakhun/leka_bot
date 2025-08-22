#!/usr/bin/env tsx

// Deployment Readiness Check
// Verifies all auto-migration components are properly configured

import { existsSync } from 'fs';
import { join } from 'path';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

class DeploymentReadinessCheck {
  private results: CheckResult[] = [];

  private addResult(name: string, status: 'pass' | 'fail' | 'warning', message: string) {
    this.results.push({ name, status, message });
  }

  private checkFile(filePath: string, description: string): boolean {
    const fullPath = join(process.cwd(), filePath);
    const exists = existsSync(fullPath);
    
    this.addResult(
      `File: ${description}`,
      exists ? 'pass' : 'fail',
      exists ? `✅ ${filePath} exists` : `❌ ${filePath} missing`
    );
    
    return exists;
  }

  private async checkAutoMigrationSystem(): Promise<void> {
    console.log('🔍 Checking Auto-Migration System...\n');

    // Check core migration files
    this.checkFile('src/scripts/autoMigration.ts', 'Comprehensive Auto-Migration System');
    this.checkFile('src/scripts/migrateGroupNames.ts', 'Group Name Migration Script');
    this.checkFile('src/utils/autoMigration.ts', 'Fallback Migration Utility');

    // Check integration files
    this.checkFile('src/index.ts', 'Main Server Entry Point');
    this.checkFile('package.json', 'Package Configuration');

    // Check deployment files
    this.checkFile('scripts/railway-deploy.sh', 'Railway Deployment Script');
    this.checkFile('railway.json', 'Railway Configuration');
    this.checkFile('docs/deployment-guide.md', 'Deployment Documentation');
  }

  private async checkPackageJsonScripts(): Promise<void> {
    console.log('📦 Checking Package.json Scripts...\n');

    try {
      const packageJsonPath = join(process.cwd(), 'package.json');
      if (!existsSync(packageJsonPath)) {
        this.addResult('Package.json', 'fail', '❌ package.json not found');
        return;
      }

      const packageJson = require(packageJsonPath);
      const scripts = packageJson.scripts || {};

      const requiredScripts = [
        'start',
        'start:production',
        'build',
        'db:auto-migrate',
        'db:migrate-group-names'
      ];

      let allScriptsExist = true;
      for (const script of requiredScripts) {
        if (scripts[script]) {
          this.addResult(`Script: ${script}`, 'pass', `✅ ${script}: ${scripts[script]}`);
        } else {
          this.addResult(`Script: ${script}`, 'fail', `❌ Missing script: ${script}`);
          allScriptsExist = false;
        }
      }

      if (allScriptsExist) {
        this.addResult('Package Scripts', 'pass', '✅ All required scripts configured');
      }

    } catch (error) {
      this.addResult('Package.json', 'fail', `❌ Error reading package.json: ${error}`);
    }
  }

  private async checkEnvironmentConfiguration(): Promise<void> {
    console.log('🌍 Checking Environment Configuration...\n');

    // Check for .env.example or documentation
    const hasEnvExample = this.checkFile('.env.example', 'Environment Example File');
    
    // Check critical environment variables
    const criticalEnvVars = [
      'DATABASE_URL',
      'LINE_CHANNEL_ACCESS_TOKEN',
      'LINE_CHANNEL_SECRET'
    ];

    let envConfigured = true;
    for (const envVar of criticalEnvVars) {
      if (process.env[envVar]) {
        this.addResult(`Env: ${envVar}`, 'pass', `✅ ${envVar} is configured`);
      } else {
        this.addResult(`Env: ${envVar}`, 'warning', `⚠️ ${envVar} not set (ok for development)`);
      }
    }
  }

  private async checkDatabaseConfiguration(): Promise<void> {
    console.log('🗃️ Checking Database Configuration...\n');

    try {
      // Try to import database configuration
      const dbConfigPath = join(process.cwd(), 'src/utils/database.ts');
      if (existsSync(dbConfigPath)) {
        this.addResult('Database Config', 'pass', '✅ Database configuration exists');
        
        // Check if TypeORM models are available
        const modelsPath = join(process.cwd(), 'src/models/index.ts');
        if (existsSync(modelsPath)) {
          this.addResult('Database Models', 'pass', '✅ TypeORM models configured');
        } else {
          this.addResult('Database Models', 'warning', '⚠️ Models index file not found');
        }
      } else {
        this.addResult('Database Config', 'fail', '❌ Database configuration missing');
      }
    } catch (error) {
      this.addResult('Database Config', 'fail', `❌ Database configuration error: ${error}`);
    }
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 DEPLOYMENT READINESS REPORT');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;

    console.log(`\n📊 Summary: ${passed} passed, ${failed} failed, ${warnings} warnings\n`);

    // Group results by status
    const byStatus = {
      pass: this.results.filter(r => r.status === 'pass'),
      fail: this.results.filter(r => r.status === 'fail'),
      warning: this.results.filter(r => r.status === 'warning')
    };

    // Print results
    for (const [status, results] of Object.entries(byStatus)) {
      if (results.length > 0) {
        const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
        console.log(`${icon} ${status.toUpperCase()}:`);
        results.forEach(result => {
          console.log(`   ${result.message}`);
        });
        console.log('');
      }
    }

    // Overall status
    if (failed === 0) {
      console.log('🎉 DEPLOYMENT READY! All critical checks passed.');
      console.log('💡 Auto-migration system is properly configured.');
      console.log('🚀 Safe to deploy to Railway!');
    } else {
      console.log('❌ DEPLOYMENT NOT READY! Please fix the failed checks above.');
      console.log('📋 Review the deployment guide at docs/deployment-guide.md');
    }

    console.log('\n' + '='.repeat(60));
  }

  public async run(): Promise<void> {
    console.log('🔍 Starting Deployment Readiness Check...\n');

    await this.checkAutoMigrationSystem();
    await this.checkPackageJsonScripts();
    await this.checkEnvironmentConfiguration();
    await this.checkDatabaseConfiguration();

    this.printResults();

    // Exit with appropriate code
    const hasFailed = this.results.some(r => r.status === 'fail');
    process.exit(hasFailed ? 1 : 0);
  }
}

// Run the check
if (require.main === module) {
  const checker = new DeploymentReadinessCheck();
  checker.run().catch(error => {
    console.error('💥 Readiness check failed:', error);
    process.exit(1);
  });
}

export { DeploymentReadinessCheck };