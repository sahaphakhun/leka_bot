"use strict";
// Task-level Authorization Middleware
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTaskApprove = exports.requireTaskEdit = exports.requireTaskSubmit = exports.requireTaskView = exports.TaskAuthMiddleware = void 0;
const TaskService_1 = require("@/services/TaskService");
const UserService_1 = require("@/services/UserService");
class TaskAuthMiddleware {
    constructor() {
        /**
         * Check if user can view task (always allowed if task exists)
         */
        this.requireTaskView = async (req, res, next) => {
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
            }
            catch (error) {
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
        this.requireTaskSubmit = async (req, res, next) => {
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
                const isAssigned = task.assignedUsers?.some(user => user.lineUserId === req.user.lineUserId);
                if (!isAssigned) {
                    res.status(403).json({
                        success: false,
                        error: 'คุณไม่ได้เป็นผู้รับผิดชอบงานนี้ จึงไม่สามารถส่งงานได้',
                        details: 'Task submission is only allowed for assigned users'
                    });
                    return;
                }
                next();
            }
            catch (error) {
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
        this.requireTaskEdit = async (req, res, next) => {
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
            }
            catch (error) {
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
        this.requireTaskApprove = async (req, res, next) => {
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
                const reviewerInternalId = task.workflow?.review?.reviewerUserId;
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
            }
            catch (error) {
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
        this.requireTaskFileAccess = async (req, res, next) => {
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
            }
            catch (error) {
                console.error('❌ Task file auth error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Authorization error'
                });
            }
        };
        this.taskService = new TaskService_1.TaskService();
        this.userService = new UserService_1.UserService();
    }
}
exports.TaskAuthMiddleware = TaskAuthMiddleware;
// Create instance and export functions
const taskAuthMiddleware = new TaskAuthMiddleware();
exports.requireTaskView = taskAuthMiddleware.requireTaskView;
exports.requireTaskSubmit = taskAuthMiddleware.requireTaskSubmit;
exports.requireTaskEdit = taskAuthMiddleware.requireTaskEdit;
exports.requireTaskApprove = taskAuthMiddleware.requireTaskApprove;
// Note: requireTaskFileAccess removed - files are accessible to everyone
//# sourceMappingURL=taskAuth.js.map