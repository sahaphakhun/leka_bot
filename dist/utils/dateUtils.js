"use strict";
// Date Utilities - จัดการวันที่และเวลา
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkingDaysBetween = exports.getNextWorkingDay = exports.isWorkingHours = exports.convertFromThaiYear = exports.convertToThaiYear = exports.getDaysRemaining = exports.getOverdueHours = exports.isOverdue = exports.getTodayEnd = exports.getTodayStart = exports.getMonthEnd = exports.getMonthStart = exports.getWeekEnd = exports.getWeekStart = exports.parseDateTime = exports.createThaiDate = exports.formatThaiDateShort = exports.formatThaiDate = exports.formatDateWithTimezone = exports.formatDate = exports.getCurrentThaiISOString = exports.toThaiTimezone = exports.getCurrentThaiDate = exports.getCurrentMoment = exports.getSafeTimezone = exports.isValidTimezone = void 0;
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const config_1 = require("./config");
const logger_1 = require("./logger");
// ตั้งค่า timezone เริ่มต้นเป็น Asia/Bangkok สำหรับ moment.js
try {
    moment_timezone_1.default.tz.setDefault(config_1.config.app.defaultTimezone);
    logger_1.logger.info(`Timezone set to: ${config_1.config.app.defaultTimezone}`);
}
catch (error) {
    logger_1.logger.error('Failed to set default timezone:', error);
    // Fallback to hardcoded timezone if config fails
    moment_timezone_1.default.tz.setDefault('Asia/Bangkok');
}
/**
 * ตรวจสอบว่า timezone ที่ระบุถูกต้องหรือไม่
 */
const isValidTimezone = (timezone) => {
    try {
        moment_timezone_1.default.tz(new Date(), timezone);
        return moment_timezone_1.default.tz.zone(timezone) !== null;
    }
    catch (error) {
        logger_1.logger.warn(`Invalid timezone: ${timezone}`, error);
        return false;
    }
};
exports.isValidTimezone = isValidTimezone;
/**
 * ได้ timezone ที่ปลอดภัย (fallback เป็น Asia/Bangkok)
 */
const getSafeTimezone = (timezone) => {
    if (!timezone)
        return config_1.config.app.defaultTimezone;
    if ((0, exports.isValidTimezone)(timezone)) {
        return timezone;
    }
    logger_1.logger.warn(`Invalid timezone ${timezone}, falling back to ${config_1.config.app.defaultTimezone}`);
    return config_1.config.app.defaultTimezone;
};
exports.getSafeTimezone = getSafeTimezone;
/**
 * ได้ moment object ที่ตั้งค่า timezone แล้วอย่างปลอดภัย
 */
const getCurrentMoment = (timezone) => {
    const safeTimezone = (0, exports.getSafeTimezone)(timezone);
    try {
        return (0, moment_timezone_1.default)().tz(safeTimezone);
    }
    catch (error) {
        logger_1.logger.error('Error creating moment with timezone:', error);
        return (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone);
    }
};
exports.getCurrentMoment = getCurrentMoment;
/**
 * ได้ Date object ปัจจุบันในเขตเวลาประเทศไทยอย่างปลอดภัย
 */
const getCurrentThaiDate = (timezone) => {
    try {
        const safeTimezone = (0, exports.getSafeTimezone)(timezone);
        return (0, moment_timezone_1.default)().tz(safeTimezone).toDate();
    }
    catch (error) {
        logger_1.logger.error('Error getting current Thai date:', error);
        // Ultimate fallback
        return new Date();
    }
};
exports.getCurrentThaiDate = getCurrentThaiDate;
/**
 * แปลง Date object ใดๆ ให้เป็นเขตเวลาประเทศไทยอย่างปลอดภัย
 */
const toThaiTimezone = (date, timezone) => {
    try {
        const safeTimezone = (0, exports.getSafeTimezone)(timezone);
        return (0, moment_timezone_1.default)(date).tz(safeTimezone).toDate();
    }
    catch (error) {
        logger_1.logger.error('Error converting to Thai timezone:', error);
        // Try to convert input to Date if it's a string
        if (typeof date === 'string') {
            const fallbackDate = new Date(date);
            return isNaN(fallbackDate.getTime()) ? new Date() : fallbackDate;
        }
        return date instanceof Date ? date : new Date();
    }
};
exports.toThaiTimezone = toThaiTimezone;
/**
 * ได้เวลาปัจจุบันในรูปแบบ ISO string แต่ในเขตเวลาประเทศไทยอย่างปลอดภัย
 */
const getCurrentThaiISOString = (timezone) => {
    try {
        const safeTimezone = (0, exports.getSafeTimezone)(timezone);
        return (0, moment_timezone_1.default)().tz(safeTimezone).toISOString();
    }
    catch (error) {
        logger_1.logger.error('Error getting current Thai ISO string:', error);
        return new Date().toISOString();
    }
};
exports.getCurrentThaiISOString = getCurrentThaiISOString;
/**
 * จัดรูปแบบวันที่
 */
const formatDate = (date, format = 'DD/MM/YYYY HH:mm') => (0, moment_timezone_1.default)(date).tz(config_1.config.app.defaultTimezone).format(format);
exports.formatDate = formatDate;
/**
 * จัดรูปแบบวันที่สำหรับ timezone ที่ระบุ
 */
const formatDateWithTimezone = (date, timezone, format = 'DD/MM/YYYY HH:mm') => (0, moment_timezone_1.default)(date).tz(timezone).format(format);
exports.formatDateWithTimezone = formatDateWithTimezone;
/**
 * จัดรูปแบบวันที่แบบไทย (รวมปี พ.ศ.)
 */
const formatThaiDate = (date, timezone = config_1.config.app.defaultTimezone) => {
    const dateObj = (0, moment_timezone_1.default)(date).tz(timezone);
    const day = dateObj.format('DD');
    const month = dateObj.format('MM');
    const year = (0, exports.convertToThaiYear)(dateObj.year());
    const time = dateObj.format('HH:mm');
    return `${day}/${month}/${year} ${time}`;
};
exports.formatThaiDate = formatThaiDate;
/**
 * จัดรูปแบบวันที่แบบไทยแบบสั้น (ไม่มีเวลา)
 */
const formatThaiDateShort = (date, timezone = config_1.config.app.defaultTimezone) => {
    const dateObj = (0, moment_timezone_1.default)(date).tz(timezone);
    const day = dateObj.format('DD');
    const month = dateObj.format('MM');
    const year = (0, exports.convertToThaiYear)(dateObj.year());
    return `${day}/${month}/${year}`;
};
exports.formatThaiDateShort = formatThaiDateShort;
/**
 * สร้าง Date object ใหม่ในเขตเวลาประเทศไทย
 */
const createThaiDate = (year, month, day, hour, minute) => {
    const now = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone);
    return moment_timezone_1.default.tz({
        year: year ?? now.year(),
        month: (month ?? now.month() + 1) - 1, // moment uses 0-based months
        day: day ?? now.date(),
        hour: hour ?? 0,
        minute: minute ?? 0,
        second: 0,
        millisecond: 0
    }, config_1.config.app.defaultTimezone).toDate();
};
exports.createThaiDate = createThaiDate;
/**
 * แปลงข้อความเป็นวันเวลาในเขตเวลาประเทศไทย
 */
const parseDateTime = (dateStr, timezone = config_1.config.app.defaultTimezone) => {
    try {
        const now = (0, moment_timezone_1.default)().tz(timezone);
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
        const specialDates = {
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
                }
                else {
                    // ถ้าไม่มีเวลาระบุ ใช้ 09:00
                    date.hour(9).minute(0);
                }
                return date.toDate();
            }
        }
        // ลองแปลงตามรูปแบบต่างๆ
        for (const format of formats) {
            const strictOk = (0, moment_timezone_1.default)(dateStr, format, true).isValid();
            if (!strictOk)
                continue;
            const parsed = moment_timezone_1.default.tz(dateStr, format, timezone);
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
    }
    catch (error) {
        console.error('❌ Error parsing date:', error);
        return undefined;
    }
};
exports.parseDateTime = parseDateTime;
/**
 * ได้วันเริ่มต้นของสัปดาห์ในเขตเวลาประเทศไทย
 */
const getWeekStart = (timezone = config_1.config.app.defaultTimezone) => (0, moment_timezone_1.default)().tz(timezone).startOf('week').toDate();
exports.getWeekStart = getWeekStart;
/**
 * ได้วันสิ้นสุดของสัปดาห์ในเขตเวลาประเทศไทย
 */
const getWeekEnd = (timezone = config_1.config.app.defaultTimezone) => (0, moment_timezone_1.default)().tz(timezone).endOf('week').toDate();
exports.getWeekEnd = getWeekEnd;
/**
 * ได้วันเริ่มต้นของเดือนในเขตเวลาประเทศไทย
 */
const getMonthStart = (timezone = config_1.config.app.defaultTimezone) => (0, moment_timezone_1.default)().tz(timezone).startOf('month').toDate();
exports.getMonthStart = getMonthStart;
/**
 * ได้วันสิ้นสุดของเดือนในเขตเวลาประเทศไทย
 */
const getMonthEnd = (timezone = config_1.config.app.defaultTimezone) => (0, moment_timezone_1.default)().tz(timezone).endOf('month').toDate();
exports.getMonthEnd = getMonthEnd;
/**
 * ได้วันเริ่มต้นของวันนี้ในเขตเวลาประเทศไทย
 */
const getTodayStart = (timezone = config_1.config.app.defaultTimezone) => (0, moment_timezone_1.default)().tz(timezone).startOf('day').toDate();
exports.getTodayStart = getTodayStart;
/**
 * ได้วันสิ้นสุดของวันนี้ในเขตเวลาประเทศไทย
 */
const getTodayEnd = (timezone = config_1.config.app.defaultTimezone) => (0, moment_timezone_1.default)().tz(timezone).endOf('day').toDate();
exports.getTodayEnd = getTodayEnd;
/**
 * ตรวจสอบว่างานเกินกำหนดหรือไม่ (เปรียบเทียบในเขตเวลาประเทศไทย)
 */
const isOverdue = (dueDate, timezone = config_1.config.app.defaultTimezone) => (0, moment_timezone_1.default)().tz(timezone).isAfter((0, moment_timezone_1.default)(dueDate).tz(timezone));
exports.isOverdue = isOverdue;
/**
 * คำนวณจำนวนชั่วโมงที่เกินกำหนด (ในเขตเวลาประเทศไทย)
 */
const getOverdueHours = (dueDate, timezone = config_1.config.app.defaultTimezone) => (0, moment_timezone_1.default)().tz(timezone).diff((0, moment_timezone_1.default)(dueDate).tz(timezone), 'hours');
exports.getOverdueHours = getOverdueHours;
/**
 * คำนวณจำนวนวันที่เหลือ (ในเขตเวลาประเทศไทย)
 */
const getDaysRemaining = (dueDate, timezone = config_1.config.app.defaultTimezone) => (0, moment_timezone_1.default)(dueDate).tz(timezone).diff((0, moment_timezone_1.default)().tz(timezone), 'days');
exports.getDaysRemaining = getDaysRemaining;
/**
 * แปลงเป็นปี พ.ศ.
 */
const convertToThaiYear = (year) => year + 543;
exports.convertToThaiYear = convertToThaiYear;
/**
 * แปลงปี พ.ศ. กลับเป็น ค.ศ.
 */
const convertFromThaiYear = (thaiYear) => thaiYear - 543;
exports.convertFromThaiYear = convertFromThaiYear;
/**
 * ตรวจสอบว่าวันที่อยู่ในช่วงเวลาทำงานหรือไม่
 */
const isWorkingHours = (date, timezone = config_1.config.app.defaultTimezone) => {
    const momentDate = (0, moment_timezone_1.default)(date).tz(timezone);
    const hour = momentDate.hour();
    const startHour = parseInt(config_1.config.app.workingHours.start.split(':')[0]);
    const endHour = parseInt(config_1.config.app.workingHours.end.split(':')[0]);
    return hour >= startHour && hour < endHour;
};
exports.isWorkingHours = isWorkingHours;
/**
 * ได้วันที่ทำงานถัดไป (ข้ามวันหยุดเสาร์อาทิตย์)
 */
const getNextWorkingDay = (date, timezone = config_1.config.app.defaultTimezone) => {
    let nextDay = (0, moment_timezone_1.default)(date).tz(timezone).add(1, 'day');
    // ข้ามวันเสาร์ (6) และวันอาทิตย์ (0)
    while (nextDay.day() === 0 || nextDay.day() === 6) {
        nextDay = nextDay.add(1, 'day');
    }
    return nextDay.toDate();
};
exports.getNextWorkingDay = getNextWorkingDay;
/**
 * คำนวณจำนวนวันทำงานระหว่างสองวันที่
 */
const getWorkingDaysBetween = (startDate, endDate, timezone = config_1.config.app.defaultTimezone) => {
    const start = (0, moment_timezone_1.default)(startDate).tz(timezone);
    const end = (0, moment_timezone_1.default)(endDate).tz(timezone);
    let workingDays = 0;
    for (let current = start.clone(); current.isSameOrBefore(end, 'day'); current.add(1, 'day')) {
        // นับเฉพาะวันจันทร์-ศุกร์ (1-5)
        if (current.day() >= 1 && current.day() <= 5) {
            workingDays++;
        }
    }
    return workingDays;
};
exports.getWorkingDaysBetween = getWorkingDaysBetween;
//# sourceMappingURL=dateUtils.js.map