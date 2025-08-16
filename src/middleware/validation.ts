// Request Validation Middleware

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

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

      const { error, value } = schema.body.validate(req.body, { abortEarly: false });
      
      if (error) {
        console.error('❌ Validation failed:', error.details);
        
        const validationErrors = error.details.map(detail => ({
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
      assigneeIds: Joi.array().items(Joi.string().pattern(/^[U][a-zA-Z0-9]+$/)).min(1).required(),
      createdBy: Joi.string().pattern(/^[U][a-zA-Z0-9]+$|^unknown$/).required(), // Allow 'unknown' for testing
      dueTime: Joi.string().required(), // Accept string for date parsing
      startTime: Joi.string().optional(), // Accept string for date parsing
      priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
      tags: Joi.array().items(Joi.string()).optional(),
      customReminders: Joi.array().items(Joi.string()).optional(),
      requireAttachment: Joi.boolean().optional(),
      reviewerUserId: Joi.string().pattern(/^[U][a-zA-Z0-9]+$/).optional()
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