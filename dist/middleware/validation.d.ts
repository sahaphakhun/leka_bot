import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
interface ValidationSchema {
    body?: Joi.ObjectSchema;
    query?: Joi.ObjectSchema;
    params?: Joi.ObjectSchema;
}
/**
 * Validation Middleware Factory
 */
export declare const validateRequest: (schema: ValidationSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const taskSchemas: {
    create: {
        body: Joi.ObjectSchema<any>;
    };
    update: {
        body: Joi.ObjectSchema<any>;
    };
    list: {
        query: Joi.ObjectSchema<any>;
    };
};
export declare const fileSchemas: {
    list: {
        query: Joi.ObjectSchema<any>;
    };
    addTags: {
        body: Joi.ObjectSchema<any>;
    };
};
export declare const userSchemas: {
    updateProfile: {
        body: Joi.ObjectSchema<any>;
    };
    linkEmail: {
        body: Joi.ObjectSchema<any>;
    };
};
export declare const groupSchemas: {
    updateSettings: {
        body: Joi.ObjectSchema<any>;
    };
};
export declare const kpiSchemas: {
    leaderboard: {
        query: Joi.ObjectSchema<any>;
    };
    userStats: {
        query: Joi.ObjectSchema<any>;
    };
    export: {
        query: Joi.ObjectSchema<any>;
    };
};
export declare const recurringTaskSchemas: {
    create: {
        body: Joi.ObjectSchema<any>;
    };
    update: {
        body: Joi.ObjectSchema<any>;
    };
    toggle: {
        body: Joi.ObjectSchema<any>;
    };
};
export declare const paramSchemas: {
    uuid: {
        params: Joi.ObjectSchema<any>;
    };
    groupId: {
        params: Joi.ObjectSchema<any>;
    };
    taskId: {
        params: Joi.ObjectSchema<any>;
    };
    fileId: {
        params: Joi.ObjectSchema<any>;
    };
    userId: {
        params: Joi.ObjectSchema<any>;
    };
};
/**
 * Error formatting helper
 */
export declare const formatValidationError: (error: Joi.ValidationError) => string[];
export {};
//# sourceMappingURL=validation.d.ts.map