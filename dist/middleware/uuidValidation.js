"use strict";
// UUID Validation Middleware - Prevent invalid UUID queries from reaching services
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUUIDParams = validateUUIDParams;
exports.validateTaskId = validateTaskId;
exports.validateCommonUUIDs = validateCommonUUIDs;
exports.isValidUUID = isValidUUID;
exports.sanitizeUUID = sanitizeUUID;
const throttledLogger_1 = require("@/utils/throttledLogger");
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/**
 * Validate UUID parameters and reject invalid requests early
 */
function validateUUIDParams(paramNames = ['id', 'taskId', 'fileId', 'userId']) {
    return (req, res, next) => {
        const invalidParams = [];
        for (const paramName of paramNames) {
            const paramValue = req.params[paramName];
            if (paramValue && !UUID_REGEX.test(paramValue)) {
                invalidParams.push(paramName);
                // Log with throttling to prevent spam
                throttledLogger_1.throttledLogger.log('warn', `❌ Invalid UUID format for ${paramName}: ${paramValue}`, `invalid_uuid_${paramName}`);
            }
        }
        if (invalidParams.length > 0) {
            const clientIP = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent') || 'unknown';
            // Log potential attack or misconfigured client
            if (invalidParams.length > 1 || req.path.includes('task')) {
                throttledLogger_1.throttledLogger.log('warn', `🚨 Multiple invalid UUIDs from ${clientIP}: ${invalidParams.join(', ')} - possible misconfigured client or attack`, 'multiple_invalid_uuid');
            }
            res.status(400).json({
                success: false,
                error: 'Invalid UUID format',
                details: `Invalid UUID format for parameters: ${invalidParams.join(', ')}. Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`,
                invalidParams
            });
            return;
        }
        next();
    };
}
/**
 * Validate specific UUID parameter
 */
function validateTaskId(req, res, next) {
    return validateUUIDParams(['taskId'])(req, res, next);
}
/**
 * Validate multiple common UUID parameters
 */
function validateCommonUUIDs(req, res, next) {
    return validateUUIDParams(['id', 'taskId', 'fileId', 'userId', 'groupId'])(req, res, next);
}
/**
 * Check if a string is a valid UUID
 */
function isValidUUID(str) {
    return UUID_REGEX.test(str);
}
/**
 * Sanitize UUID or return null if invalid
 */
function sanitizeUUID(str) {
    return isValidUUID(str) ? str.toLowerCase() : null;
}
//# sourceMappingURL=uuidValidation.js.map