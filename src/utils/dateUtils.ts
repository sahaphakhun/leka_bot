// Date Utilities - จัดการวันที่และเวลา

import moment from 'moment-timezone';
import { config } from './config';
import { logger } from './logger';

// ตั้งค่า timezone เริ่มต้นเป็น Asia/Bangkok สำหรับ moment.js
try {
  moment.tz.setDefault(config.app.defaultTimezone);
  logger.info(`Timezone set to: ${config.app.defaultTimezone}`);
} catch (error) {
  logger.error('Failed to set default timezone:', error);
  // Fallback to hardcoded timezone if config fails
  moment.tz.setDefault('Asia/Bangkok');
}

/**
 * ตรวจสอบว่า timezone ที่ระบุถูกต้องหรือไม่
 */
export const isValidTimezone = (timezone: string): boolean => {
  try {
    moment.tz(new Date(), timezone);
    return moment.tz.zone(timezone) !== null;
  } catch (error) {
    logger.warn(`Invalid timezone: ${timezone}`, error);
    return false;
  }
};

/**
 * ได้ timezone ที่ปลอดภัย (fallback เป็น Asia/Bangkok)
 */
export const getSafeTimezone = (timezone?: string): string => {
  if (!timezone) return config.app.defaultTimezone;
  
  if (isValidTimezone(timezone)) {
    return timezone;
  }
  
  logger.warn(`Invalid timezone ${timezone}, falling back to ${config.app.defaultTimezone}`);
  return config.app.defaultTimezone;
};

/**
 * ได้ moment object ที่ตั้งค่า timezone แล้วอย่างปลอดภัย
 */
export const getCurrentMoment = (timezone?: string) => {
  const safeTimezone = getSafeTimezone(timezone);
  try {
    return moment().tz(safeTimezone);
  } catch (error) {
    logger.error('Error creating moment with timezone:', error);
    return moment().tz(config.app.defaultTimezone);
  }
};

/**
 * ได้ Date object ปัจจุบันในเขตเวลาประเทศไทยอย่างปลอดภัย
 */
export const getCurrentThaiDate = (timezone?: string): Date => {
  try {
    const safeTimezone = getSafeTimezone(timezone);
    return moment().tz(safeTimezone).toDate();
  } catch (error) {
    logger.error('Error getting current Thai date:', error);
    // Ultimate fallback
    return new Date();
  }
};

/**
 * แปลง Date object ใดๆ ให้เป็นเขตเวลาประเทศไทยอย่างปลอดภัย
 */
export const toThaiTimezone = (date: Date | string, timezone?: string): Date => {
  try {
    const safeTimezone = getSafeTimezone(timezone);
    return moment(date).tz(safeTimezone).toDate();
  } catch (error) {
    logger.error('Error converting to Thai timezone:', error);
    // Try to convert input to Date if it's a string
    if (typeof date === 'string') {
      const fallbackDate = new Date(date);
      return isNaN(fallbackDate.getTime()) ? new Date() : fallbackDate;
    }
    return date instanceof Date ? date : new Date();
  }
};

/**
 * ได้เวลาปัจจุบันในรูปแบบ ISO string แต่ในเขตเวลาประเทศไทยอย่างปลอดภัย
 */
export const getCurrentThaiISOString = (timezone?: string): string => {
  try {
    const safeTimezone = getSafeTimezone(timezone);
    return moment().tz(safeTimezone).toISOString();
  } catch (error) {
    logger.error('Error getting current Thai ISO string:', error);
    return new Date().toISOString();
  }
};

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
 * จัดรูปแบบวันที่แบบไทย (รวมปี พ.ศ.)
 */
export const formatThaiDate = (date: Date, timezone: string = config.app.defaultTimezone): string => {
  const dateObj = moment(date).tz(timezone);
  const day = dateObj.format('DD');
  const month = dateObj.format('MM');
  const year = convertToThaiYear(dateObj.year());
  const time = dateObj.format('HH:mm');
  return `${day}/${month}/${year} ${time}`;
};

/**
 * จัดรูปแบบวันที่แบบไทยแบบสั้น (ไม่มีเวลา)
 */
export const formatThaiDateShort = (date: Date, timezone: string = config.app.defaultTimezone): string => {
  const dateObj = moment(date).tz(timezone);
  const day = dateObj.format('DD');
  const month = dateObj.format('MM');
  const year = convertToThaiYear(dateObj.year());
  return `${day}/${month}/${year}`;
};

/**
 * สร้าง Date object ใหม่ในเขตเวลาประเทศไทย
 */
export const createThaiDate = (year?: number, month?: number, day?: number, hour?: number, minute?: number): Date => {
  const now = moment().tz(config.app.defaultTimezone);
  return moment.tz({
    year: year ?? now.year(),
    month: (month ?? now.month() + 1) - 1, // moment uses 0-based months
    day: day ?? now.date(),
    hour: hour ?? 0,
    minute: minute ?? 0,
    second: 0,
    millisecond: 0
  }, config.app.defaultTimezone).toDate();
};

/**
 * แปลงข้อความเป็นวันเวลาในเขตเวลาประเทศไทย
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
 * ได้วันเริ่มต้นของสัปดาห์ในเขตเวลาประเทศไทย
 */
export const getWeekStart = (timezone: string = config.app.defaultTimezone): Date => 
  moment().tz(timezone).startOf('week').toDate();

/**
 * ได้วันสิ้นสุดของสัปดาห์ในเขตเวลาประเทศไทย
 */
export const getWeekEnd = (timezone: string = config.app.defaultTimezone): Date => 
  moment().tz(timezone).endOf('week').toDate();

/**
 * ได้วันเริ่มต้นของเดือนในเขตเวลาประเทศไทย
 */
export const getMonthStart = (timezone: string = config.app.defaultTimezone): Date => 
  moment().tz(timezone).startOf('month').toDate();

/**
 * ได้วันสิ้นสุดของเดือนในเขตเวลาประเทศไทย
 */
export const getMonthEnd = (timezone: string = config.app.defaultTimezone): Date => 
  moment().tz(timezone).endOf('month').toDate();

/**
 * ได้วันเริ่มต้นของวันนี้ในเขตเวลาประเทศไทย
 */
export const getTodayStart = (timezone: string = config.app.defaultTimezone): Date => 
  moment().tz(timezone).startOf('day').toDate();

/**
 * ได้วันสิ้นสุดของวันนี้ในเขตเวลาประเทศไทย
 */
export const getTodayEnd = (timezone: string = config.app.defaultTimezone): Date => 
  moment().tz(timezone).endOf('day').toDate();

/**
 * ตรวจสอบว่างานเกินกำหนดหรือไม่ (เปรียบเทียบในเขตเวลาประเทศไทย)
 */
export const isOverdue = (dueDate: Date, timezone: string = config.app.defaultTimezone): boolean => 
  moment().tz(timezone).isAfter(moment(dueDate).tz(timezone));

/**
 * คำนวณจำนวนชั่วโมงที่เกินกำหนด (ในเขตเวลาประเทศไทย)
 */
export const getOverdueHours = (dueDate: Date, timezone: string = config.app.defaultTimezone): number => 
  moment().tz(timezone).diff(moment(dueDate).tz(timezone), 'hours');

/**
 * คำนวณจำนวนวันที่เหลือ (ในเขตเวลาประเทศไทย)
 */
export const getDaysRemaining = (dueDate: Date, timezone: string = config.app.defaultTimezone): number => 
  moment(dueDate).tz(timezone).diff(moment().tz(timezone), 'days');

/**
 * แปลงเป็นปี พ.ศ.
 */
export const convertToThaiYear = (year: number): number => year + 543;

/**
 * แปลงปี พ.ศ. กลับเป็น ค.ศ.
 */
export const convertFromThaiYear = (thaiYear: number): number => thaiYear - 543;

/**
 * ตรวจสอบว่าวันที่อยู่ในช่วงเวลาทำงานหรือไม่
 */
export const isWorkingHours = (date: Date, timezone: string = config.app.defaultTimezone): boolean => {
  const momentDate = moment(date).tz(timezone);
  const hour = momentDate.hour();
  const startHour = parseInt(config.app.workingHours.start.split(':')[0]);
  const endHour = parseInt(config.app.workingHours.end.split(':')[0]);
  
  return hour >= startHour && hour < endHour;
};

/**
 * ได้วันที่ทำงานถัดไป (ข้ามวันหยุดเสาร์อาทิตย์)
 */
export const getNextWorkingDay = (date: Date, timezone: string = config.app.defaultTimezone): Date => {
  let nextDay = moment(date).tz(timezone).add(1, 'day');
  
  // ข้ามวันเสาร์ (6) และวันอาทิตย์ (0)
  while (nextDay.day() === 0 || nextDay.day() === 6) {
    nextDay = nextDay.add(1, 'day');
  }
  
  return nextDay.toDate();
};

/**
 * คำนวณจำนวนวันทำงานระหว่างสองวันที่
 */
export const getWorkingDaysBetween = (startDate: Date, endDate: Date, timezone: string = config.app.defaultTimezone): number => {
  const start = moment(startDate).tz(timezone);
  const end = moment(endDate).tz(timezone);
  let workingDays = 0;
  
  for (let current = start.clone(); current.isSameOrBefore(end, 'day'); current.add(1, 'day')) {
    // นับเฉพาะวันจันทร์-ศุกร์ (1-5)
    if (current.day() >= 1 && current.day() <= 5) {
      workingDays++;
    }
  }
  
  return workingDays;
};
