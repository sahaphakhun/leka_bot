import { FlexMessage } from '@line/bot-sdk';
export declare class FlexMessageTemplateService {
    /**
     * สร้างการ์ดงานใหม่ (เวอร์ชันเรียบง่าย)
     */
    static createNewTaskCard(task: any, group: any, creator: any, dueDate: string): FlexMessage;
    /**
     * สร้างการ์ดงานเกินกำหนด
     */
    static createOverdueTaskCard(task: any, group: any, overdueHours: number): FlexMessage;
    /**
     * สร้างการ์ดงานสำเร็จ
     */
    static createCompletedTaskCard(task: any, group: any, completedBy: any): FlexMessage;
    /**
     * สร้างการ์ดงานที่อัปเดต
     */
    static createUpdatedTaskCard(task: any, group: any, changes: Record<string, any>, changedFields: string[], viewerLineUserId?: string): FlexMessage;
    /**
     * สร้างการ์ดงานที่ถูกลบ
     */
    static createDeletedTaskCard(task: any, group: any, viewerLineUserId?: string): FlexMessage;
    /**
     * สร้างการ์ดงานที่ถูกส่ง
     */
    static createSubmittedTaskCard(task: any, group: any, submitterDisplayName: string, fileCount: number, links: string[], viewerLineUserId?: string): FlexMessage;
    /**
     * สร้างการ์ดขอตรวจงาน
     */
    static createReviewRequestCard(task: any, group: any, details: any, dueText: string, viewerLineUserId?: string): FlexMessage;
    /**
     * สร้างการ์ดขออนุมัติการปิดงาน (มาตรฐานใหม่)
     */
    static createApprovalRequestCard(task: any, group: any, reviewer: any, viewerLineUserId?: string): FlexMessage;
    /**
     * สร้างการ์ดงานที่ถูกตีกลับ (มาตรฐานใหม่)
     */
    static createRejectedTaskCard(task: any, group: any, newDueTime: Date, reviewerDisplayName?: string, viewerLineUserId?: string): FlexMessage;
    /**
     * สร้างการ์ดการอนุมัติเลื่อนเวลา (มาตรฐานใหม่)
     */
    static createExtensionApprovedCard(task: any, group: any, newDueTime: Date, requesterDisplayName?: string, viewerLineUserId?: string): FlexMessage;
    /**
     * สร้างการ์ดการปฏิเสธเลื่อนเวลา (มาตรฐานใหม่)
     */
    static createExtensionRejectedCard(task: any, group: any, requesterDisplayName?: string, viewerLineUserId?: string): FlexMessage;
    /**
     * สร้างการ์ดรายงานรายวัน
     */
    static createDailySummaryCard(group: any, tasks: any[], timezone: string, viewerLineUserId?: string): FlexMessage;
    /**
     * สร้างการ์ดรายงานส่วนบุคคล
     */
    static createPersonalReportCard(assignee: any, tasks: any[], timezone: string, group?: any): FlexMessage;
    /**
     * สร้างการ์ดแสดงไฟล์แนบในแชท
     */
    static createFileAttachmentCard(task: any, group: any, assignee: any): FlexMessage;
    /**
     * สร้างการ์ดแสดงไฟล์แนบในแชท
     */
    static createFileDisplayCard(file: any, group: any): FlexMessage;
    /**
     * สร้างการ์ดแสดงรายการไฟล์แนบของงานแยกตามประเภท
     */
    static createTaskFilesCategorizedCard(task: any, filesByType: {
        initialFiles: any[];
        submissionFiles: any[];
        allFiles: any[];
    }, group: any, viewerLineUserId?: string): FlexMessage;
    /**
     * สร้างการ์ดแสดงรายการไฟล์แนบของงาน (เดิม - สำหรับ backward compatibility)
     */
    static createTaskFilesCard(task: any, files: any[], group: any, viewerLineUserId?: string): FlexMessage;
    /**
     * สร้างการ์ดยืนยันการส่งงานพร้อมไฟล์
     */
    static createSubmitConfirmationCard(task: any, group: any, fileCount: number, fileNames: string[]): FlexMessage;
    private static getCompletionSummary;
    /**
     * ตรวจสอบว่าไฟล์สามารถแสดงตัวอย่างได้หรือไม่
     */
    private static isPreviewable;
    /**
     * ได้ไอคอนไฟล์ตาม MIME type
     */
    private static getFileIcon;
    /**
     * จัดรูปแบบขนาดไฟล์
     */
    private static formatFileSize;
    /**
     * สร้างการ์ดแสดงรายการไฟล์ในแชทส่วนตัว (มาตรฐานใหม่)
     */
    static createPersonalFileListCard(files: any[], user: any, taskId?: string): FlexMessage;
    /**
     * สร้างการ์ดแสดงงานที่ต้องส่งพร้อมไฟล์ที่แนบได้ (มาตรฐานใหม่)
     */
    static createPersonalTaskWithFilesCard(task: any, files: any[], user: any): FlexMessage;
    /**
     * สร้างการ์ดแสดงรายการงานที่ต้องส่ง (มาตรฐานใหม่)
     */
    static createPersonalTaskListCard(tasks: any[], files: any[], user: any): FlexMessage;
    /**
     * สร้างการ์ดงานส่วนตัวทั้งหมด (รวมงานที่เกินกำหนด) - มาตรฐานใหม่
     */
    static createAllPersonalTasksCard(tasks: any[], files: any[], user: any, overdueTasks?: any[]): FlexMessage;
    /**
     * สร้างการ์ดยืนยันการส่งงาน (มาตรฐานใหม่) - เปลี่ยนเป็นเปิดเว็บ
     */
    static createTaskSubmissionConfirmationCard(task: any, files: any[], user: any): FlexMessage;
    /**
     * สร้างการ์ดยืนยันการส่งงานแบบมาตรฐาน (สำหรับงานที่ถูกตีกลับ) - เปลี่ยนเป็นเปิดเว็บ
     */
    static createStandardTaskSubmissionCard(task: any, files: any[], user: any): FlexMessage;
    /**
     * สร้างการ์ดยืนยันการส่งงานสำเร็จ
     */
    static createSubmissionSuccessCard(task: any, fileCount: number, user: any): FlexMessage;
    /**
     * สร้างการ์ดแสดง Flow การส่งงานที่ชัดเจน - เปลี่ยนเป็นเปิดเว็บ
     */
    static createTaskSubmissionFlowCard(user: any): FlexMessage;
}
//# sourceMappingURL=FlexMessageTemplateService.d.ts.map