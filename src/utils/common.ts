// Common Utilities - ฟังก์ชันที่ใช้ซ้ำในระบบ

import moment from 'moment-timezone';
import { config } from './config';

/**
 * จัดรูปแบบขนาดไฟล์
 */
export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * ได้เวลาปัจจุบันในรูปแบบ ISO string
 */
export const getCurrentTime = (): string => new Date().toISOString();

/**
 * ได้ moment object ที่ตั้งค่า timezone แล้ว
 */
export const getMomentWithTimezone = () => moment().tz(config.app.defaultTimezone);

/**
 * ได้ moment object สำหรับ timezone ที่ระบุ
 */
export const getMomentWithCustomTimezone = (timezone: string) => moment().tz(timezone);

/**
 * ตรวจสอบว่าเป็น valid UUID หรือไม่
 */
export const isValidUuid = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * สร้าง random string
 */
export const generateRandomString = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * ตรวจสอบว่าเป็น valid email หรือไม่
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * แปลง string เป็น boolean
 */
export const parseBoolean = (value: string | boolean | undefined): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return false;
};

/**
 * จำกัดความยาวของ string
 */
export const truncateString = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
};

/**
 * แปลง array เป็น chunks
 */
export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};
