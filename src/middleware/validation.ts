// Request Validation Middleware

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Validation Middleware Factory
 */
export const validateRequest = (schema: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validationErrors: string[] = [];

    // Validate body
    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        validationErrors.push(`Body: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Validate query
    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        validationErrors.push(`Query: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Validate params
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        validationErrors.push(`Params: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    if (validationErrors.length > 0) {
      logger.warn('⚠️ Validation failed:', validationErrors);
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors,
        message: 'ข้อมูลที่ส่งไม่ตรงตามรูปแบบที่กำหนด'
      });
      return;
    }

    next();
  };
};

// Common validation schemas

export const taskSchemas = {
  create: {
    body: Joi.object({
      title: Joi.string().required().min(1).max(200),
      description: Joi.string().optional().max(1000),
      assigneeIds: Joi.array().items(Joi.string().pattern(/^[U][a-zA-Z0-9]+$/)).min(1).required(),
      createdBy: Joi.string().pattern(/^[U][a-zA-Z0-9]+$|^unknown$/).required(), // Allow 'unknown' for testing
      dueTime: Joi.string().required(), // Accept string for date parsing
      startTime: Joi.string().optional(), // Accept string for date parsing
      priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
      tags: Joi.array().items(Joi.string()).optional(),
      customReminders: Joi.array().items(Joi.string()).optional(),
      requireAttachment: Joi.boolean().optional(),
      reviewerUserId: Joi.string().pattern(/^[U][a-zA-Z0-9]+$/).optional()
    })
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
    })
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
    })
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
    })
  },

  addTags: {
    body: Joi.object({
      tags: Joi.array().items(Joi.string()).min(1).required()
    })
  }
};

export const userSchemas = {
  updateProfile: {
    body: Joi.object({
      realName: Joi.string().max(100).optional(),
      email: Joi.string().email().optional(),
      timezone: Joi.string().optional()
    })
  },

  linkEmail: {
    body: Joi.object({
      email: Joi.string().email().required(),
      verificationCode: Joi.string().optional()
    })
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
    })
  }
};

export const kpiSchemas = {
  leaderboard: {
    query: Joi.object({
      period: Joi.string().valid('weekly', 'monthly', 'all').default('weekly')
    })
  },

  userStats: {
    query: Joi.object({
      groupId: Joi.string().uuid().required(),
      period: Joi.string().valid('weekly', 'monthly', 'all').default('all')
    })
  },

  export: {
    query: Joi.object({
      startDate: Joi.date().required(),
      endDate: Joi.date().required(),
      format: Joi.string().valid('json', 'csv').default('json')
    })
  }
};

// Common parameter schemas
export const paramSchemas = {
  uuid: {
    params: Joi.object({
      id: Joi.string().uuid().required()
    })
  },

  groupId: {
    params: Joi.object({
      groupId: Joi.string().uuid().required()
    })
  },

  taskId: {
    params: Joi.object({
      taskId: Joi.string().uuid().required()
    })
  },

  fileId: {
    params: Joi.object({
      fileId: Joi.string().uuid().required()
    })
  },

  userId: {
    params: Joi.object({
      userId: Joi.string().uuid().required()
    })
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