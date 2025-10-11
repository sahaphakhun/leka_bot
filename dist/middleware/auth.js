"use strict";
// Authentication Middleware (UserID-based, no JWT)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = exports.requireGroupMember = exports.requireGroupAdmin = exports.optionalAuth = exports.authenticate = exports.AuthMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("@/utils/config");
const UserService_1 = require("@/services/UserService");
class AuthMiddleware {
    constructor() {
        /**
         * UserID-based Authentication Middleware (no JWT)
         * ตรวจสอบ userId จาก URL query (?userId=LINE_USER_ID) แล้วผูกเป็น req.user
         */
        this.authenticate = async (req, res, next) => {
            try {
                const userIdFromQuery = req.query.userId?.trim();
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
            }
            catch (error) {
                console.error('❌ Auth middleware error:', error);
                res.status(500).json({ success: false, error: 'Authentication error' });
            }
        };
        /**
         * Optional Authentication - ไม่บังคับต้องมี token
         */
        this.optionalAuth = async (req, res, next) => {
            try {
                const userIdFromQuery = req.query.userId?.trim();
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
            }
            catch (error) {
                console.warn('⚠️ Optional auth failed:', error);
                next();
            }
        };
        /**
         * Group Admin Authorization
         */
        this.requireGroupAdmin = async (req, res, next) => {
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
            }
            catch (error) {
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
        this.requireGroupMember = async (req, res, next) => {
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
            }
            catch (error) {
                console.error('❌ Group member auth error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Authorization error'
                });
            }
        };
        this.userService = new UserService_1.UserService();
    }
    /**
     * แยก token จาก request
     */
    extractToken(_req) {
        // JWT ถูกยกเลิกในการยืนยันตัวตนแบบใหม่
        return null;
    }
}
exports.AuthMiddleware = AuthMiddleware;
// สร้าง instance และ export functions
const authMiddleware = new AuthMiddleware();
exports.authenticate = authMiddleware.authenticate;
exports.optionalAuth = authMiddleware.optionalAuth;
exports.requireGroupAdmin = authMiddleware.requireGroupAdmin;
exports.requireGroupMember = authMiddleware.requireGroupMember;
/**
 * สร้าง JWT token
 */
const generateToken = (user) => {
    return jsonwebtoken_1.default.sign({
        lineUserId: user.lineUserId,
        displayName: user.displayName,
        email: user.email
    }, config_1.config.app.jwtSecret, {
        expiresIn: '30d', // token หมดอายุใน 30 วัน
        issuer: 'leka-bot',
        audience: 'leka-bot-users'
    });
};
exports.generateToken = generateToken;
//# sourceMappingURL=auth.js.map