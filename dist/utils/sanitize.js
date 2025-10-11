"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitize = void 0;
/**
 * Sanitize string for safe use in HTTP headers like Content-Disposition.
 * Removes characters that can break headers such as quotes and CRLF.
 */
const sanitize = (value) => {
    if (!value)
        return 'download';
    // ลบอักขระที่ไม่ปลอดภัยสำหรับ HTTP header
    let sanitized = value.replace(/["\r\n]/g, '');
    // ลบอักขระควบคุมและอักขระพิเศษที่ไม่ปลอดภัย
    sanitized = sanitized.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
    // จำกัดความยาวของชื่อไฟล์
    if (sanitized.length > 200) {
        const ext = sanitized.split('.').pop();
        const name = sanitized.substring(0, 200 - (ext ? ext.length + 1 : 0));
        sanitized = ext ? `${name}.${ext}` : name;
    }
    return sanitized || 'download';
};
exports.sanitize = sanitize;
//# sourceMappingURL=sanitize.js.map