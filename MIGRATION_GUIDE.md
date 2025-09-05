# Comprehensive Auto-Migration System

This document explains the automatic migration system that ensures all data is properly handled and the system works correctly during deployment.

## Overview

The comprehensive migration system automatically runs during server startup and deployment to:

1. **Validate and fix database schema** - Ensures all required tables and columns exist
2. **Add missing columns** - Adds any new columns required by the current codebase
3. **Fix enum values** - Updates database enums to match code definitions
4. **Initialize task workflows** - Sets up workflow data for existing tasks
5. **Fix data inconsistencies** - Repairs broken relationships and orphaned data
6. **Update task statuses** - Ensures task statuses reflect their actual workflow state
7. **Clean up orphaned data** - Removes data that references non-existent records
8. **Validate data integrity** - Final verification that all data is consistent

## Migration Files

### Core Migration System
- **`src/utils/comprehensiveMigration.ts`** - Main comprehensive migration system
- **`src/utils/autoMigration.ts`** - Auto-migration wrapper (now delegates to comprehensive system)
- **`src/scripts/runComprehensiveMigration.ts`** - CLI script for manual migration execution

### Deployment Scripts
- **`scripts/deploy-migration.js`** - Deployment script that runs migration before starting the server
- **`package.json`** - Updated with new migration commands

## How It Works

### Automatic Execution
The migration system runs automatically when:

1. **Server starts** - Checks if migration is needed and runs it if required
2. **Deployment** - Railway deployment now runs `npm run deploy` which executes migration first
3. **Manual trigger** - Via API endpoint or CLI command

### Migration Steps

The comprehensive migration executes these steps in order:

```typescript
const migrationSteps = [
  { name: 'validateDatabaseSchema', description: 'Validate and fix database schema' },
  { name: 'addMissingColumns', description: 'Add missing columns to tables' },
  { name: 'fixEnumValues', description: 'Fix enum values and constraints' },
  { name: 'migrateTaskWorkflow', description: 'Initialize task workflow data' },
  { name: 'fixUserData', description: 'Fix user data inconsistencies' },
  { name: 'fixGroupData', description: 'Fix group data inconsistencies' },
  { name: 'fixTaskAssignments', description: 'Fix task assignment relationships' },
  { name: 'fixFileAttachments', description: 'Fix file attachment relationships' },
  { name: 'fixKPIRecords', description: 'Fix KPI record foreign keys' },
  { name: 'updateTaskStatuses', description: 'Update task statuses based on workflow' },
  { name: 'cleanupOrphanedData', description: 'Clean up orphaned data' },
  { name: 'validateDataIntegrity', description: 'Final data integrity validation' }
];
```

### Error Handling

- **Non-destructive** - Migrations preserve existing data
- **Idempotent** - Can be run multiple times safely
- **Continues on failure** - Individual step failures don't stop the entire process
- **Detailed logging** - Comprehensive logs for debugging
- **Result reporting** - Summary of successful/failed steps

## Usage

### Automatic (Recommended)
The migration runs automatically during:
- Server startup
- Railway deployment

### Manual Execution

#### CLI Command
```bash
npm run db:migrate-comprehensive
```

#### API Endpoint
```bash
POST /api/admin/migrate
```

#### Direct Script
```bash
tsx src/scripts/runComprehensiveMigration.ts
```

### Check Migration Status

#### API Endpoint
```bash
GET /migration-status
```

#### Response Example
```json
{
  "status": "OK",
  "needsMigration": false,
  "timestamp": "2025-01-20T10:30:00.000Z",
  "message": "Database schema is up to date",
  "lastMigrationResults": {
    "validateDatabaseSchema": {
      "success": true,
      "message": "Completed successfully"
    }
  },
  "endpoints": {
    "runMigration": "/api/admin/migrate",
    "checkDatabase": "/api/admin/check-db"
  }
}
```

## Railway Deployment Configuration

The `railway.json` is configured to run migrations during deployment:

```json
{
  "deploy": {
    "startCommand": "npm run deploy"
  }
}
```

The `npm run deploy` script executes:
1. `npm run deploy:migrate` - Runs comprehensive migration
2. `npm run start` - Starts the server

## Environment Variables

### Optional Configuration
- **`SKIP_MIGRATION`** - Set to `'true'` to skip migration (for testing)
- **`MIGRATION_TIMEOUT`** - Timeout in milliseconds (default: 300000 = 5 minutes)
- **`NODE_ENV`** - Affects logging verbosity and error handling

### Production Settings
```bash
NODE_ENV=production
MIGRATION_TIMEOUT=600000  # 10 minutes for production
```

## Migration Detection

The system automatically detects if migration is needed by checking:

1. **Missing columns** - Compares database schema with code requirements
2. **Missing enum values** - Validates task status enum values
3. **Orphaned data** - Checks for broken foreign key relationships
4. **Workflow data** - Verifies tasks have proper workflow initialization

## Troubleshooting

## Troubleshooting

### Build Issues

#### TypeScript Compilation Errors
If you encounter TypeScript compilation errors during build:

1. **Type assertion fixes** - The migration system uses `any` types in strategic places to avoid complex TypeORM type checking
2. **Fallback build options** - Use `npm run deploy:no-build` to skip TypeScript compilation if needed
3. **Environment variables** - Set `SKIP_BUILD=true` to bypass build step during deployment

#### Common Build Errors
```bash
# Error: Cannot find module 'typeorm'
# Solution: Ensure dependencies are installed
npm ci --include=dev

# Error: Type conversion issues in Task model
# Solution: Uses any type assertions in migration code

# Error: Workflow type mismatch
# Solution: Simplified workflow type handling with any types
```

### Common Issues

#### Migration Timeout
If migration takes too long:
```bash
MIGRATION_TIMEOUT=900000 npm run db:migrate-comprehensive
```

#### Skipping Migration for Testing
```bash
SKIP_MIGRATION=true npm start
```

#### Manual Cleanup
If automatic migration fails, you can run individual legacy scripts:
```bash
npm run db:migrate-all         # Run all legacy migrations
npm run db:check-schema        # Check database schema
npm run db:fix-kpi-foreign-key # Fix KPI foreign keys
```

### Debugging

1. **Check logs** - Migration provides detailed logging
2. **Use API endpoint** - Get migration status via `/migration-status`
3. **Manual execution** - Run migration manually to see detailed output
4. **Development mode** - Set `NODE_ENV=development` for verbose logging

### Recovery

If migration fails completely:

1. **Backup database** - Always backup before major changes
2. **Run individual steps** - Use legacy migration scripts for specific issues
3. **Manual fixes** - Apply database fixes manually if needed
4. **Retry migration** - Run comprehensive migration again after fixes

## Benefits

### For Development
- **Automatic schema updates** - No need to manually run migration scripts
- **Data consistency** - Ensures development database matches production
- **Error prevention** - Catches data issues before they cause runtime errors

### For Deployment
- **Zero-downtime migrations** - Migrations run before server starts
- **Consistent deployments** - Every deployment ensures data consistency
- **Rollback safety** - Non-destructive migrations allow safe rollbacks
- **Monitoring** - API endpoints for checking migration status

### For Maintenance
- **Self-healing** - System fixes common data issues automatically
- **Monitoring** - Clear reporting of migration results
- **Flexibility** - Can be run manually when needed

## Best Practices

1. **Always backup** production data before major migrations
2. **Test migrations** in staging environment first
3. **Monitor logs** during deployment for migration issues
4. **Use API endpoints** to check migration status
5. **Don't skip migrations** in production without good reason

## Migration History

The system maintains backward compatibility with existing migration scripts while providing a comprehensive, automated solution for data consistency and schema updates.

For legacy migration scripts, see the `src/scripts/` directory.