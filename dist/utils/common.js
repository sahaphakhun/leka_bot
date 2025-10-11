"use strict";
// Common Utilities - ฟังก์ชันที่ใช้ซ้ำในระบบ
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkArray = exports.truncateString = exports.parseBoolean = exports.isValidEmail = exports.generateRandomString = exports.isValidUuid = exports.getMomentWithCustomTimezone = exports.getMomentWithTimezone = exports.getCurrentTime = exports.formatFileSize = void 0;
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const config_1 = require("./config");
/**
 * จัดรูปแบบขนาดไฟล์
 */
const formatFileSize = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0)
        return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};
exports.formatFileSize = formatFileSize;
/**
 * ได้เวลาปัจจุบันในรูปแบบ ISO string
 */
const getCurrentTime = () => new Date().toISOString();
exports.getCurrentTime = getCurrentTime;
/**
 * ได้ moment object ที่ตั้งค่า timezone แล้ว
 */
const getMomentWithTimezone = () => (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone);
exports.getMomentWithTimezone = getMomentWithTimezone;
/**
 * ได้ moment object สำหรับ timezone ที่ระบุ
 */
const getMomentWithCustomTimezone = (timezone) => (0, moment_timezone_1.default)().tz(timezone);
exports.getMomentWithCustomTimezone = getMomentWithCustomTimezone;
/**
 * ตรวจสอบว่าเป็น valid UUID หรือไม่
 */
const isValidUuid = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};
exports.isValidUuid = isValidUuid;
/**
 * สร้าง random string
 */
const generateRandomString = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
exports.generateRandomString = generateRandomString;
/**
 * ตรวจสอบว่าเป็น valid email หรือไม่
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.isValidEmail = isValidEmail;
/**
 * แปลง string เป็น boolean
 */
const parseBoolean = (value) => {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
    }
    return false;
};
exports.parseBoolean = parseBoolean;
/**
 * จำกัดความยาวของ string
 */
const truncateString = (str, maxLength) => {
    if (str.length <= maxLength)
        return str;
    return str.substring(0, maxLength - 3) + '...';
};
exports.truncateString = truncateString;
/**
 * แปลง array เป็น chunks
 */
const chunkArray = (array, chunkSize) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
};
exports.chunkArray = chunkArray;
//# sourceMappingURL=common.js.map