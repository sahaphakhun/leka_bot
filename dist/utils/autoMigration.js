"use strict";
// Auto-Migration Utility
// รันอัตโนมัติเมื่อ server เริ่มเพื่อเพิ่มคอลัมน์ที่หายไป
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoMigration = exports.AutoMigration = void 0;
const database_1 = require("./database");
const logger_1 = require("./logger");
const comprehensiveMigration_1 = require("./comprehensiveMigration");
class AutoMigration {
    constructor() {
        this.isRunning = false;
    }
    static getInstance() {
        if (!AutoMigration.instance) {
            AutoMigration.instance = new AutoMigration();
        }
        return AutoMigration.instance;
    }
    /**
     * รัน auto-migration เมื่อ server เริ่ม
     */
    async runAutoMigration() {
        if (this.isRunning) {
            logger_1.logger.info('🔄 Auto-migration กำลังทำงานอยู่...');
            return;
        }
        this.isRunning = true;
        try {
            logger_1.logger.info('🚀 เริ่มต้น Auto-Migration...');
            // ตรวจสอบว่าฐานข้อมูลพร้อมใช้งานหรือไม่
            if (!database_1.AppDataSource.isInitialized) {
                logger_1.logger.info('⏳ รอให้ฐานข้อมูลพร้อมใช้งาน...');
                return;
            }
            // Use comprehensive migration system
            await comprehensiveMigration_1.comprehensiveMigration.runComprehensiveMigration();
            logger_1.logger.info('✅ Auto-Migration เสร็จสิ้น');
        }
        catch (error) {
            logger_1.logger.error('❌ Auto-Migration ล้มเหลว:', error);
            // ไม่ throw error เพื่อไม่ให้ server หยุดทำงาน
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * ตรวจสอบว่าจำเป็นต้องรัน migration หรือไม่
     */
    async checkMigrationNeeded() {
        try {
            return await comprehensiveMigration_1.comprehensiveMigration.checkMigrationNeeded();
        }
        catch (error) {
            logger_1.logger.error('❌ ไม่สามารถตรวจสอบ migration:', error);
            return false;
        }
    }
    /**
     * Get migration results for API endpoint
     */
    getMigrationResults() {
        return comprehensiveMigration_1.comprehensiveMigration.getMigrationResults();
    }
    // ... existing code ...
    // Legacy methods for backward compatibility
    // These are kept for any direct calls but delegate to comprehensive migration
    /**
     * @deprecated Use comprehensiveMigration instead
     */
    async migrateMissingColumns() {
        logger_1.logger.info('ℹ️ Legacy migrateMissingColumns called - delegating to comprehensive migration');
        // This is now handled by comprehensive migration
    }
    /**
     * @deprecated Use comprehensiveMigration instead
     */
    async migrateFileAttachmentType() {
        logger_1.logger.info('ℹ️ Legacy migrateFileAttachmentType called - delegating to comprehensive migration');
        // This is now handled by comprehensive migration
    }
    /**
     * @deprecated Use comprehensiveMigration instead
     */
    async initializeWorkflowData(queryRunner) {
        logger_1.logger.info('ℹ️ Legacy initializeWorkflowData called - delegating to comprehensive migration');
        // This is now handled by comprehensive migration
    }
}
exports.AutoMigration = AutoMigration;
exports.autoMigration = AutoMigration.getInstance();
//# sourceMappingURL=autoMigration.js.map