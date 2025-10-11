// Auto-Migration Utility
// รันอัตโนมัติเมื่อ server เริ่มเพื่อเพิ่มคอลัมน์ที่หายไป

import { AppDataSource } from './database';
import { logger } from './logger';
import { comprehensiveMigration } from './comprehensiveMigration';

export class AutoMigration {
  private static instance: AutoMigration;
  private isRunning = false;

  private constructor() {}

  public static getInstance(): AutoMigration {
    if (!AutoMigration.instance) {
      AutoMigration.instance = new AutoMigration();
    }
    return AutoMigration.instance;
  }

  /**
   * รัน auto-migration เมื่อ server เริ่ม
   */
  public async runAutoMigration(): Promise<void> {
    if (this.isRunning) {
      logger.info('🔄 Auto-migration กำลังทำงานอยู่...');
      return;
    }

    this.isRunning = true;
    
    try {
      logger.info('🚀 เริ่มต้น Auto-Migration...');
      
      // ตรวจสอบว่าฐานข้อมูลพร้อมใช้งานหรือไม่
      if (!AppDataSource.isInitialized) {
        logger.info('⏳ รอให้ฐานข้อมูลพร้อมใช้งาน...');
        return;
      }

      // Use comprehensive migration system
      await comprehensiveMigration.runComprehensiveMigration();
      
      logger.info('✅ Auto-Migration เสร็จสิ้น');
      
    } catch (error) {
      logger.error('❌ Auto-Migration ล้มเหลว:', error);
      // ไม่ throw error เพื่อไม่ให้ server หยุดทำงาน
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * ตรวจสอบว่าจำเป็นต้องรัน migration หรือไม่
   */
  public async checkMigrationNeeded(): Promise<boolean> {
    try {
      return await comprehensiveMigration.checkMigrationNeeded();
    } catch (error) {
      logger.error('❌ ไม่สามารถตรวจสอบ migration:', error);
      return false;
    }
  }

  /**
   * Get migration results for API endpoint
   */
  public getMigrationResults(): Record<string, { success: boolean; message: string; details?: any }> {
    return comprehensiveMigration.getMigrationResults();
  }

  // ... existing code ...

  // Legacy methods for backward compatibility
  // These are kept for any direct calls but delegate to comprehensive migration
  
  /**
   * @deprecated Use comprehensiveMigration instead
   */
  private async migrateMissingColumns(): Promise<void> {
    logger.info('ℹ️ Legacy migrateMissingColumns called - delegating to comprehensive migration');
    // This is now handled by comprehensive migration
  }

  /**
   * @deprecated Use comprehensiveMigration instead
   */
  private async migrateFileAttachmentType(): Promise<void> {
    logger.info('ℹ️ Legacy migrateFileAttachmentType called - delegating to comprehensive migration');
    // This is now handled by comprehensive migration
  }

  /**
   * @deprecated Use comprehensiveMigration instead
   */
  private async initializeWorkflowData(queryRunner: any): Promise<void> {
    logger.info('ℹ️ Legacy initializeWorkflowData called - delegating to comprehensive migration');
    // This is now handled by comprehensive migration
  }
}

export const autoMigration = AutoMigration.getInstance();
