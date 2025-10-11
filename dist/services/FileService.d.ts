import { QueryRunner } from 'typeorm';
import { File } from '@/models';
export declare class FileService {
    private fileRepository;
    private groupRepository;
    private userRepository;
    private lineService;
    constructor();
    /**
     * บันทึกไฟล์ที่อัปโหลดจาก LINE
     */
    saveFile(data: {
        groupId: string;
        uploadedBy: string;
        messageId: string;
        content: Buffer;
        originalName?: string;
        mimeType: string;
        folderStatus?: 'in_progress' | 'completed';
        attachmentType?: 'initial' | 'submission';
    }): Promise<File>;
    /**
     * เพิ่มแท็กให้ไฟล์
     */
    addFileTags(fileId: string, tags: string[]): Promise<File>;
    /**
     * ผูกไฟล์กับงาน
     */
    linkFileToTask(fileId: string, taskId: string, queryRunner?: QueryRunner): Promise<void>;
    /**
     * ยกเลิกการผูกไฟล์กับงาน
     */
    unlinkFileFromTask(fileId: string, taskId: string, queryRunner?: QueryRunner): Promise<void>;
    /**
     * บันทึกไฟล์จาก LINE Message ในแชทส่วนตัว
     */
    saveFileFromLine(message: any, lineUserId: string, context?: string): Promise<File | null>;
    /**
     * ดึงไฟล์ตาม IDs
     */
    getFilesByIds(fileIds: string[]): Promise<File[]>;
    /**
     * ดึงไฟล์ในกลุ่ม
     */
    getGroupFiles(groupId: string, options?: {
        tags?: string[];
        mimeType?: string;
        uploadedBy?: string;
        startDate?: Date;
        endDate?: Date;
        search?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        files: (File & {
            taskNames?: string[];
        })[];
        total: number;
    }>;
    /**
     * กรองรายการไฟล์ให้เหลือเฉพาะไฟล์ที่ยังอยู่จริงบนดิสก์
     */
    filterExistingFiles(files: File[]): Promise<File[]>;
    /**
     * ดึงไฟล์ที่ผูกกับงาน
     */
    getTaskFiles(taskId: string): Promise<File[]>;
    /**
     * ดึงไฟล์ที่ผูกกับงานแยกตามประเภท
     */
    getTaskFilesByType(taskId: string): Promise<{
        initialFiles: File[];
        submissionFiles: File[];
        allFiles: File[];
    }>;
    /**
     * ดึงข้อมูลไฟล์
     */
    getFileInfo(fileId: string): Promise<File | null>;
    /**
     * ดาวน์โหลดไฟล์
     */
    getFileContent(fileId: string): Promise<{
        content: Buffer;
        mimeType: string;
        originalName: string;
    }>;
    /**
     * ดาวน์โหลดไฟล์จาก URL พร้อม retry logic และ timeout
     */
    private downloadRemoteFile;
    /**
     * สร้าง URL สำหรับเข้าถึงไฟล์ โดยเซ็นชื่อให้ Cloudinary หากจำเป็น
     */
    resolveFileUrl(file: File): string;
    /**
     * สร้างลายเซ็นสำหรับ Cloudinary URL เพื่อหลีกเลี่ยงปัญหา 401
     */
    private signCloudinaryUrl;
    /**
     * สกัดข้อมูล Cloudinary จาก path/record เพื่อใช้สร้างลิงก์ดาวน์โหลดแบบ private
     */
    private buildCloudinaryInfo;
    /**
     * สร้าง URL ดาวน์โหลดแบบ private ของ Cloudinary สำหรับกรณี 401
     */
    private getCloudinaryPrivateDownloadUrl;
    private inferFormatFromMime;
    /**
     * ปรับชื่อไฟล์ขาเข้าให้เป็น UTF-8 และเติมนามสกุลให้เหมาะสม
     */
    private normalizeIncomingFilename;
    /**
     * ลบไฟล์
     */
    deleteFile(fileId: string): Promise<void>;
    /**
     * สถิติไฟล์ในกลุ่ม
     */
    getGroupFileStats(groupId: string): Promise<{
        totalFiles: number;
        totalSize: number;
        fileTypes: {
            [mimeType: string]: number;
        };
        recentFiles: number;
    }>;
    /**
     * ทำความสะอาดไฟล์เก่า
     */
    cleanupOldFiles(daysOld?: number): Promise<number>;
    /**
     * ตรวจสอบว่าไฟล์อยู่ในกลุ่มที่ระบุหรือไม่
     */
    isFileInGroup(fileId: string, groupId: string): Promise<boolean>;
    /**
     * สร้าง URL สำหรับดาวน์โหลดไฟล์
     */
    generateDownloadUrl(groupId: string, fileId: string): string;
    /**
     * สร้าง URL ดาวน์โหลดโดยตรงสำหรับผู้ให้บริการภายนอก (เช่น Cloudinary)
     * - หากเป็น Cloudinary จะพยายามสร้างลิงก์แบบ private download (แนบ header attachment)
     * - หากมี path เป็น URL ปกติ จะคืน URL นั้น
     * - หากเป็นไฟล์โลคอล จะคืนค่าว่างเพื่อให้ controller ตัดสินใจสตรีมเอง
     */
    getDirectDownloadUrl(file: File): string;
    /**
     * สร้างชื่อไฟล์สำหรับดาวน์โหลดให้มีนามสกุลเสมอ
     */
    private ensureFilenameWithExtension;
    /**
     * คืนชื่อไฟล์สำหรับดาวน์โหลดที่ปลอดภัยและมีนามสกุลเสมอ (ไม่ใส่ path)
     */
    getSafeDownloadFilename(file: File): string;
    /**
     * ซ่อมแซมชื่อไฟล์เก่าในฐานข้อมูล: แก้ percent-encoding/mojibake และเติมนามสกุลที่หายไป
     * @param apply ถ้า true จะบันทึกการเปลี่ยนแปลงลงฐานข้อมูล (default: false → dry-run)
     */
    repairFilenamesInDb(apply?: boolean): Promise<{
        scanned: number;
        updated: number;
        samples: Array<{
            id: string;
            beforeOriginalName?: string;
            afterOriginalName?: string;
            beforeFileName?: string;
            afterFileName?: string;
        }>;
    }>;
    /**
     * สร้าง URL สำหรับแสดงตัวอย่างไฟล์
     */
    generatePreviewUrl(groupId: string, fileId: string): string;
    /**
     * ตรวจสอบประเภทไฟล์และสร้าง extension
     */
    private getFileExtension;
    /**
     * สร้างชื่อไฟล์ที่ปลอดภัยจากข้อมูล LINE
     */
    private generateSafeFileName;
    /**
     * แปลง LINE Group ID → internal UUID ถ้าเป็นไปได้
     */
    private resolveInternalGroupId;
}
//# sourceMappingURL=FileService.d.ts.map