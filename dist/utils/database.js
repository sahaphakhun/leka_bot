"use strict";
// Database Connection และ Configuration
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabase = exports.initializeDatabase = exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const models_1 = require("@/models");
// สำหรับ Railway หรือ production environment
const getDatabaseConfig = () => {
    if (process.env.DATABASE_URL) {
        // Railway PostgreSQL URL format
        return {
            url: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        };
    }
    else {
        // Local development
        return {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            username: process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'leka_bot',
        };
    }
};
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    ...getDatabaseConfig(),
    entities: [models_1.Group, models_1.User, models_1.GroupMember, models_1.Task, models_1.File, models_1.KPIRecord, models_1.RecurringTask],
    migrations: ['src/migrations/*.ts'],
    subscribers: ['src/subscribers/*.ts'],
    synchronize: process.env.NODE_ENV === 'development', // ใช้เฉพาะ development
    logging: process.env.NODE_ENV === 'development',
    extra: {
        // Configuration for connection pool
        max: 20,
        min: 5,
        idle: 10000,
        acquire: 30000,
        connectTimeoutMS: 30000,
    },
});
const initializeDatabase = async () => {
    try {
        await exports.AppDataSource.initialize();
        console.log('✅ Database connected successfully');
        // ตรวจสอบว่าตารางหลักมีอยู่หรือไม่
        const queryRunner = exports.AppDataSource.createQueryRunner();
        try {
            // อ่านรายการตารางทั้งหมดใน schema public
            const existingTablesResult = await queryRunner.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
            const existingTableNames = existingTablesResult.map((t) => t.table_name);
            // กำหนดรายการตารางที่ระบบต้องมี (รวมตารางเชื่อมความสัมพันธ์)
            const requiredTables = [
                'users',
                'groups',
                'group_members',
                'tasks',
                'task_assignees',
                'task_files',
                'files',
                'kpi_records',
                'recurring_tasks'
            ];
            const hasAllRequired = requiredTables.every(t => existingTableNames.includes(t));
            if (!hasAllRequired) {
                const missing = requiredTables.filter(t => !existingTableNames.includes(t));
                console.log('🔄 Missing tables detected, synchronizing schema...', { missing });
                // สร้าง/อัปเดตสคีมาตาม entities ปัจจุบัน
                await exports.AppDataSource.synchronize();
                console.log('✅ Database schema synchronized successfully');
                // ยืนยันอีกครั้งว่าตารางถูกสร้างครบ
                const finalTables = await queryRunner.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name
        `);
                const finalTableNames = finalTables.map((t) => t.table_name);
                const stillMissing = requiredTables.filter(t => !finalTableNames.includes(t));
                if (stillMissing.length > 0) {
                    console.error('❌ Missing required tables after synchronize:', stillMissing);
                    throw new Error(`Failed to create required tables: ${stillMissing.join(', ')}`);
                }
                console.log('✅ All required tables created successfully');
            }
            else {
                console.log('✅ All required database tables already exist');
                // รัน migrations ในทุก environment (ไม่ใช่แค่ development)
                // เพื่อให้มั่นใจว่า schema จะตรงกับ entities
                try {
                    await exports.AppDataSource.runMigrations();
                    console.log('✅ Database migrations completed');
                }
                catch (migrationError) {
                    console.warn('⚠️ Database migrations failed (continuing anyway):', migrationError);
                }
            }
            // ตรวจสอบและเพิ่มคอลัมน์ที่จำเป็นซึ่งอาจยังไม่มีอยู่ (เช่นจากการอัปเดตโครงสร้าง)
            await ensureFilesTableColumns(queryRunner);
            await ensureUsersTableColumns(queryRunner);
            await ensureTasksTableColumns(queryRunner);
        }
        finally {
            await queryRunner.release();
        }
    }
    catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
};
exports.initializeDatabase = initializeDatabase;
const closeDatabase = async () => {
    if (exports.AppDataSource.isInitialized) {
        await exports.AppDataSource.destroy();
        console.log('✅ Database connection closed');
    }
};
exports.closeDatabase = closeDatabase;
/**
 * ตรวจสอบและเพิ่มคอลัมน์ที่จำเป็นให้ตาราง files หากยังไม่มีอยู่
 * - "storageProvider" varchar NULL
 * - "storageKey" varchar NULL
 */
const ensureFilesTableColumns = async (queryRunner) => {
    try {
        // อ่านคอลัมน์ที่มีอยู่ของตาราง files
        const existingColumnsResult = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'files'
    `);
        const existingColumnNames = existingColumnsResult.map((r) => r.column_name);
        const alters = [];
        if (!existingColumnNames.includes('storageProvider')) {
            alters.push('ADD COLUMN "storageProvider" varchar');
        }
        if (!existingColumnNames.includes('storageKey')) {
            alters.push('ADD COLUMN "storageKey" varchar');
        }
        if (alters.length > 0) {
            const alterSql = `ALTER TABLE "files" ${alters.join(', ')}`;
            console.log('🔧 Applying schema update for files:', alterSql);
            await queryRunner.query(alterSql);
            console.log('✅ Files table columns ensured');
        }
        else {
            console.log('✅ Files table already has required columns');
        }
    }
    catch (error) {
        console.error('❌ Failed ensuring files table columns:', error);
        throw error;
    }
};
/**
 * ตรวจสอบและเพิ่มคอลัมน์ที่จำเป็นให้ตาราง users หากยังไม่มีอยู่
 * - "settings" jsonb NOT NULL DEFAULT '{}'
 */
const ensureUsersTableColumns = async (queryRunner) => {
    try {
        const existingColumnsResult = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
        const existingColumnNames = existingColumnsResult.map((r) => r.column_name);
        if (!existingColumnNames.includes('settings')) {
            const alterSql = `ALTER TABLE "users" ADD COLUMN "settings" jsonb NOT NULL DEFAULT '{}'`;
            console.log('🔧 Applying schema update for users:', alterSql);
            await queryRunner.query(alterSql);
            console.log('✅ Users table columns ensured');
        }
        else {
            console.log('✅ Users table already has required columns');
        }
    }
    catch (error) {
        console.error('❌ Failed ensuring users table columns:', error);
        throw error;
    }
};
/**
 * ตรวจสอบและเพิ่มคอลัมน์ที่จำเป็นให้ตาราง tasks หากยังไม่มีอยู่
 * - "googleEventIds" jsonb NOT NULL DEFAULT '{}'
 */
const ensureTasksTableColumns = async (queryRunner) => {
    try {
        const existingColumnsResult = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'tasks'
    `);
        const existingColumnNames = existingColumnsResult.map((r) => r.column_name);
        if (!existingColumnNames.includes('googleEventIds')) {
            const alterSql = `ALTER TABLE "tasks" ADD COLUMN "googleEventIds" jsonb NOT NULL DEFAULT '{}'`;
            console.log('🔧 Applying schema update for tasks:', alterSql);
            await queryRunner.query(alterSql);
            console.log('✅ Tasks table columns ensured');
        }
        else {
            console.log('✅ Tasks table already has required columns');
        }
    }
    catch (error) {
        console.error('❌ Failed ensuring tasks table columns:', error);
        throw error;
    }
};
//# sourceMappingURL=database.js.map