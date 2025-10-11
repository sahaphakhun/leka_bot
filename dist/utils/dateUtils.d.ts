import moment from 'moment-timezone';
/**
 * ตรวจสอบว่า timezone ที่ระบุถูกต้องหรือไม่
 */
export declare const isValidTimezone: (timezone: string) => boolean;
/**
 * ได้ timezone ที่ปลอดภัย (fallback เป็น Asia/Bangkok)
 */
export declare const getSafeTimezone: (timezone?: string) => string;
/**
 * ได้ moment object ที่ตั้งค่า timezone แล้วอย่างปลอดภัย
 */
export declare const getCurrentMoment: (timezone?: string) => moment.Moment;
/**
 * ได้ Date object ปัจจุบันในเขตเวลาประเทศไทยอย่างปลอดภัย
 */
export declare const getCurrentThaiDate: (timezone?: string) => Date;
/**
 * แปลง Date object ใดๆ ให้เป็นเขตเวลาประเทศไทยอย่างปลอดภัย
 */
export declare const toThaiTimezone: (date: Date | string, timezone?: string) => Date;
/**
 * ได้เวลาปัจจุบันในรูปแบบ ISO string แต่ในเขตเวลาประเทศไทยอย่างปลอดภัย
 */
export declare const getCurrentThaiISOString: (timezone?: string) => string;
/**
 * จัดรูปแบบวันที่
 */
export declare const formatDate: (date: Date, format?: string) => string;
/**
 * จัดรูปแบบวันที่สำหรับ timezone ที่ระบุ
 */
export declare const formatDateWithTimezone: (date: Date, timezone: string, format?: string) => string;
/**
 * จัดรูปแบบวันที่แบบไทย (รวมปี พ.ศ.)
 */
export declare const formatThaiDate: (date: Date, timezone?: string) => string;
/**
 * จัดรูปแบบวันที่แบบไทยแบบสั้น (ไม่มีเวลา)
 */
export declare const formatThaiDateShort: (date: Date, timezone?: string) => string;
/**
 * สร้าง Date object ใหม่ในเขตเวลาประเทศไทย
 */
export declare const createThaiDate: (year?: number, month?: number, day?: number, hour?: number, minute?: number) => Date;
/**
 * แปลงข้อความเป็นวันเวลาในเขตเวลาประเทศไทย
 */
export declare const parseDateTime: (dateStr: string, timezone?: string) => Date | undefined;
/**
 * ได้วันเริ่มต้นของสัปดาห์ในเขตเวลาประเทศไทย
 */
export declare const getWeekStart: (timezone?: string) => Date;
/**
 * ได้วันสิ้นสุดของสัปดาห์ในเขตเวลาประเทศไทย
 */
export declare const getWeekEnd: (timezone?: string) => Date;
/**
 * ได้วันเริ่มต้นของเดือนในเขตเวลาประเทศไทย
 */
export declare const getMonthStart: (timezone?: string) => Date;
/**
 * ได้วันสิ้นสุดของเดือนในเขตเวลาประเทศไทย
 */
export declare const getMonthEnd: (timezone?: string) => Date;
/**
 * ได้วันเริ่มต้นของวันนี้ในเขตเวลาประเทศไทย
 */
export declare const getTodayStart: (timezone?: string) => Date;
/**
 * ได้วันสิ้นสุดของวันนี้ในเขตเวลาประเทศไทย
 */
export declare const getTodayEnd: (timezone?: string) => Date;
/**
 * ตรวจสอบว่างานเกินกำหนดหรือไม่ (เปรียบเทียบในเขตเวลาประเทศไทย)
 */
export declare const isOverdue: (dueDate: Date, timezone?: string) => boolean;
/**
 * คำนวณจำนวนชั่วโมงที่เกินกำหนด (ในเขตเวลาประเทศไทย)
 */
export declare const getOverdueHours: (dueDate: Date, timezone?: string) => number;
/**
 * คำนวณจำนวนวันที่เหลือ (ในเขตเวลาประเทศไทย)
 */
export declare const getDaysRemaining: (dueDate: Date, timezone?: string) => number;
/**
 * แปลงเป็นปี พ.ศ.
 */
export declare const convertToThaiYear: (year: number) => number;
/**
 * แปลงปี พ.ศ. กลับเป็น ค.ศ.
 */
export declare const convertFromThaiYear: (thaiYear: number) => number;
/**
 * ตรวจสอบว่าวันที่อยู่ในช่วงเวลาทำงานหรือไม่
 */
export declare const isWorkingHours: (date: Date, timezone?: string) => boolean;
/**
 * ได้วันที่ทำงานถัดไป (ข้ามวันหยุดเสาร์อาทิตย์)
 */
export declare const getNextWorkingDay: (date: Date, timezone?: string) => Date;
/**
 * คำนวณจำนวนวันทำงานระหว่างสองวันที่
 */
export declare const getWorkingDaysBetween: (startDate: Date, endDate: Date, timezone?: string) => number;
//# sourceMappingURL=dateUtils.d.ts.map