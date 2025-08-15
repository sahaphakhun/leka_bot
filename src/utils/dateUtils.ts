// Date Utilities - จัดการวันที่และเวลา

import moment from 'moment-timezone';
import { config } from './config';

/**
 * ได้ moment object ที่ตั้งค่า timezone แล้ว
 */
export const getCurrentMoment = () => moment().tz(config.app.defaultTimezone);

/**
 * จัดรูปแบบวันที่
 */
export const formatDate = (date: Date, format: string = 'DD/MM/YYYY HH:mm'): string => 
  moment(date).tz(config.app.defaultTimezone).format(format);

/**
 * จัดรูปแบบวันที่สำหรับ timezone ที่ระบุ
 */
export const formatDateWithTimezone = (date: Date, timezone: string, format: string = 'DD/MM/YYYY HH:mm'): string => 
  moment(date).tz(timezone).format(format);

/**
 * แปลงข้อความเป็นวันเวลา
 */
export const parseDateTime = (dateStr: string, timezone: string = config.app.defaultTimezone): Date | undefined => {
  try {
    const now = moment().tz(timezone);
    
    // รูปแบบต่างๆ ที่รองรับ
    const formats = [
      'DD/MM/YYYY HH:mm',
      'DD/MM HH:mm',
      'DD/MM/YY HH:mm',
      'DD/MM/YYYY',
      'DD/MM',
      'YYYY-MM-DD HH:mm',
      'YYYY-MM-DD',
      'DD-MM-YYYY HH:mm',
      'DD-MM-YYYY',
      'DD-MM HH:mm',
      'DD-MM',
      'HH:mm'
    ];

    // คำพิเศษ
    const specialDates: { [key: string]: moment.Moment } = {
      'วันนี้': now.clone(),
      'พรุ่งนี้': now.clone().add(1, 'day'),
      'มะรืนนี้': now.clone().add(2, 'days'),
      'สัปดาห์หน้า': now.clone().add(1, 'week'),
      'เดือนหน้า': now.clone().add(1, 'month')
    };

    // ตรวจสอบคำพิเศษ
    for (const [key, date] of Object.entries(specialDates)) {
      if (dateStr.includes(key)) {
        const timeMatch = dateStr.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          date.hour(parseInt(timeMatch[1])).minute(parseInt(timeMatch[2]));
        } else {
          // ถ้าไม่มีเวลาระบุ ใช้ 09:00
          date.hour(9).minute(0);
        }
        return date.toDate();
      }
    }

    // ลองแปลงตามรูปแบบต่างๆ
    for (const format of formats) {
      const strictOk = moment(dateStr, format, true).isValid();
      if (!strictOk) continue;

      const parsed = moment.tz(dateStr, format, timezone);
      
      // ถ้าไม่มีปี ใช้ปีปัจจุบัน
      if (!format.includes('Y')) {
        parsed.year(now.year());
      }
      
      // ถ้าไม่มีเวลา ใช้ 09:00
      if (!format.includes('H')) {
        parsed.hour(9).minute(0);
      }

      return parsed.toDate();
    }

    return undefined;
  } catch (error) {
    console.error('❌ Error parsing date:', error);
    return undefined;
  }
};

/**
 * ได้วันเริ่มต้นของสัปดาห์
 */
export const getWeekStart = (timezone: string = config.app.defaultTimezone): Date => 
  moment().tz(timezone).startOf('week').toDate();

/**
 * ได้วันสิ้นสุดของสัปดาห์
 */
export const getWeekEnd = (timezone: string = config.app.defaultTimezone): Date => 
  moment().tz(timezone).endOf('week').toDate();

/**
 * ได้วันเริ่มต้นของเดือน
 */
export const getMonthStart = (timezone: string = config.app.defaultTimezone): Date => 
  moment().tz(timezone).startOf('month').toDate();

/**
 * ได้วันสิ้นสุดของเดือน
 */
export const getMonthEnd = (timezone: string = config.app.defaultTimezone): Date => 
  moment().tz(timezone).endOf('month').toDate();

/**
 * ได้วันเริ่มต้นของวันนี้
 */
export const getTodayStart = (timezone: string = config.app.defaultTimezone): Date => 
  moment().tz(timezone).startOf('day').toDate();

/**
 * ได้วันสิ้นสุดของวันนี้
 */
export const getTodayEnd = (timezone: string = config.app.defaultTimezone): Date => 
  moment().tz(timezone).endOf('day').toDate();

/**
 * ตรวจสอบว่างานเกินกำหนดหรือไม่
 */
export const isOverdue = (dueDate: Date, timezone: string = config.app.defaultTimezone): boolean => 
  moment().tz(timezone).isAfter(moment(dueDate));

/**
 * คำนวณจำนวนชั่วโมงที่เกินกำหนด
 */
export const getOverdueHours = (dueDate: Date, timezone: string = config.app.defaultTimezone): number => 
  moment().tz(timezone).diff(moment(dueDate), 'hours');

/**
 * คำนวณจำนวนวันที่เหลือ
 */
export const getDaysRemaining = (dueDate: Date, timezone: string = config.app.defaultTimezone): number => 
  moment(dueDate).tz(timezone).diff(moment().tz(timezone), 'days');

/**
 * แปลงเป็นปี พ.ศ.
 */
export const convertToThaiYear = (year: number): number => year + 543;

/**
 * จัดรูปแบบวันที่แบบไทย
 */
export const formatThaiDate = (date: Date, timezone: string = config.app.defaultTimezone): string => {
  const dateObj = moment(date).tz(timezone);
  const day = dateObj.format('DD');
  const month = dateObj.format('MM');
  const year = convertToThaiYear(dateObj.year());
  const time = dateObj.format('HH:mm');
  return `${day}/${month}/${year} ${time}`;
};
