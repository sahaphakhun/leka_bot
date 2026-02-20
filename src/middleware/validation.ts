// Request Validation Middleware

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Type definitions
interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}

interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LINE_OR_UUID_ID_PATTERN = new RegExp(
  `(?:^[U][a-zA-Z0-9]+$|^${UUID_V4_PATTERN.source}$)`,
);
const LINE_OR_UUID_ID = Joi.string().pattern(LINE_OR_UUID_ID_PATTERN);

const validateSegment = (
  req: Request,
  segment: "body" | "query" | "params",
  schema?: Joi.AnySchema,
) => {
  if (!schema) {
    return { value: undefined, error: undefined };
  }

  const { error, value } = schema.validate((req as any)[segment], {
    abortEarly: false,
  });

  return { value, error };
};

const createValidationErrorResponse = (error: Joi.ValidationError) => {
  const validationErrors: ValidationError[] = error.details.map((detail: any) => ({
    field: detail.path.join("."),
    message: detail.message,
    value: detail.context?.value,
  }));

  return {
    success: false,
    error: "Validation failed",
    details: validationErrors,
  };
};

/**
 * Validation Middleware Factory
 */
export const validateRequest = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Log request data for debugging
      console.log('🔍 Validation middleware - Request data:', {
        body: req.body,
        query: req.query,
        params: req.params
      });

      const segments: Array<"body" | "query" | "params"> = [
        "body",
        "query",
        "params",
      ];

      for (const segment of segments) {
        const schemaSegment = (schema as any)[segment] as Joi.AnySchema | undefined;
        if (!schemaSegment) continue;

        const { error, value } = validateSegment(req, segment, schemaSegment);

        if (error) {
          console.error('❌ Validation failed:', error.details);

          const responseBody = createValidationErrorResponse(error);
          console.error('❌ Validation errors:', responseBody);

          return res.status(400).json(responseBody);
        }

        if (segment === "body") {
          req.body = value;
        } else if (segment === "query") {
          req.query = value as Record<string, any>;
        } else if (segment === "params") {
          req.params = value as Record<string, string>;
        }
      }

      console.log('✅ Validation passed');

      next();
    } catch (err) {
      console.error('❌ Validation middleware error:', err);
      return res.status(500).json({
        success: false,
        error: 'Validation middleware error'
      });
    }
  };
};

// Common validation schemas

export const taskSchemas = {
  create: {
    body: Joi.object({
      title: Joi.string().required().min(1).max(200),
      description: Joi.string().optional().max(1000),
      assigneeIds: Joi.array().items(LINE_OR_UUID_ID).min(1).required(),
      createdBy: Joi.alternatives().try(
        LINE_OR_UUID_ID.required(),
        Joi.string().valid("unknown"),
      ).required(),
      dueTime: Joi.string().required(), // Accept string for date parsing
      startTime: Joi.string().optional(), // Accept string for date parsing
      priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
      tags: Joi.array().items(Joi.string()).optional(),
      customReminders: Joi.array().items(Joi.string()).optional(),
      requireAttachment: Joi.boolean().optional(),
      reviewerUserId: LINE_OR_UUID_ID.optional(),
    }).unknown() // Allow unknown fields
  },
  
  update: {
    body: Joi.object({
      title: Joi.string().min(1).max(200).optional(),
      description: Joi.string().max(1000).optional(),
      status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled').optional(),
      priority: Joi.string().valid('low', 'medium', 'high').optional(),
      dueTime: Joi.date().optional(),
      startTime: Joi.date().optional(),
      tags: Joi.array().items(Joi.string()).optional(),
      customReminders: Joi.array().items(Joi.string()).optional()
    }).unknown() // Allow unknown fields
  },

  list: {
    query: Joi.object({
      status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled', 'overdue').optional(),
      assignee: Joi.string().pattern(/^[U][a-zA-Z0-9]+$/).optional(),
      tags: Joi.string().optional(), // comma-separated
      startDate: Joi.string().optional(), // Accept string for date parsing
      endDate: Joi.string().optional(), // Accept string for date parsing
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20)
    }).unknown() // Allow unknown fields
  }
};

export const fileSchemas = {
  list: {
    query: Joi.object({
      tags: Joi.string().optional(), // comma-separated
      mimeType: Joi.string().optional(),
      search: Joi.string().optional(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20)
    }).unknown() // Allow unknown fields
  },

  addTags: {
    body: Joi.object({
      tags: Joi.array().items(Joi.string()).min(1).required()
    }).unknown() // Allow unknown fields
  }
};

export const userSchemas = {
  updateProfile: {
    body: Joi.object({
      realName: Joi.string().max(100).optional(),
      email: Joi.string().email().optional(),
      timezone: Joi.string().optional()
    }).unknown() // Allow unknown fields
  },

  linkEmail: {
    body: Joi.object({
      email: Joi.string().email().required(),
      verificationCode: Joi.string().optional()
    }).unknown() // Allow unknown fields
  }
};

export const groupSchemas = {
  updateSettings: {
    body: Joi.object({
      name: Joi.string().max(100).optional(),
      timezone: Joi.string().optional(),
      settings: Joi.object({
        reminderIntervals: Joi.array().items(Joi.string()).optional(),
        enableLeaderboard: Joi.boolean().optional(),
        googleCalendarId: Joi.string().optional(),
        defaultReminders: Joi.array().items(Joi.string()).optional(),
        workingHours: Joi.object({
          start: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
          end: Joi.string().pattern(/^\d{2}:\d{2}$/).optional()
        }).optional()
      }).optional()
    }).unknown() // Allow unknown fields
  }
};

export const kpiSchemas = {
  leaderboard: {
    query: Joi.object({
      period: Joi.string().valid('weekly', 'monthly', 'all').default('weekly')
    }).unknown() // Allow unknown fields
  },

  userStats: {
    query: Joi.object({
      groupId: Joi.string().uuid().required(),
      period: Joi.string().valid('weekly', 'monthly', 'all').default('all')
    }).unknown() // Allow unknown fields
  },

  export: {
    query: Joi.object({
      startDate: Joi.date().required(),
      endDate: Joi.date().required(),
      format: Joi.string().valid('json', 'csv').default('json')
    }).unknown() // Allow unknown fields
  }
};

export const recurringTaskSchemas = {
  create: {
    body: Joi.object({
      title: Joi.string().required().min(1).max(200),
      description: Joi.string().optional().max(1000).allow(''),
      assigneeLineUserIds: Joi.array().items(Joi.string()).optional(),
      reviewerLineUserId: Joi.string().optional().allow(null, ''),
      requireAttachment: Joi.boolean().optional().default(true),
      priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
      tags: Joi.array().items(Joi.string()).optional(),
      recurrence: Joi.string().valid('weekly', 'monthly', 'quarterly').required(),
      // การทำงานแบบใหม่: ใช้เพียงวันกำหนดส่งครั้งแรก แล้วระบบจะสร้างรอบถัดไปเมื่อเลยกำหนดส่งของรอบล่าสุด
      initialDueTime: Joi.string().required(),
      // ตัวเลือกเดิมทำเป็น optional เพื่อความเข้ากันได้ย้อนหลัง แต่ UI ใหม่จะไม่ส่งค่าเหล่านี้
      weekDay: Joi.number().integer().min(0).max(6).optional().allow(null), // 0-6 for Sunday-Saturday
      dayOfMonth: Joi.number().integer().min(1).max(31).optional().allow(null),
      timeOfDay: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      durationDays: Joi.number().integer().min(1).max(365).optional(),
      timezone: Joi.string().default('Asia/Bangkok'),
      createdBy: Joi.string().required() // Accept both createdBy and createdByLineUserId
    }).unknown() // Allow unknown fields
  },
  
  update: {
    body: Joi.object({
      title: Joi.string().min(1).max(200).optional(),
      description: Joi.string().max(1000).optional(),
      assigneeLineUserIds: Joi.array().items(Joi.string()).optional(),
      reviewerLineUserId: Joi.string().optional().allow(null, ''),
      requireAttachment: Joi.boolean().optional(),
      priority: Joi.string().valid('low', 'medium', 'high').optional(),
      tags: Joi.array().items(Joi.string()).optional(),
      recurrence: Joi.string().valid('weekly', 'monthly', 'quarterly').optional(),
      weekDay: Joi.number().integer().min(0).max(6).optional().allow(null),
      dayOfMonth: Joi.number().integer().min(1).max(31).optional().allow(null),
      timeOfDay: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      durationDays: Joi.number().integer().min(1).max(365).optional(),
      timezone: Joi.string().optional(),
      active: Joi.boolean().optional()
    }).unknown() // Allow unknown fields
  },

  toggle: {
    body: Joi.object({
      enabled: Joi.boolean(),
      isActive: Joi.boolean(),
      active: Joi.boolean(),
    }).unknown()
      .or("enabled", "isActive", "active")
  }
};

// Common parameter schemas
export const paramSchemas = {
  uuid: {
    params: Joi.object({
      id: Joi.string().uuid().required()
    }).unknown() // Allow unknown fields
  },

  groupId: {
    params: Joi.object({
      groupId: Joi.string().uuid().required()
    }).unknown() // Allow unknown fields
  },

  taskId: {
    params: Joi.object({
      taskId: Joi.string().uuid().required()
    }).unknown() // Allow unknown fields
  },

  fileId: {
    params: Joi.object({
      fileId: Joi.string().uuid().required()
    }).unknown() // Allow unknown fields
  },

  userId: {
    params: Joi.object({
      userId: Joi.string().uuid().required()
    }).unknown() // Allow unknown fields
  }
};

/**
 * Error formatting helper
 */
export const formatValidationError = (error: Joi.ValidationError): string[] => {
  return error.details.map(detail => {
    const path = detail.path.join('.');
    const message = detail.message;
    return `${path}: ${message}`;
  });
};
