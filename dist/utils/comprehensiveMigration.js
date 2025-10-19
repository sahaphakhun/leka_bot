"use strict";
// Comprehensive Auto-Migration System
// Runs automatically during deployment to ensure all data is properly handled and consistent
Object.defineProperty(exports, "__esModule", { value: true });
exports.comprehensiveMigration = exports.ComprehensiveMigration = void 0;
const database_1 = require("./database");
const logger_1 = require("./logger");
const models_1 = require("@/models");
class ComprehensiveMigration {
    constructor() {
        this.isRunning = false;
        this.migrationResults = {};
    }
    static getInstance() {
        if (!ComprehensiveMigration.instance) {
            ComprehensiveMigration.instance = new ComprehensiveMigration();
        }
        return ComprehensiveMigration.instance;
    }
    /**
     * Main migration runner - executes all migration steps
     */
    async runComprehensiveMigration() {
        if (this.isRunning) {
            logger_1.logger.info("🔄 Comprehensive migration already running...");
            return;
        }
        this.isRunning = true;
        this.migrationResults = {};
        try {
            logger_1.logger.info("🚀 Starting Comprehensive Auto-Migration...");
            logger_1.logger.info("==========================================");
            // Initialize database connection if not already initialized
            if (!database_1.AppDataSource.isInitialized) {
                logger_1.logger.info("⏳ Database not initialized yet, initializing...");
                try {
                    await database_1.AppDataSource.initialize();
                    logger_1.logger.info("✅ Database initialized successfully");
                }
                catch (error) {
                    logger_1.logger.error("❌ Failed to initialize database:", error);
                    throw error;
                }
            }
            // Migration steps in order of execution
            const migrationSteps = [
                {
                    name: "validateDatabaseSchema",
                    description: "Validate and fix database schema",
                },
                {
                    name: "addMissingColumns",
                    description: "Add missing columns to tables",
                },
                {
                    name: "fixEnumValues",
                    description: "Fix enum values and constraints",
                },
                {
                    name: "migrateTaskWorkflow",
                    description: "Initialize task workflow data",
                },
                { name: "fixUserData", description: "Fix user data inconsistencies" },
                { name: "fixGroupData", description: "Fix group data inconsistencies" },
                {
                    name: "fixTaskAssignments",
                    description: "Fix task assignment relationships",
                },
                {
                    name: "fixFileAttachments",
                    description: "Fix file attachment relationships",
                },
                { name: "fixKPIRecords", description: "Fix KPI record foreign keys" },
                {
                    name: "updateTaskStatuses",
                    description: "Update task statuses based on workflow",
                },
                { name: "cleanupOrphanedData", description: "Clean up orphaned data" },
                {
                    name: "validateDataIntegrity",
                    description: "Final data integrity validation",
                },
            ];
            let successCount = 0;
            let failureCount = 0;
            // Execute each migration step
            for (const step of migrationSteps) {
                try {
                    logger_1.logger.info(`\n➡️  ${step.description}...`);
                    await this.executeStep(step.name);
                    logger_1.logger.info(`✅ ${step.description} completed successfully`);
                    successCount++;
                }
                catch (error) {
                    logger_1.logger.error(`❌ ${step.description} failed:`, error);
                    this.migrationResults[step.name] = {
                        success: false,
                        message: error instanceof Error ? error.message : "Unknown error",
                        details: error,
                    };
                    failureCount++;
                    // Continue with other steps instead of stopping
                    logger_1.logger.warn(`⚠️ Continuing with remaining migration steps...`);
                }
            }
            // Report results
            logger_1.logger.info("\n==========================================");
            logger_1.logger.info("📊 MIGRATION RESULTS SUMMARY");
            logger_1.logger.info("==========================================");
            logger_1.logger.info(`✅ Successful steps: ${successCount}`);
            logger_1.logger.info(`❌ Failed steps: ${failureCount}`);
            if (failureCount > 0) {
                logger_1.logger.warn("⚠️ Some migration steps failed. System may have reduced functionality.");
                logger_1.logger.info("📋 Failed steps details:");
                Object.entries(this.migrationResults).forEach(([step, result]) => {
                    if (!result.success) {
                        logger_1.logger.warn(`  - ${step}: ${result.message}`);
                    }
                });
            }
            else {
                logger_1.logger.info("🎉 All migration steps completed successfully!");
            }
            logger_1.logger.info("==========================================");
        }
        catch (error) {
            logger_1.logger.error("❌ Critical migration error:", error);
            throw error;
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Execute a specific migration step
     */
    async executeStep(stepName) {
        const methodName = stepName;
        if (typeof this[methodName] === "function") {
            await this[methodName].call(this);
            this.migrationResults[stepName] = {
                success: true,
                message: "Completed successfully",
            };
        }
        else {
            throw new Error(`Migration step ${stepName} not implemented`);
        }
    }
    /**
     * Validate and fix database schema
     */
    async validateDatabaseSchema() {
        const queryRunner = database_1.AppDataSource.createQueryRunner();
        try {
            // Check if all required tables exist
            const tables = await queryRunner.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      `);
            const tableNames = tables.map((t) => t.table_name);
            const requiredTables = [
                "users",
                "groups",
                "group_members",
                "tasks",
                "files",
                "kpi_records",
                "task_assignees",
                "task_files",
                "recurring_tasks",
            ];
            const missingTables = requiredTables.filter((table) => !tableNames.includes(table));
            if (missingTables.length > 0) {
                logger_1.logger.warn(`⚠️ Missing tables: ${missingTables.join(", ")}`);
                // Tables should be created by TypeORM synchronization
                await database_1.AppDataSource.synchronize();
                logger_1.logger.info("✅ Database synchronized");
            }
            logger_1.logger.info(`✅ Database schema validation passed. Found ${tableNames.length} tables.`);
        }
        finally {
            await queryRunner.release();
        }
    }
    /**
     * Add missing columns to tables
     */
    async addMissingColumns() {
        const queryRunner = database_1.AppDataSource.createQueryRunner();
        try {
            // Tasks table missing columns
            const taskColumns = await this.getTableColumns(queryRunner, "tasks");
            const requiredTaskColumns = [
                { name: "submittedAt", type: "TIMESTAMP", nullable: true },
                { name: "reviewedAt", type: "TIMESTAMP", nullable: true },
                { name: "approvedAt", type: "TIMESTAMP", nullable: true },
                {
                    name: "requireAttachment",
                    type: "BOOLEAN",
                    nullable: false,
                    default: "false",
                },
                { name: "workflow", type: "JSONB", nullable: false, default: "{}" },
                { name: "recurringTaskId", type: "UUID", nullable: true },
                { name: "recurringInstance", type: "INTEGER", nullable: true },
            ];
            await this.addMissingColumnsToTable(queryRunner, "tasks", taskColumns, requiredTaskColumns);
            // Files table missing columns
            const fileColumns = await this.getTableColumns(queryRunner, "files");
            const requiredFileColumns = [
                {
                    name: "attachmentType",
                    type: "VARCHAR",
                    nullable: true,
                    constraint: "CHECK (\"attachmentType\" IN ('initial', 'submission'))",
                },
                { name: "storageProvider", type: "VARCHAR", nullable: true },
                { name: "storageKey", type: "VARCHAR", nullable: true },
            ];
            await this.addMissingColumnsToTable(queryRunner, "files", fileColumns, requiredFileColumns);
            // Groups table missing columns
            const groupColumns = await this.getTableColumns(queryRunner, "groups");
            const requiredGroupColumns = [
                { name: "settings", type: "JSONB", nullable: false, default: "{}" },
                {
                    name: "timezone",
                    type: "VARCHAR",
                    nullable: true,
                    default: "'Asia/Bangkok'",
                },
            ];
            await this.addMissingColumnsToTable(queryRunner, "groups", groupColumns, requiredGroupColumns);
            // Recurring tasks table missing columns
            const recurringTaskColumns = await this.getTableColumns(queryRunner, "recurring_tasks");
            const requiredRecurringTaskColumns = [
                {
                    name: "durationDays",
                    type: "INTEGER",
                    nullable: false,
                    default: "7",
                },
                {
                    name: "totalInstances",
                    type: "INTEGER",
                    nullable: false,
                    default: "0",
                },
            ];
            await this.addMissingColumnsToTable(queryRunner, "recurring_tasks", recurringTaskColumns, requiredRecurringTaskColumns);
            // KPI records table new columns
            const kpiColumns = await this.getTableColumns(queryRunner, "kpi_records");
            const requiredKpiColumns = [
                { name: "role", type: "VARCHAR", nullable: true },
                { name: "metadata", type: "JSONB", nullable: true },
            ];
            await this.addMissingColumnsToTable(queryRunner, "kpi_records", kpiColumns, requiredKpiColumns);
        }
        finally {
            await queryRunner.release();
        }
    }
    /**
     * Helper method to get table columns
     */
    async getTableColumns(queryRunner, tableName) {
        const columns = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = 'public'
    `, [tableName]);
        return columns.map((col) => col.column_name);
    }
    /**
     * Helper method to add missing columns to a table
     */
    async addMissingColumnsToTable(queryRunner, tableName, existingColumns, requiredColumns) {
        let addedCount = 0;
        for (const column of requiredColumns) {
            if (!existingColumns.includes(column.name)) {
                try {
                    let sql = `ALTER TABLE ${tableName} ADD COLUMN "${column.name}" ${column.type}`;
                    if (!column.nullable) {
                        sql += " NOT NULL";
                    }
                    if (column.default) {
                        sql += ` DEFAULT ${column.default}`;
                    }
                    await queryRunner.query(sql);
                    // Add constraint if specified
                    if (column.constraint) {
                        await queryRunner.query(`ALTER TABLE ${tableName} ADD ${column.constraint}`);
                    }
                    logger_1.logger.info(`✅ Added column ${tableName}.${column.name}`);
                    addedCount++;
                }
                catch (error) {
                    logger_1.logger.warn(`⚠️ Failed to add column ${tableName}.${column.name}:`, error);
                }
            }
        }
        if (addedCount === 0) {
            logger_1.logger.info(`ℹ️ No missing columns in ${tableName} table`);
        }
        else {
            logger_1.logger.info(`✅ Added ${addedCount} missing columns to ${tableName} table`);
        }
    }
    /**
     * Fix enum values and constraints
     */
    async fixEnumValues() {
        const queryRunner = database_1.AppDataSource.createQueryRunner();
        try {
            // Check and fix task status enum
            const taskStatusEnum = await queryRunner.query(`
        SELECT enumlabel
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'tasks_status_enum'
      `);
            const existingStatuses = taskStatusEnum.map((e) => e.enumlabel);
            const requiredStatuses = [
                "pending",
                "in_progress",
                "submitted",
                "reviewed",
                "approved",
                "completed",
                "rejected",
                "cancelled",
                "overdue",
            ];
            const missingStatuses = requiredStatuses.filter((status) => !existingStatuses.includes(status));
            for (const status of missingStatuses) {
                try {
                    await queryRunner.query(`ALTER TYPE tasks_status_enum ADD VALUE '${status}'`);
                    logger_1.logger.info(`✅ Added task status enum value: ${status}`);
                }
                catch (error) {
                    logger_1.logger.warn(`⚠️ Failed to add task status enum value ${status}:`, error);
                }
            }
            logger_1.logger.info(`✅ Task status enum validation completed`);
            // Ensure KPI enum has all new scoring types before migrating values
            const kpiEnumValues = await queryRunner.query(`
        SELECT enumlabel
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'kpi_records_type_enum'
      `);
            if (kpiEnumValues.length > 0) {
                const existingKpiTypes = kpiEnumValues.map((e) => e.enumlabel);
                const requiredKpiTypes = [
                    "assignee_early",
                    "assignee_ontime",
                    "assignee_late",
                    "creator_completion",
                    "creator_ontime_bonus",
                    "streak_bonus",
                    "penalty_overdue",
                ];
                for (const kpiType of requiredKpiTypes) {
                    if (!existingKpiTypes.includes(kpiType)) {
                        try {
                            await queryRunner.query(`ALTER TYPE kpi_records_type_enum ADD VALUE '${kpiType}'`);
                            logger_1.logger.info(`✅ Added KPI enum value: ${kpiType}`);
                        }
                        catch (error) {
                            logger_1.logger.warn(`⚠️ Failed to add KPI enum value ${kpiType}:`, error);
                        }
                    }
                }
            }
            else {
                logger_1.logger.info("ℹ️ KPI record type column is not an enum, skipping enum value adjustments");
            }
            // Map legacy KPI record typesสู่รูปแบบใหม่และเติม role/metadata
            const legacyTypeMappings = [
                { from: "early", to: "assignee_early" },
                { from: "ontime", to: "assignee_ontime" },
                { from: "late", to: "assignee_late" },
                { from: "overtime", to: "assignee_late" },
                { from: "overdue", to: "penalty_overdue" },
                { from: "approval", to: "creator_completion" },
                { from: "review", to: "creator_ontime_bonus" },
            ];
            for (const mapping of legacyTypeMappings) {
                try {
                    await queryRunner.query(`UPDATE kpi_records
             SET type = $1::kpi_records_type_enum
             WHERE type::text = $2`, [mapping.to, mapping.from]);
                }
                catch (error) {
                    logger_1.logger.warn(`⚠️ Failed to remap KPI record type from ${mapping.from} to ${mapping.to}:`, error);
                }
            }
            await queryRunner.query(`
        UPDATE kpi_records
        SET role =
          CASE
            WHEN type IN ('assignee_early', 'assignee_ontime', 'assignee_late') THEN 'assignee'
            WHEN type IN ('creator_completion', 'creator_ontime_bonus') THEN 'creator'
            WHEN type = 'streak_bonus' THEN 'bonus'
            WHEN type = 'penalty_overdue' THEN 'penalty'
            ELSE COALESCE(role, 'assignee')
          END,
          metadata = CASE
            WHEN metadata IS NULL THEN '{}'::jsonb
            ELSE metadata
          END
        WHERE role IS NULL OR metadata IS NULL;
      `);
            logger_1.logger.info("✅ KPI record legacy type migration completed");
        }
        finally {
            await queryRunner.release();
        }
    }
    /**
     * Initialize task workflow data for existing tasks
     */
    async migrateTaskWorkflow() {
        const taskRepository = database_1.AppDataSource.getRepository(models_1.Task);
        const tasks = await taskRepository.find({
            select: ["id", "createdBy", "createdAt", "status", "workflow"],
        });
        let updatedCount = 0;
        for (const task of tasks) {
            try {
                if (!task.workflow || Object.keys(task.workflow).length === 0) {
                    const workflow = {
                        review: {
                            reviewerUserId: task.createdBy,
                            status: "not_requested",
                        },
                        approval: {
                            creatorUserId: task.createdBy,
                            status: "not_requested",
                        },
                        history: [
                            {
                                action: "create",
                                byUserId: task.createdBy,
                                at: task.createdAt,
                                note: "Task created",
                            },
                        ],
                    };
                    // Update workflow status based on current task status
                    if (["completed", "approved"].includes(task.status)) {
                        workflow.review.status = "approved";
                        workflow.approval.status = "approved";
                    }
                    else if (["reviewed", "submitted"].includes(task.status)) {
                        workflow.review.status = "approved";
                    }
                    await taskRepository.update(task.id, {
                        workflow: workflow, // Use any type to avoid complex type checking
                    });
                    updatedCount++;
                }
            }
            catch (error) {
                logger_1.logger.warn(`⚠️ Failed to update workflow for task ${task.id}:`, error);
            }
        }
        logger_1.logger.info(`✅ Updated workflow for ${updatedCount} tasks`);
    }
    /**
     * Fix user data inconsistencies
     */
    async fixUserData() {
        const userRepository = database_1.AppDataSource.getRepository(models_1.User);
        // Fix users with missing required fields
        const users = await userRepository.find();
        let fixedCount = 0;
        for (const user of users) {
            const updates = {};
            if (!user.displayName || user.displayName.trim() === "") {
                updates.displayName = `User ${user.lineUserId?.substring(0, 8) || user.id.substring(0, 8)}`;
            }
            if (!user.timezone) {
                updates.timezone = "Asia/Bangkok";
            }
            // Fix display names that are placeholders
            const placeholderNames = [
                "ไม่ทราบ",
                "ผู้ใช้ไม่ทราบชื่อ",
                "",
                "Unknown User",
            ];
            if (placeholderNames.includes(user.displayName)) {
                updates.displayName = `User ${user.lineUserId?.substring(0, 8) || user.id.substring(0, 8)}`;
            }
            if (Object.keys(updates).length > 0) {
                await userRepository.update(user.id, updates);
                fixedCount++;
                logger_1.logger.info(`✅ Fixed user data for ${user.id}: ${JSON.stringify(updates)}`);
            }
        }
        logger_1.logger.info(`✅ Fixed data for ${fixedCount} users`);
    }
    /**
     * Fix group data inconsistencies
     */
    async fixGroupData() {
        const groupRepository = database_1.AppDataSource.getRepository(models_1.Group);
        const groups = await groupRepository.find();
        let fixedCount = 0;
        for (const group of groups) {
            const updates = {};
            if (!group.settings || Object.keys(group.settings).length === 0) {
                updates.settings = {
                    reminderIntervals: ["24h", "2h"],
                    enableLeaderboard: true,
                    defaultReminders: ["24h", "2h"],
                    workingHours: {
                        start: "09:00",
                        end: "17:00",
                    },
                };
            }
            if (!group.timezone) {
                updates.timezone = "Asia/Bangkok";
            }
            if (Object.keys(updates).length > 0) {
                await groupRepository.update(group.id, updates);
                fixedCount++;
                logger_1.logger.info(`✅ Fixed group data for ${group.id}: ${group.name}`);
            }
        }
        logger_1.logger.info(`✅ Fixed data for ${fixedCount} groups`);
    }
    /**
     * Fix task assignment relationships
     */
    async fixTaskAssignments() {
        const queryRunner = database_1.AppDataSource.createQueryRunner();
        try {
            // Find and fix orphaned task assignments
            const orphanedAssignments = await queryRunner.query(`
        SELECT ta.*
        FROM task_assignees ta
        LEFT JOIN tasks t ON ta."taskId" = t.id
        LEFT JOIN users u ON ta."userId" = u.id
        WHERE t.id IS NULL OR u.id IS NULL
      `);
            if (orphanedAssignments.length > 0) {
                logger_1.logger.warn(`⚠️ Found ${orphanedAssignments.length} orphaned task assignments`);
                // Remove orphaned assignments
                await queryRunner.query(`
          DELETE FROM task_assignees
          WHERE ("taskId" NOT IN (SELECT id FROM tasks))
             OR ("userId" NOT IN (SELECT id FROM users))
        `);
                logger_1.logger.info(`✅ Removed ${orphanedAssignments.length} orphaned task assignments`);
            }
            // Ensure tasks have at least one assignee (assign to creator if no assignees)
            const tasksWithoutAssignees = await queryRunner.query(`
        SELECT t.id, t.title, t."createdBy"
        FROM tasks t
        LEFT JOIN task_assignees ta ON t.id = ta."taskId"
        WHERE ta."taskId" IS NULL
      `);
            for (const task of tasksWithoutAssignees) {
                try {
                    await queryRunner.query(`
            INSERT INTO task_assignees ("taskId", "userId")
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `, [task.id, task.createdBy]);
                    logger_1.logger.info(`✅ Assigned task ${task.id} to creator ${task.createdBy}`);
                }
                catch (error) {
                    logger_1.logger.warn(`⚠️ Failed to assign task ${task.id} to creator:`, error);
                }
            }
            logger_1.logger.info(`✅ Task assignment relationships validated`);
        }
        finally {
            await queryRunner.release();
        }
    }
    /**
     * Fix file attachment relationships
     */
    async fixFileAttachments() {
        const fileRepository = database_1.AppDataSource.getRepository(models_1.File);
        // Set default attachmentType for files without one
        const result = await fileRepository
            .createQueryBuilder()
            .update(models_1.File)
            .set({ attachmentType: "initial" })
            .where("attachmentType IS NULL")
            .execute();
        if (result.affected && result.affected > 0) {
            logger_1.logger.info(`✅ Set default attachmentType for ${result.affected} files`);
        }
        // Clean up orphaned file attachments
        const queryRunner = database_1.AppDataSource.createQueryRunner();
        try {
            await queryRunner.query(`
        DELETE FROM task_files
        WHERE ("taskId" NOT IN (SELECT id FROM tasks))
           OR ("fileId" NOT IN (SELECT id FROM files))
      `);
            logger_1.logger.info(`✅ File attachment relationships validated`);
        }
        finally {
            await queryRunner.release();
        }
    }
    /**
     * Fix KPI record foreign keys
     */
    async fixKPIRecords() {
        const queryRunner = database_1.AppDataSource.createQueryRunner();
        try {
            // Remove KPI records with invalid foreign keys
            const orphanedKPIs = await queryRunner.query(`
        SELECT k.id
        FROM kpi_records k
        LEFT JOIN users u ON k."userId" = u.id
        LEFT JOIN groups g ON k."groupId" = g.id
        LEFT JOIN tasks t ON k."taskId" = t.id
        WHERE u.id IS NULL OR g.id IS NULL OR (k."taskId" IS NOT NULL AND t.id IS NULL)
      `);
            if (orphanedKPIs.length > 0) {
                await queryRunner.query(`
          DELETE FROM kpi_records
          WHERE ("userId" NOT IN (SELECT id FROM users))
             OR ("groupId" NOT IN (SELECT id FROM groups))
             OR ("taskId" IS NOT NULL AND "taskId" NOT IN (SELECT id FROM tasks))
        `);
                logger_1.logger.info(`✅ Removed ${orphanedKPIs.length} orphaned KPI records`);
            }
            logger_1.logger.info(`✅ KPI record foreign keys validated`);
        }
        finally {
            await queryRunner.release();
        }
    }
    /**
     * Update task statuses based on workflow
     */
    async updateTaskStatuses() {
        const taskRepository = database_1.AppDataSource.getRepository(models_1.Task);
        const tasks = await taskRepository.find({
            select: ["id", "status", "workflow", "dueTime"],
        });
        let updatedCount = 0;
        const now = new Date();
        for (const task of tasks) {
            try {
                let newStatus = task.status;
                // Check if task is overdue
                if (task.dueTime < now &&
                    ["pending", "in_progress"].includes(task.status)) {
                    newStatus = "overdue";
                }
                // Check workflow status
                if (task.workflow) {
                    const workflow = task.workflow;
                    if (workflow.approval?.status === "approved") {
                        newStatus = "completed";
                    }
                    else if (workflow.review?.status === "approved" &&
                        task.status === "submitted") {
                        newStatus = "reviewed";
                    }
                }
                if (newStatus !== task.status) {
                    await taskRepository.update(task.id, { status: newStatus });
                    updatedCount++;
                    logger_1.logger.info(`✅ Updated task ${task.id} status: ${task.status} → ${newStatus}`);
                }
            }
            catch (error) {
                logger_1.logger.warn(`⚠️ Failed to update status for task ${task.id}:`, error);
            }
        }
        logger_1.logger.info(`✅ Updated status for ${updatedCount} tasks`);
    }
    /**
     * Clean up orphaned data
     */
    async cleanupOrphanedData() {
        const queryRunner = database_1.AppDataSource.createQueryRunner();
        try {
            // Clean up orphaned group memberships
            await queryRunner.query(`
        DELETE FROM group_members
        WHERE ("userId" NOT IN (SELECT id FROM users))
           OR ("groupId" NOT IN (SELECT id FROM groups))
      `);
            logger_1.logger.info(`✅ Cleaned up orphaned group memberships`);
        }
        finally {
            await queryRunner.release();
        }
    }
    /**
     * Final data integrity validation
     */
    async validateDataIntegrity() {
        const queryRunner = database_1.AppDataSource.createQueryRunner();
        try {
            // Count records in each table
            const userCount = await queryRunner.query("SELECT COUNT(*) as count FROM users");
            const groupCount = await queryRunner.query("SELECT COUNT(*) as count FROM groups");
            const taskCount = await queryRunner.query("SELECT COUNT(*) as count FROM tasks");
            const fileCount = await queryRunner.query("SELECT COUNT(*) as count FROM files");
            logger_1.logger.info("📊 Data integrity validation results:");
            logger_1.logger.info(`   Users: ${userCount[0].count}`);
            logger_1.logger.info(`   Groups: ${groupCount[0].count}`);
            logger_1.logger.info(`   Tasks: ${taskCount[0].count}`);
            logger_1.logger.info(`   Files: ${fileCount[0].count}`);
            // Check for critical data issues
            const tasksWithoutCreator = await queryRunner.query(`
        SELECT COUNT(*) as count
        FROM tasks t
        LEFT JOIN users u ON t."createdBy" = u.id
        WHERE u.id IS NULL
      `);
            if (parseInt(tasksWithoutCreator[0].count) > 0) {
                logger_1.logger.warn(`⚠️ Found ${tasksWithoutCreator[0].count} tasks without valid creator`);
            }
            logger_1.logger.info("✅ Data integrity validation completed");
        }
        finally {
            await queryRunner.release();
        }
    }
    /**
     * Check if migration is needed
     */
    async checkMigrationNeeded() {
        try {
            if (!database_1.AppDataSource.isInitialized) {
                return false;
            }
            const queryRunner = database_1.AppDataSource.createQueryRunner();
            try {
                // Check if all required tables exist
                const tables = await queryRunner.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        `);
                const tableNames = tables.map((t) => t.table_name);
                const requiredTables = [
                    "users",
                    "groups",
                    "group_members",
                    "tasks",
                    "files",
                    "kpi_records",
                    "task_assignees",
                    "task_files",
                    "recurring_tasks",
                ];
                const missingTables = requiredTables.filter((table) => !tableNames.includes(table));
                if (missingTables.length > 0) {
                    logger_1.logger.info(`📋 Missing tables detected: ${missingTables.join(", ")} - migration needed`);
                    return true;
                }
                // Check for missing columns
                const taskColumns = await this.getTableColumns(queryRunner, "tasks");
                const requiredTaskColumns = [
                    "submittedAt",
                    "reviewedAt",
                    "approvedAt",
                    "requireAttachment",
                    "workflow",
                ];
                const tasksMissingColumns = requiredTaskColumns.some((col) => !taskColumns.includes(col));
                const fileColumns = await this.getTableColumns(queryRunner, "files");
                const filesMissingAttachmentType = !fileColumns.includes("attachmentType");
                const recurringTaskColumns = await this.getTableColumns(queryRunner, "recurring_tasks");
                const recurringTasksMissingDurationDays = !recurringTaskColumns.includes("durationDays");
                const recurringTasksMissingTotalInstances = !recurringTaskColumns.includes("totalInstances");
                const kpiColumns = await this.getTableColumns(queryRunner, "kpi_records");
                const kpiMissingRoleColumn = !kpiColumns.includes("role");
                const kpiMissingMetadataColumn = !kpiColumns.includes("metadata");
                let legacyKpiTypesCount = 0;
                let kpiRowsMissingRole = 0;
                if (!kpiMissingRoleColumn) {
                    const legacyTypesResult = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM kpi_records
            WHERE type::text IN ('early','ontime','late','overtime','overdue','approval','review')
          `);
                    legacyKpiTypesCount = parseInt(legacyTypesResult[0].count || "0");
                    const missingRoleResult = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM kpi_records
            WHERE role IS NULL
          `);
                    kpiRowsMissingRole = parseInt(missingRoleResult[0].count || "0");
                }
                // Check for orphaned data
                const orphanedAssignments = await queryRunner.query(`
          SELECT COUNT(*) as count
          FROM task_assignees ta
          LEFT JOIN tasks t ON ta."taskId" = t.id
          LEFT JOIN users u ON ta."userId" = u.id
          WHERE t.id IS NULL OR u.id IS NULL
        `);
                const hasOrphanedData = parseInt(orphanedAssignments[0].count) > 0;
                // Check for tasks without workflow
                const tasksWithoutWorkflow = await queryRunner.query(`
          SELECT COUNT(*) as count
          FROM tasks
          WHERE workflow IS NULL OR workflow = '{}'::jsonb
        `);
                const hasTasksWithoutWorkflow = parseInt(tasksWithoutWorkflow[0].count) > 0;
                const migrationNeeded = tasksMissingColumns ||
                    filesMissingAttachmentType ||
                    recurringTasksMissingDurationDays ||
                    recurringTasksMissingTotalInstances ||
                    kpiMissingRoleColumn ||
                    kpiMissingMetadataColumn ||
                    legacyKpiTypesCount > 0 ||
                    kpiRowsMissingRole > 0 ||
                    hasOrphanedData ||
                    hasTasksWithoutWorkflow;
                if (migrationNeeded) {
                    logger_1.logger.info("📋 Migration needed due to missing columns or data issues");
                }
                else {
                    logger_1.logger.info("✅ All tables and columns exist, no migration needed");
                }
                return migrationNeeded;
            }
            finally {
                await queryRunner.release();
            }
        }
        catch (error) {
            logger_1.logger.error("❌ Failed to check migration status:", error);
            return false;
        }
    }
    /**
     * Get migration results summary
     */
    getMigrationResults() {
        return { ...this.migrationResults };
    }
}
exports.ComprehensiveMigration = ComprehensiveMigration;
exports.comprehensiveMigration = ComprehensiveMigration.getInstance();
//# sourceMappingURL=comprehensiveMigration.js.map