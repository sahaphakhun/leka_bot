import { Request, Response, NextFunction } from 'express';
export declare const debugMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const errorLogMiddleware: (error: Error, req: Request, res: Response, next: NextFunction) => void;
export declare const logSystemInfo: () => void;
//# sourceMappingURL=debugMiddleware.d.ts.map