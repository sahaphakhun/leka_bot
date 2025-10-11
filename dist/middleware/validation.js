"use strict";
// Request Validation Middleware
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatValidationError = exports.paramSchemas = exports.recurringTaskSchemas = exports.kpiSchemas = exports.groupSchemas = exports.userSchemas = exports.fileSchemas = exports.taskSchemas = exports.validateRequest = void 0;
const joi_1 = __importDefault(require("joi"));
/**
 * Validation Middleware Factory
 */
const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            // Log request data for debugging
            console.log('🔍 Validation middleware - Request data:', {
                body: req.body,
                query: req.query,
                params: req.params
            });
            // Validate body if schema exists
            if (schema.body) {
                const { error, value } = schema.body.validate(req.body, { abortEarly: false });
                if (error) {
                    console.error('❌ Validation failed:', error.details);
                    const validationErrors = error.details.map((detail) => ({
                        field: detail.path.join('.'),
                        message: detail.message,
                        value: detail.context?.value
                    }));
                    console.error('❌ Validation errors:', validationErrors);
                    return res.status(400).json({
                        success: false,
                        error: 'Validation failed',
                        details: validationErrors
                    });
                }
                // Validation passed
                console.log('✅ Validation passed');
                req.body = value;
            }
            next();
        }
        catch (err) {
            console.error('❌ Validation middleware error:', err);
            return res.status(500).json({
                success: false,
                error: 'Validation middleware error'
            });
        }
    };
};
exports.validateRequest = validateRequest;
// Common validation schemas
exports.taskSchemas = {
    create: {
        body: joi_1.default.object({
            title: joi_1.default.string().required().min(1).max(200),
            description: joi_1.default.string().optional().max(1000),
            assigneeIds: joi_1.default.array().items(joi_1.default.string().pattern(/^[U][a-zA-Z0-9]+$/)).min(1).required(),
            createdBy: joi_1.default.string().pattern(/^[U][a-zA-Z0-9]+$|^unknown$/).required(), // Allow 'unknown' for testing
            dueTime: joi_1.default.string().required(), // Accept string for date parsing
            startTime: joi_1.default.string().optional(), // Accept string for date parsing
            priority: joi_1.default.string().valid('low', 'medium', 'high').default('medium'),
            tags: joi_1.default.array().items(joi_1.default.string()).optional(),
            customReminders: joi_1.default.array().items(joi_1.default.string()).optional(),
            requireAttachment: joi_1.default.boolean().optional(),
            reviewerUserId: joi_1.default.string().pattern(/^[U][a-zA-Z0-9]+$/).optional()
        }).unknown() // Allow unknown fields
    },
    update: {
        body: joi_1.default.object({
            title: joi_1.default.string().min(1).max(200).optional(),
            description: joi_1.default.string().max(1000).optional(),
            status: joi_1.default.string().valid('pending', 'in_progress', 'completed', 'cancelled').optional(),
            priority: joi_1.default.string().valid('low', 'medium', 'high').optional(),
            dueTime: joi_1.default.date().optional(),
            startTime: joi_1.default.date().optional(),
            tags: joi_1.default.array().items(joi_1.default.string()).optional(),
            customReminders: joi_1.default.array().items(joi_1.default.string()).optional()
        }).unknown() // Allow unknown fields
    },
    list: {
        query: joi_1.default.object({
            status: joi_1.default.string().valid('pending', 'in_progress', 'completed', 'cancelled', 'overdue').optional(),
            assignee: joi_1.default.string().pattern(/^[U][a-zA-Z0-9]+$/).optional(),
            tags: joi_1.default.string().optional(), // comma-separated
            startDate: joi_1.default.string().optional(), // Accept string for date parsing
            endDate: joi_1.default.string().optional(), // Accept string for date parsing
            page: joi_1.default.number().integer().min(1).default(1),
            limit: joi_1.default.number().integer().min(1).max(100).default(20)
        }).unknown() // Allow unknown fields
    }
};
exports.fileSchemas = {
    list: {
        query: joi_1.default.object({
            tags: joi_1.default.string().optional(), // comma-separated
            mimeType: joi_1.default.string().optional(),
            search: joi_1.default.string().optional(),
            page: joi_1.default.number().integer().min(1).default(1),
            limit: joi_1.default.number().integer().min(1).max(100).default(20)
        }).unknown() // Allow unknown fields
    },
    addTags: {
        body: joi_1.default.object({
            tags: joi_1.default.array().items(joi_1.default.string()).min(1).required()
        }).unknown() // Allow unknown fields
    }
};
exports.userSchemas = {
    updateProfile: {
        body: joi_1.default.object({
            realName: joi_1.default.string().max(100).optional(),
            email: joi_1.default.string().email().optional(),
            timezone: joi_1.default.string().optional()
        }).unknown() // Allow unknown fields
    },
    linkEmail: {
        body: joi_1.default.object({
            email: joi_1.default.string().email().required(),
            verificationCode: joi_1.default.string().optional()
        }).unknown() // Allow unknown fields
    }
};
exports.groupSchemas = {
    updateSettings: {
        body: joi_1.default.object({
            name: joi_1.default.string().max(100).optional(),
            timezone: joi_1.default.string().optional(),
            settings: joi_1.default.object({
                reminderIntervals: joi_1.default.array().items(joi_1.default.string()).optional(),
                enableLeaderboard: joi_1.default.boolean().optional(),
                googleCalendarId: joi_1.default.string().optional(),
                defaultReminders: joi_1.default.array().items(joi_1.default.string()).optional(),
                workingHours: joi_1.default.object({
                    start: joi_1.default.string().pattern(/^\d{2}:\d{2}$/).optional(),
                    end: joi_1.default.string().pattern(/^\d{2}:\d{2}$/).optional()
                }).optional()
            }).optional()
        }).unknown() // Allow unknown fields
    }
};
exports.kpiSchemas = {
    leaderboard: {
        query: joi_1.default.object({
            period: joi_1.default.string().valid('weekly', 'monthly', 'all').default('weekly')
        }).unknown() // Allow unknown fields
    },
    userStats: {
        query: joi_1.default.object({
            groupId: joi_1.default.string().uuid().required(),
            period: joi_1.default.string().valid('weekly', 'monthly', 'all').default('all')
        }).unknown() // Allow unknown fields
    },
    export: {
        query: joi_1.default.object({
            startDate: joi_1.default.date().required(),
            endDate: joi_1.default.date().required(),
            format: joi_1.default.string().valid('json', 'csv').default('json')
        }).unknown() // Allow unknown fields
    }
};
exports.recurringTaskSchemas = {
    create: {
        body: joi_1.default.object({
            title: joi_1.default.string().required().min(1).max(200),
            description: joi_1.default.string().optional().max(1000).allow(''),
            assigneeLineUserIds: joi_1.default.array().items(joi_1.default.string()).optional(),
            reviewerLineUserId: joi_1.default.string().optional().allow(null, ''),
            requireAttachment: joi_1.default.boolean().optional().default(true),
            priority: joi_1.default.string().valid('low', 'medium', 'high').default('medium'),
            tags: joi_1.default.array().items(joi_1.default.string()).optional(),
            recurrence: joi_1.default.string().valid('weekly', 'monthly', 'quarterly').required(),
            // การทำงานแบบใหม่: ใช้เพียงวันกำหนดส่งครั้งแรก แล้วระบบจะสร้างรอบถัดไปเมื่อเลยกำหนดส่งของรอบล่าสุด
            initialDueTime: joi_1.default.string().required(),
            // ตัวเลือกเดิมทำเป็น optional เพื่อความเข้ากันได้ย้อนหลัง แต่ UI ใหม่จะไม่ส่งค่าเหล่านี้
            weekDay: joi_1.default.number().integer().min(0).max(6).optional().allow(null), // 0-6 for Sunday-Saturday
            dayOfMonth: joi_1.default.number().integer().min(1).max(31).optional().allow(null),
            timeOfDay: joi_1.default.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
            durationDays: joi_1.default.number().integer().min(1).max(365).optional(),
            timezone: joi_1.default.string().default('Asia/Bangkok'),
            createdBy: joi_1.default.string().required() // Accept both createdBy and createdByLineUserId
        }).unknown() // Allow unknown fields
    },
    update: {
        body: joi_1.default.object({
            title: joi_1.default.string().min(1).max(200).optional(),
            description: joi_1.default.string().max(1000).optional(),
            assigneeLineUserIds: joi_1.default.array().items(joi_1.default.string()).optional(),
            reviewerLineUserId: joi_1.default.string().optional().allow(null, ''),
            requireAttachment: joi_1.default.boolean().optional(),
            priority: joi_1.default.string().valid('low', 'medium', 'high').optional(),
            tags: joi_1.default.array().items(joi_1.default.string()).optional(),
            recurrence: joi_1.default.string().valid('weekly', 'monthly', 'quarterly').optional(),
            weekDay: joi_1.default.number().integer().min(0).max(6).optional().allow(null),
            dayOfMonth: joi_1.default.number().integer().min(1).max(31).optional().allow(null),
            timeOfDay: joi_1.default.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
            durationDays: joi_1.default.number().integer().min(1).max(365).optional(),
            timezone: joi_1.default.string().optional(),
            active: joi_1.default.boolean().optional()
        }).unknown() // Allow unknown fields
    }
};
// Common parameter schemas
exports.paramSchemas = {
    uuid: {
        params: joi_1.default.object({
            id: joi_1.default.string().uuid().required()
        }).unknown() // Allow unknown fields
    },
    groupId: {
        params: joi_1.default.object({
            groupId: joi_1.default.string().uuid().required()
        }).unknown() // Allow unknown fields
    },
    taskId: {
        params: joi_1.default.object({
            taskId: joi_1.default.string().uuid().required()
        }).unknown() // Allow unknown fields
    },
    fileId: {
        params: joi_1.default.object({
            fileId: joi_1.default.string().uuid().required()
        }).unknown() // Allow unknown fields
    },
    userId: {
        params: joi_1.default.object({
            userId: joi_1.default.string().uuid().required()
        }).unknown() // Allow unknown fields
    }
};
/**
 * Error formatting helper
 */
const formatValidationError = (error) => {
    return error.details.map(detail => {
        const path = detail.path.join('.');
        const message = detail.message;
        return `${path}: ${message}`;
    });
};
exports.formatValidationError = formatValidationError;
//# sourceMappingURL=validation.js.map