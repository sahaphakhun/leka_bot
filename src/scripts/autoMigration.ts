import 'reflect-metadata';
import { AppDataSource } from '@/utils/database';
import { Group, KPIRecord } from '@/models';
import { LineService } from '@/services/LineService';
import { logger } from '@/utils/logger';

/**
 * Auto-migration system for Railway deployment
 * This script ensures database schema compatibility and migrates existing data
 * when deploying updates to production.
 */
class AutoMigrationSystem {
  private lineService: LineService;

  constructor() {
    this.lineService = new LineService();
  }

  /**
   * Main auto-migration entry point
   * This should be called during deployment startup
   */
  public async runAutoMigration(): Promise<void> {
    console.log('🚀 Starting auto-migration system...');
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🎯 Database URL: ${process.env.DATABASE_URL ? 'Railway PostgreSQL' : 'Local PostgreSQL'}`);

    try {
      // Initialize database connection
      await AppDataSource.initialize();
      console.log('✅ Database connected successfully');

      // Initialize LINE service for group name migrations
      try {
        await this.lineService.initialize();
        console.log('✅ LINE service initialized');
      } catch (error) {
        console.warn('⚠️ LINE service initialization failed, some migrations may be limited:', error);
      }

      // Run all migration steps
      await this.runSchemaValidation();
      await this.runEnumMigrations();
      await this.runDataMigrations();
      await this.runGroupNameMigrations();
      await this.runCleanupOperations();

      console.log('🎉 Auto-migration completed successfully!');

    } catch (error) {
      console.error('❌ Auto-migration failed:', error);
      throw error;
    } finally {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        console.log('🔌 Database connection closed');
      }
    }
  }

  /**
   * Step 1: Validate and update database schema
   */
  private async runSchemaValidation(): Promise<void> {
    console.log('\n🔍 Step 1: Schema Validation');
    
    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      // Check existing tables
      const existingTables = await queryRunner.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      const tableNames = existingTables.map((t: any) => t.table_name);
      console.log('📋 Existing tables:', tableNames);

      // Expected tables for the current version
      const expectedTables = [
        'users', 'groups', 'group_members', 'tasks', 'task_assignees', 
        'task_files', 'files', 'kpi_records', 'recurring_tasks'
      ];

      const missingTables = expectedTables.filter(table => !tableNames.includes(table));
      
      if (missingTables.length > 0) {
        console.log('🔄 Missing tables detected, running synchronization...');
        console.log('📝 Missing tables:', missingTables);
        
        // In production, we need to be careful with synchronize
        if (process.env.NODE_ENV === 'production') {
          console.log('⚠️ Production environment: Running careful schema update...');
          await this.safeSchemaUpdate(queryRunner);
        } else {
          console.log('🔄 Development environment: Running full synchronization...');
          await AppDataSource.synchronize();
        }
        
        console.log('✅ Schema synchronization completed');
      } else {
        console.log('✅ All required tables exist');
      }

      // Ensure important columns exist
      await this.ensureRequiredColumns(queryRunner);

    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Step 2: Migrate database enums safely
   */
  private async runEnumMigrations(): Promise<void> {
    console.log('\n🔧 Step 2: Enum Migrations');
    
    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      // Migrate KPI record types to include 'overdue'
      await this.migrateKPIRecordEnum(queryRunner);
      
      // Add other enum migrations here as needed
      console.log('✅ Enum migrations completed');
      
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Step 3: Migrate existing data structures
   */
  private async runDataMigrations(): Promise<void> {
    console.log('\n📊 Step 3: Data Migrations');
    
    try {
      // Migrate group member roles to admin (legacy fix)
      await this.migrateGroupMemberRoles();
      
      // Update group settings for supervisor support
      await this.migrateGroupSettings();
      
      // Fix task workflow data if needed
      await this.migrateTaskWorkflow();
      
      console.log('✅ Data migrations completed');
      
    } catch (error) {
      console.error('❌ Data migration failed:', error);
      // Don't throw here - data migrations are often optional
      console.log('⚠️ Continuing despite data migration errors...');
    }
  }

  /**
   * Step 4: Migrate group names (our new feature)
   */
  private async runGroupNameMigrations(): Promise<void> {
    console.log('\n🏷️ Step 4: Group Name Migrations');
    
    try {
      const groups = await AppDataSource.getRepository(Group).find();
      console.log(`📊 Found ${groups.length} groups to check`);

      let updatedCount = 0;
      let skippedCount = 0;

      for (const group of groups) {
        try {
          if (this.isPlaceholderName(group.name)) {
            console.log(`🔄 Updating placeholder name: ${group.name}`);
            
            try {
              const groupInfo = await this.lineService.getGroupInformation(group.lineGroupId);
              
              if (groupInfo.source === 'line_api' || this.isImprovedName(group.name, groupInfo.name)) {
                await AppDataSource.getRepository(Group).update(
                  { id: group.id },
                  { name: groupInfo.name }
                );
                console.log(`✅ Updated: "${group.name}" → "${groupInfo.name}"`);
                updatedCount++;
              } else {
                console.log(`ℹ️ No improvement available for: ${group.name}`);
                skippedCount++;
              }
            } catch (error) {
              console.warn(`⚠️ Failed to update group ${group.name}:`, error);
              skippedCount++;
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            skippedCount++;
          }
        } catch (error) {
          console.error(`❌ Error processing group ${group.id}:`, error);
          skippedCount++;
        }
      }

      console.log(`📈 Group name migration summary:`);
      console.log(`   - Updated: ${updatedCount}`);
      console.log(`   - Skipped: ${skippedCount}`);
      console.log('✅ Group name migrations completed');
      
    } catch (error) {
      console.error('❌ Group name migration failed:', error);
      // Don't throw - this is not critical for system operation
      console.log('⚠️ Continuing despite group name migration errors...');
    }
  }

  /**
   * Step 5: Cleanup operations
   */
  private async runCleanupOperations(): Promise<void> {
    console.log('\n🧹 Step 5: Cleanup Operations');
    
    try {
      // Clean up old/invalid data if needed
      await this.cleanupInvalidData();
      
      console.log('✅ Cleanup operations completed');
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      // Don't throw - cleanup is not critical
      console.log('⚠️ Continuing despite cleanup errors...');
    }
  }

  /**
   * Safe schema update for production
   */
  private async safeSchemaUpdate(queryRunner: any): Promise<void> {
    // In production, we should be more careful about schema changes
    // This is a placeholder for more sophisticated migration logic
    console.log('🔄 Running safe schema update...');
    
    // Add specific table creation logic here if needed
    // For now, we'll use synchronize but this should be replaced with explicit migrations
    await AppDataSource.synchronize();
  }

  /**
   * Ensure required columns exist
   */
  private async ensureRequiredColumns(queryRunner: any): Promise<void> {
    console.log('🔧 Ensuring required columns exist...');
    
    try {
      // Check for files table columns
      const fileColumns = await queryRunner.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'files'
      `);
      
      const columnNames = fileColumns.map((c: any) => c.column_name);
      
      const alterations = [];
      if (!columnNames.includes('storageProvider')) {
        alterations.push('ADD COLUMN "storageProvider" varchar');
      }
      if (!columnNames.includes('storageKey')) {
        alterations.push('ADD COLUMN "storageKey" varchar');
      }
      
      if (alterations.length > 0) {
        const alterSql = `ALTER TABLE "files" ${alterations.join(', ')}`;
        await queryRunner.query(alterSql);
        console.log('✅ Files table columns updated');
      }
      
      // Add other column checks here as needed
      
    } catch (error) {
      console.error('❌ Failed to ensure required columns:', error);
      throw error;
    }
  }

  /**
   * Migrate KPI record enum to include 'overdue'
   */
  private async migrateKPIRecordEnum(queryRunner: any): Promise<void> {
    try {
      // Check if 'overdue' already exists in the enum
      const enumCheck = await queryRunner.query(`
        SELECT enumlabel 
        FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'kpi_records_type_enum' 
        AND enumlabel = 'overdue'
      `);

      if (enumCheck.length === 0) {
        console.log('🔄 Adding "overdue" to KPI records enum...');
        await queryRunner.query(`ALTER TYPE kpi_records_type_enum ADD VALUE 'overdue'`);
        console.log('✅ KPI records enum updated');
      } else {
        console.log('✅ KPI records enum already includes "overdue"');
      }
    } catch (error) {
      console.error('❌ Failed to migrate KPI record enum:', error);
      // This might fail if enum doesn't exist yet, which is ok
      console.log('ℹ️ Enum migration skipped (enum may not exist yet)');
    }
  }

  /**
   * Migrate group member roles to admin
   */
  private async migrateGroupMemberRoles(): Promise<void> {
    try {
      const result = await AppDataSource.query(`
        UPDATE group_members 
        SET role = 'admin' 
        WHERE role = 'member'
      `);
      
      if (result[1] > 0) {
        console.log(`✅ Updated ${result[1]} group members to admin role`);
      } else {
        console.log('✅ All group members already have admin role');
      }
    } catch (error) {
      console.error('❌ Failed to migrate group member roles:', error);
    }
  }

  /**
   * Migrate group settings to support supervisors
   */
  private async migrateGroupSettings(): Promise<void> {
    try {
      const groups = await AppDataSource.getRepository(Group).find();
      let updatedCount = 0;
      
      for (const group of groups) {
        if (!group.settings.supervisors) {
          group.settings = {
            ...group.settings,
            supervisors: []
          };
          await AppDataSource.getRepository(Group).save(group);
          updatedCount++;
        }
      }
      
      if (updatedCount > 0) {
        console.log(`✅ Updated ${updatedCount} groups with supervisors field`);
      } else {
        console.log('✅ All groups already have supervisors field');
      }
    } catch (error) {
      console.error('❌ Failed to migrate group settings:', error);
    }
  }

  /**
   * Migrate task workflow data
   */
  private async migrateTaskWorkflow(): Promise<void> {
    try {
      // This is a simplified version - implement based on your needs
      console.log('✅ Task workflow migration completed (placeholder)');
    } catch (error) {
      console.error('❌ Failed to migrate task workflow:', error);
    }
  }

  /**
   * Clean up invalid data
   */
  private async cleanupInvalidData(): Promise<void> {
    try {
      // Clean up orphaned records, invalid references, etc.
      // This is a placeholder for actual cleanup logic
      console.log('✅ Invalid data cleanup completed (placeholder)');
    } catch (error) {
      console.error('❌ Failed to cleanup invalid data:', error);
    }
  }

  /**
   * Check if a group name looks like a placeholder
   */
  private isPlaceholderName(name: string): boolean {
    const placeholderPatterns = [
      /^กลุ่ม [A-Za-z0-9]{1,8}$/,
      /^กลุ่ม [A-Za-z0-9]{8,}$/,
      /^\[INACTIVE\]/,
      /^Group /,
      /^แชทส่วนตัว$/,
      /^personal_/
    ];

    return placeholderPatterns.some(pattern => pattern.test(name));
  }

  /**
   * Check if new name is an improvement
   */
  private isImprovedName(oldName: string, newName: string): boolean {
    if (this.isPlaceholderName(newName)) return false;
    if (this.isPlaceholderName(oldName) && !this.isPlaceholderName(newName)) return true;
    if (newName.length > oldName.length && newName.length > 10) return true;
    return false;
  }
}

/**
 * Main entry point for auto-migration
 */
async function runAutoMigration() {
  const migrationSystem = new AutoMigrationSystem();
  await migrationSystem.runAutoMigration();
}

// Run if called directly
if (require.main === module) {
  runAutoMigration()
    .then(() => {
      console.log('🎉 Auto-migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Auto-migration process failed:', error);
      process.exit(1);
    });
}

export { AutoMigrationSystem, runAutoMigration };