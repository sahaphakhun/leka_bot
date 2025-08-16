// Auto-Migration Utility
// รันอัตโนมัติเมื่อ server เริ่มเพื่อเพิ่มคอลัมน์ที่หายไป

import { AppDataSource } from './database';
import { logger } from './logger';

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

      // รัน migration
      await this.migrateMissingColumns();
      
      logger.info('✅ Auto-Migration เสร็จสิ้น');
      
    } catch (error) {
      logger.error('❌ Auto-Migration ล้มเหลว:', error);
      // ไม่ throw error เพื่อไม่ให้ server หยุดทำงาน
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * เพิ่มคอลัมน์ที่หายไปในตาราง tasks
   */
  private async migrateMissingColumns(): Promise<void> {
    try {
      const queryRunner = AppDataSource.createQueryRunner();
      
      try {
        // ตรวจสอบคอลัมน์ที่มีอยู่ในตาราง tasks
        const existingColumns = await queryRunner.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'tasks' 
          AND table_schema = 'public'
          ORDER BY ordinal_position
        `);
        
        const columnNames = existingColumns.map((col: any) => col.column_name);
        logger.info(`📋 พบคอลัมน์ในตาราง tasks: ${columnNames.length} คอลัมน์`);
        
        // ตรวจสอบคอลัมน์ที่หายไป
        const missingColumns = [
          {
            name: 'submittedAt',
            type: 'TIMESTAMP',
            nullable: true,
            comment: 'เวลาส่งงาน'
          },
          {
            name: 'reviewedAt',
            type: 'TIMESTAMP',
            nullable: true,
            comment: 'เวลาตรวจสอบ'
          },
          {
            name: 'approvedAt',
            type: 'TIMESTAMP',
            nullable: true,
            comment: 'เวลาอนุมัติ'
          },
          {
            name: 'requireAttachment',
            type: 'BOOLEAN',
            nullable: false,
            defaultValue: 'false',
            comment: 'บังคับให้ต้องมีไฟล์แนบเมื่อส่งงาน'
          },
          {
            name: 'workflow',
            type: 'JSONB',
            nullable: false,
            defaultValue: '{}',
            comment: 'ข้อมูลเวิร์กโฟลว์การส่งงาน/ตรวจงาน/อนุมัติ'
          }
        ];
        
        let addedCount = 0;
        
        for (const column of missingColumns) {
          if (!columnNames.includes(column.name)) {
            try {
              let sql = `ALTER TABLE tasks ADD COLUMN "${column.name}" ${column.type}`;
              
              if (column.nullable === false) {
                sql += ' NOT NULL';
              }
              
              if (column.defaultValue) {
                sql += ` DEFAULT ${column.defaultValue}`;
              }
              
              await queryRunner.query(sql);
              
              // เพิ่ม comment
              await queryRunner.query(`
                COMMENT ON COLUMN tasks."${column.name}" IS '${column.comment}'
              `);
              
              logger.info(`✅ เพิ่มคอลัมน์ ${column.name} สำเร็จ`);
              addedCount++;
              
            } catch (error) {
              logger.error(`❌ ไม่สามารถเพิ่มคอลัมน์ ${column.name}:`, error);
              // ยังคงดำเนินการต่อแม้คอลัมน์นี้จะล้มเหลว
            }
          } else {
            logger.info(`ℹ️ คอลัมน์ ${column.name} มีอยู่แล้ว`);
          }
        }
        
        // อัปเดตข้อมูลในคอลัมน์ workflow สำหรับงานที่มีอยู่
        if (columnNames.includes('workflow') || addedCount > 0) {
          await this.initializeWorkflowData(queryRunner);
        }
        
        if (addedCount > 0) {
          logger.info(`🎉 เพิ่มคอลัมน์แล้ว ${addedCount} คอลัมน์`);
        } else {
          logger.info('ℹ️ ไม่มีคอลัมน์ใหม่ที่ต้องเพิ่ม');
        }
        
      } finally {
        await queryRunner.release();
      }
      
    } catch (error) {
      logger.error('❌ เกิดข้อผิดพลาดในการ migration:', error);
      throw error;
    }
  }

  /**
   * เริ่มต้นข้อมูล workflow สำหรับงานที่มีอยู่
   */
  private async initializeWorkflowData(queryRunner: any): Promise<void> {
    try {
      logger.info('🔄 เริ่มต้นข้อมูล workflow สำหรับงานที่มีอยู่...');
      
      const tasks = await queryRunner.query('SELECT id, "createdBy", "createdAt", status FROM tasks');
      logger.info(`📋 พบงานทั้งหมด ${tasks.length} งาน`);
      
      let updatedCount = 0;
      
      for (const task of tasks) {
        try {
          // ตรวจสอบว่ามี workflow หรือไม่
          const existingWorkflow = await queryRunner.query(`
            SELECT workflow FROM tasks WHERE id = $1
          `, [task.id]);
          
          if (!existingWorkflow[0]?.workflow || existingWorkflow[0].workflow === '{}') {
            // สร้าง workflow เริ่มต้น
            const workflow = {
              review: {
                reviewerUserId: task.createdBy,
                status: 'not_requested'
              },
              approval: {
                creatorUserId: task.createdBy,
                status: 'not_requested'
              },
              history: [
                {
                  action: 'create',
                  byUserId: task.createdBy,
                  at: task.createdAt,
                  note: 'งานถูกสร้าง'
                }
              ]
            };
            
            // อัปเดตสถานะตามข้อมูลที่มีอยู่
            if (task.status === 'completed') {
              workflow.review.status = 'approved';
              workflow.approval.status = 'approved';
            }
            
            await queryRunner.query(`
              UPDATE tasks 
              SET workflow = $1::jsonb 
              WHERE id = $2
            `, [JSON.stringify(workflow), task.id]);
            
            updatedCount++;
          }
          
        } catch (error) {
          logger.error(`❌ ไม่สามารถอัปเดต workflow สำหรับงาน ${task.id}:`, error);
        }
      }
      
      if (updatedCount > 0) {
        logger.info(`✅ อัปเดต workflow แล้ว ${updatedCount} งาน`);
      } else {
        logger.info('ℹ️ ไม่มีงานที่ต้องอัปเดต workflow');
      }
      
    } catch (error) {
      logger.error('❌ เกิดข้อผิดพลาดในการเริ่มต้น workflow:', error);
    }
  }

  /**
   * ตรวจสอบว่าจำเป็นต้องรัน migration หรือไม่
   */
  public async checkMigrationNeeded(): Promise<boolean> {
    try {
      if (!AppDataSource.isInitialized) {
        return false;
      }

      const queryRunner = AppDataSource.createQueryRunner();
      
      try {
        const existingColumns = await queryRunner.query(`
          SELECT column_name
          FROM information_schema.columns 
          WHERE table_name = 'tasks' 
          AND table_schema = 'public'
        `);
        
        const columnNames = existingColumns.map((col: any) => col.column_name);
        const requiredColumns = ['submittedAt', 'reviewedAt', 'approvedAt', 'requireAttachment', 'workflow'];
        
        return requiredColumns.some(col => !columnNames.includes(col));
        
      } finally {
        await queryRunner.release();
      }
      
    } catch (error) {
      logger.error('❌ ไม่สามารถตรวจสอบ migration:', error);
      return false;
    }
  }
}

export const autoMigration = AutoMigration.getInstance();
