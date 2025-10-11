// Task-level Authorization Middleware

import { Request, Response, NextFunction } from 'express';
import { TaskService } from '@/services/TaskService';
import { UserService } from '@/services/UserService';

interface TaskAuthRequest extends Request {
  user?: {
    id: string;
    lineUserId: string;
    displayName: string;
    email?: string;
    isVerified: boolean;
  };
  params: any; // Add params property
}

export class TaskAuthMiddleware {
  private taskService: TaskService;
  private userService: UserService;

  constructor() {
    this.taskService = new TaskService();
    this.userService = new UserService();
  }

  /**
   * Check if user can view task (always allowed if task exists)
   */
  public requireTaskView = async (req: TaskAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { taskId } = req.params;
      
      const task = await this.taskService.getTaskById(taskId);
      if (!task) {
        res.status(404).json({ 
          success: false, 
          error: 'Task not found' 
        });
        return;
      }

      next();

    } catch (error) {
      console.error('❌ Task view auth error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Authorization error' 
      });
    }
  };

  /**
   * Check if user can submit task (only responsible users)
   */
  public requireTaskSubmit = async (req: TaskAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
        return;
      }

      const { taskId } = req.params;
      const task = await this.taskService.getTaskById(taskId);
      
      if (!task) {
        res.status(404).json({ 
          success: false, 
          error: 'Task not found' 
        });
        return;
      }

      // Check if user is assigned to this task
      const isAssigned = task.assignedUsers?.some(user => user.lineUserId === req.user!.lineUserId);
      
      if (!isAssigned) {
        res.status(403).json({ 
          success: false, 
          error: 'คุณไม่ได้เป็นผู้รับผิดชอบงานนี้ จึงไม่สามารถส่งงานได้',
          details: 'Task submission is only allowed for assigned users'
        });
        return;
      }

      next();

    } catch (error) {
      console.error('❌ Task submit auth error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Authorization error' 
      });
    }
  };

  /**
   * Check if user can edit/delete task (only task creators)
   */
  public requireTaskEdit = async (req: TaskAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
        return;
      }

      const { taskId } = req.params;
      const task = await this.taskService.getTaskById(taskId);
      
      if (!task) {
        res.status(404).json({ 
          success: false, 
          error: 'Task not found' 
        });
        return;
      }

      // Check if user is the creator of this task
      const isCreator = task.createdByUser?.lineUserId === req.user.lineUserId;
      
      if (!isCreator) {
        res.status(403).json({ 
          success: false, 
          error: 'คุณไม่ได้เป็นผู้สร้างงานนี้ จึงไม่สามารถแก้ไขหรือลบได้',
          details: 'Task editing is only allowed for task creators'
        });
        return;
      }

      next();

    } catch (error) {
      console.error('❌ Task edit auth error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Authorization error' 
      });
    }
  };

  /**
   * Check if user can approve task (reviewers or creators if no reviewer set)
   */
  public requireTaskApprove = async (req: TaskAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
        return;
      }

      const { taskId } = req.params;
      const task = await this.taskService.getTaskById(taskId);
      
      if (!task) {
        res.status(404).json({ 
          success: false, 
          error: 'Task not found' 
        });
        return;
      }

      // Get reviewer from workflow (stored as internal UUID)
      const reviewerInternalId = (task.workflow as any)?.review?.reviewerUserId;
      
      // Check if user is the designated reviewer (compare with user's internal ID)
      const isReviewer = reviewerInternalId === req.user.id;
      
      // If no reviewer is set, creator can approve (compare with user's LINE ID)
      const isCreatorWithNoReviewer = !reviewerInternalId && 
                                     task.createdByUser?.lineUserId === req.user.lineUserId;
      
      if (!isReviewer && !isCreatorWithNoReviewer) {
        res.status(403).json({ 
          success: false, 
          error: 'คุณไม่ได้เป็นผู้ตรวจงานนี้ จึงไม่สามารถอนุมัติได้',
          details: 'Task approval is only allowed for designated reviewers or creators if no reviewer is set'
        });
        return;
      }

      next();

    } catch (error) {
      console.error('❌ Task approve auth error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Authorization error' 
      });
    }
  };

  /**
   * Check if user can access task files (everyone can view files)
   */
  public requireTaskFileAccess = async (req: TaskAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { taskId } = req.params;
      const task = await this.taskService.getTaskById(taskId);
      
      if (!task) {
        res.status(404).json({ 
          success: false, 
          error: 'Task not found' 
        });
        return;
      }

      // Allow access to everyone - files are public within the group
      // No permission check needed for file viewing
      next();

    } catch (error) {
      console.error('❌ Task file auth error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Authorization error' 
      });
    }
  };
}

// Create instance and export functions
const taskAuthMiddleware = new TaskAuthMiddleware();

export const requireTaskView = taskAuthMiddleware.requireTaskView;
export const requireTaskSubmit = taskAuthMiddleware.requireTaskSubmit;
export const requireTaskEdit = taskAuthMiddleware.requireTaskEdit;
export const requireTaskApprove = taskAuthMiddleware.requireTaskApprove;
// Note: requireTaskFileAccess removed - files are accessible to everyone