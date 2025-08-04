// Authentication Middleware

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
   * JWT Authentication Middleware
   */
  public authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        res.status(401).json({ 
          success: false, 
          error: 'Access token required' 
        });
        return;
      }

      // ตรวจสอบ JWT token
      const decoded = jwt.verify(token, config.app.jwtSecret) as any;
      
      // ดึงข้อมูลผู้ใช้
      const user = await this.userService.findByLineUserId(decoded.lineUserId);
      
      if (!user) {
        res.status(401).json({ 
          success: false, 
          error: 'Invalid token: user not found' 
        });
        return;
      }

      // เพิ่มข้อมูลผู้ใช้เข้า request
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
      
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({ 
          success: false, 
          error: 'Invalid token' 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Authentication error' 
        });
      }
    }
  };

  /**
   * Optional Authentication - ไม่บังคับต้องมี token
   */
  public optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);
      
      if (token) {
        const decoded = jwt.verify(token, config.app.jwtSecret) as any;
        const user = await this.userService.findByLineUserId(decoded.lineUserId);
        
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
      // ถ้า optional auth ล้มเหลว ไม่ต้องหยุด request
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
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // ตรวจสอบจาก query parameter (สำหรับ LIFF)
    const queryToken = req.query.token as string;
    if (queryToken) {
      return queryToken;
    }
    
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