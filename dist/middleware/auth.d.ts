import { Request, Response, NextFunction } from 'express';
interface AuthRequest extends Request {
    user?: {
        id: string;
        lineUserId: string;
        displayName: string;
        email?: string;
        isVerified: boolean;
    };
}
export declare class AuthMiddleware {
    private userService;
    constructor();
    /**
     * UserID-based Authentication Middleware (no JWT)
     * ตรวจสอบ userId จาก URL query (?userId=LINE_USER_ID) แล้วผูกเป็น req.user
     */
    authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Optional Authentication - ไม่บังคับต้องมี token
     */
    optionalAuth: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Group Admin Authorization
     */
    requireGroupAdmin: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Group Member Authorization
     */
    requireGroupMember: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    /**
     * แยก token จาก request
     */
    private extractToken;
}
export declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuth: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireGroupAdmin: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireGroupMember: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * สร้าง JWT token
 */
export declare const generateToken: (user: {
    lineUserId: string;
    displayName: string;
    email?: string;
}) => string;
export {};
//# sourceMappingURL=auth.d.ts.map