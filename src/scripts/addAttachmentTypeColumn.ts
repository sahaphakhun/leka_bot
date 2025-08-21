#!/usr/bin/env ts-node

import { DataSource } from 'typeorm';
import { config } from '../utils/config';
import { logger } from '../utils/logger';

async function addAttachmentTypeColumn() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: config.database.url,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    const queryRunner = dataSource.createQueryRunner();
    
    try {
      // ตรวจสอบว่าคอลัมน์มีอยู่แล้วหรือไม่
      const columnExists = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'files' 
        AND column_name = 'attachmentType'
      `);

      if (columnExists.length > 0) {
        console.log('✅ Column attachmentType already exists');
        return;
      }

      console.log('🔄 Adding attachmentType column to files table...');
      
      // เพิ่มคอลัมน์ attachmentType
      await queryRunner.query(`
        ALTER TABLE files 
        ADD COLUMN "attachmentType" character varying 
        CHECK ("attachmentType" IN ('initial', 'submission'))
      `);

      console.log('✅ Successfully added attachmentType column');

      // อัปเดตไฟล์เก่าให้เป็น 'initial' (สมมติว่าเป็นไฟล์เริ่มต้น)
      const updateResult = await queryRunner.query(`
        UPDATE files 
        SET "attachmentType" = 'initial' 
        WHERE "attachmentType" IS NULL 
        AND id IN (
          SELECT DISTINCT file_id 
          FROM task_files 
          WHERE task_id IN (
            SELECT id FROM tasks 
            WHERE "createdAt" < NOW() - INTERVAL '1 day'
          )
        )
      `);

      console.log(`✅ Updated ${updateResult.affectedRows || 0} existing files to 'initial' type`);

    } finally {
      await queryRunner.release();
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('✅ Database connection closed');
  }
}

// รันถ้าเรียกไฟล์นี้โดยตรง
if (require.main === module) {
  addAttachmentTypeColumn()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { addAttachmentTypeColumn };
