import { Request, Response, NextFunction } from 'express';
interface TaskAuthRequest extends Request {
    user?: {
        id: string;
        lineUserId: string;
        displayName: string;
        email?: string;
        isVerified: boolean;
    };
    params: any;
}
export declare class TaskAuthMiddleware {
    private taskService;
    private userService;
    constructor();
    /**
     * Check if user can view task (always allowed if task exists)
     */
    requireTaskView: (req: TaskAuthRequest, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Check if user can submit task (only responsible users)
     */
    requireTaskSubmit: (req: TaskAuthRequest, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Check if user can edit/delete task (only task creators)
     */
    requireTaskEdit: (req: TaskAuthRequest, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Check if user can approve task (reviewers or creators if no reviewer set)
     */
    requireTaskApprove: (req: TaskAuthRequest, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Check if user can access task files (everyone can view files)
     */
    requireTaskFileAccess: (req: TaskAuthRequest, res: Response, next: NextFunction) => Promise<void>;
}
export declare const requireTaskView: (req: TaskAuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireTaskSubmit: (req: TaskAuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireTaskEdit: (req: TaskAuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireTaskApprove: (req: TaskAuthRequest, res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=taskAuth.d.ts.map