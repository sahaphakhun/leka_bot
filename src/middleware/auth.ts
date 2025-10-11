// Authentication Middleware (UserID-based, no JWT)

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/utils/config';
import { UserService } from '@/services/UserService';

interface AuthRequest extends Request {
  user?: {
    id: string;
    lineUserId: string;
    displayName: string;
    email?: string;
    isVerified: boolean;
  };
}

export class AuthMiddleware {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * UserID-based Authentication Middleware (no JWT)
   * ตรวจสอบ userId จาก URL query (?userId=LINE_USER_ID) แล้วผูกเป็น req.user
   */
  public authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userIdFromQuery = (req.query.userId as string | undefined)?.trim();

      if (!userIdFromQuery) {
        res.status(401).json({
          success: false,
          error: 'Authentication required: userId query parameter is missing'
        });
        return;
      }

      const user = await this.userService.findByLineUserId(userIdFromQuery);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication failed: user not found'
        });
        return;
      }

      req.user = {
        id: user.id,
        lineUserId: user.lineUserId,
        displayName: user.displayName,
        email: user.email,
        isVerified: user.isVerified
      };

      next();
    } catch (error) {
      console.error('❌ Auth middleware error:', error);
      res.status(500).json({ success: false, error: 'Authentication error' });
    }
  };

  /**
   * Optional Authentication - ไม่บังคับต้องมี token
   */
  public optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userIdFromQuery = (req.query.userId as string | undefined)?.trim();
      if (userIdFromQuery) {
        const user = await this.userService.findByLineUserId(userIdFromQuery);
        if (user) {
          req.user = {
            id: user.id,
            lineUserId: user.lineUserId,
            displayName: user.displayName,
            email: user.email,
            isVerified: user.isVerified
          };
        }
      }
      next();
    } catch (error) {
      console.warn('⚠️ Optional auth failed:', error);
      next();
    }
  };

  /**
   * Group Admin Authorization
   */
  public requireGroupAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
        return;
      }

      const { groupId } = req.params;
      if (!groupId) {
        res.status(400).json({ 
          success: false, 
          error: 'Group ID required' 
        });
        return;
      }

      const isAdmin = await this.userService.isGroupAdmin(req.user.id, groupId);
      
      if (!isAdmin) {
        res.status(403).json({ 
          success: false, 
          error: 'Group admin access required' 
        });
        return;
      }

      next();

    } catch (error) {
      console.error('❌ Group admin auth error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Authorization error' 
      });
    }
  };

  /**
   * Group Member Authorization
   */
  public requireGroupMember = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
        return;
      }

      const { groupId } = req.params;
      if (!groupId) {
        res.status(400).json({ 
          success: false, 
          error: 'Group ID required' 
        });
        return;
      }

      const membership = await this.userService.findGroupMembership(req.user.id, groupId);
      
      if (!membership) {
        res.status(403).json({ 
          success: false, 
          error: 'Group membership required' 
        });
        return;
      }

      next();

    } catch (error) {
      console.error('❌ Group member auth error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Authorization error' 
      });
    }
  };

  /**
   * แยก token จาก request
   */
  private extractToken(_req: Request): string | null {
    // JWT ถูกยกเลิกในการยืนยันตัวตนแบบใหม่
    return null;
  }
}

// สร้าง instance และ export functions
const authMiddleware = new AuthMiddleware();

export const authenticate = authMiddleware.authenticate;
export const optionalAuth = authMiddleware.optionalAuth;
export const requireGroupAdmin = authMiddleware.requireGroupAdmin;
export const requireGroupMember = authMiddleware.requireGroupMember;

/**
 * สร้าง JWT token
 */
export const generateToken = (user: {
  lineUserId: string;
  displayName: string;
  email?: string;
}): string => {
  return jwt.sign(
    {
      lineUserId: user.lineUserId,
      displayName: user.displayName,
      email: user.email
    },
    config.app.jwtSecret,
    {
      expiresIn: '30d', // token หมดอายุใน 30 วัน
      issuer: 'leka-bot',
      audience: 'leka-bot-users'
    }
  );
};
