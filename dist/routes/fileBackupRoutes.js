"use strict";
// File Backup Routes - จัดการ API routes สำหรับการคัดลอกไฟล์แนบ
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fileBackupController_1 = require("@/controllers/fileBackupController");
const router = (0, express_1.Router)();
const fileBackupController = new fileBackupController_1.FileBackupController();
// ทดสอบการเชื่อมต่อ Google Drive (ไม่ต้องใช้ authentication)
router.get('/test-connection', fileBackupController.testConnection.bind(fileBackupController));
router.get('/test-connection/details', fileBackupController.debugConnection.bind(fileBackupController));
// คัดลอกไฟล์แนบของงานเฉพาะ (ไม่ต้องใช้ authentication)
router.post('/tasks/:taskId/backup', fileBackupController.backupTaskAttachments.bind(fileBackupController));
// คัดลอกไฟล์แนบของกลุ่มทั้งหมด (ไม่ต้องใช้ authentication)
router.post('/groups/:groupId/backup', fileBackupController.backupGroupAttachments.bind(fileBackupController));
// คัดลอกไฟล์แนบทั้งหมดในระบบ (ไม่ต้องใช้ authentication)
router.post('/backup-all', fileBackupController.backupAllAttachments.bind(fileBackupController));
// คัดลอกไฟล์แนบตามช่วงวันที่ (ไม่ต้องใช้ authentication)
router.post('/groups/:groupId/backup-by-date-range', fileBackupController.backupByDateRange.bind(fileBackupController));
// คัดลอกไฟล์แนบตามประเภท (ไม่ต้องใช้ authentication)
router.post('/groups/:groupId/backup-by-type', fileBackupController.backupByType.bind(fileBackupController));
// ดึงสถิติการคัดลอกไฟล์แนบ (ไม่ต้องใช้ authentication)
router.get('/stats', fileBackupController.getBackupStats.bind(fileBackupController));
// เรียกใช้การคัดลอกไฟล์แนบตามกำหนดเวลา (ไม่ต้องใช้ authentication)
router.post('/run-scheduled', fileBackupController.runScheduledBackups.bind(fileBackupController));
// ตรวจสอบและทำความสะอาดไฟล์ที่หายไปจาก Cloudinary (ไม่ต้องใช้ authentication)
router.post('/cleanup-missing-files/:groupId?', fileBackupController.cleanupMissingFiles.bind(fileBackupController));
exports.default = router;
//# sourceMappingURL=fileBackupRoutes.js.map