import moment from 'moment-timezone';
/**
 * จัดรูปแบบขนาดไฟล์
 */
export declare const formatFileSize: (bytes: number) => string;
/**
 * ได้เวลาปัจจุบันในรูปแบบ ISO string
 */
export declare const getCurrentTime: () => string;
/**
 * ได้ moment object ที่ตั้งค่า timezone แล้ว
 */
export declare const getMomentWithTimezone: () => moment.Moment;
/**
 * ได้ moment object สำหรับ timezone ที่ระบุ
 */
export declare const getMomentWithCustomTimezone: (timezone: string) => moment.Moment;
/**
 * ตรวจสอบว่าเป็น valid UUID หรือไม่
 */
export declare const isValidUuid: (uuid: string) => boolean;
/**
 * สร้าง random string
 */
export declare const generateRandomString: (length?: number) => string;
/**
 * ตรวจสอบว่าเป็น valid email หรือไม่
 */
export declare const isValidEmail: (email: string) => boolean;
/**
 * แปลง string เป็น boolean
 */
export declare const parseBoolean: (value: string | boolean | undefined) => boolean;
/**
 * จำกัดความยาวของ string
 */
export declare const truncateString: (str: string, maxLength: number) => string;
/**
 * แปลง array เป็น chunks
 */
export declare const chunkArray: <T>(array: T[], chunkSize: number) => T[][];
//# sourceMappingURL=common.d.ts.map