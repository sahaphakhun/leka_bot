import { Request, Response, NextFunction } from 'express';
/**
 * Validate UUID parameters and reject invalid requests early
 */
export declare function validateUUIDParams(paramNames?: string[]): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Validate specific UUID parameter
 */
export declare function validateTaskId(req: Request, res: Response, next: NextFunction): void;
/**
 * Validate multiple common UUID parameters
 */
export declare function validateCommonUUIDs(req: Request, res: Response, next: NextFunction): void;
/**
 * Check if a string is a valid UUID
 */
export declare function isValidUUID(str: string): boolean;
/**
 * Sanitize UUID or return null if invalid
 */
export declare function sanitizeUUID(str: string): string | null;
//# sourceMappingURL=uuidValidation.d.ts.map