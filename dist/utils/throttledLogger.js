"use strict";
// Throttled Logger - Prevent Railway rate limiting by throttling repetitive log messages
Object.defineProperty(exports, "__esModule", { value: true });
exports.throttledLogger = void 0;
class ThrottledLogger {
    constructor() {
        this.logCache = new Map();
        this.THROTTLE_INTERVAL = 30000; // 30 seconds
        this.MAX_LOGS_PER_INTERVAL = 5;
    }
    static getInstance() {
        if (!ThrottledLogger.instance) {
            ThrottledLogger.instance = new ThrottledLogger();
        }
        return ThrottledLogger.instance;
    }
    /**
     * Log with throttling to prevent spam
     */
    log(level, message, key) {
        const logKey = key || this.extractLogKey(message);
        const now = new Date();
        const cached = this.logCache.get(logKey);
        if (!cached) {
            // First time seeing this message
            this.logCache.set(logKey, {
                count: 1,
                lastLogged: now,
                firstSeen: now
            });
            this.actualLog(level, message);
            return;
        }
        // Check if we're still in the throttle interval
        const timeSinceLastLog = now.getTime() - cached.lastLogged.getTime();
        if (timeSinceLastLog < this.THROTTLE_INTERVAL) {
            cached.count++;
            // Only log if we haven't exceeded the limit
            if (cached.count <= this.MAX_LOGS_PER_INTERVAL) {
                this.actualLog(level, message);
                cached.lastLogged = now;
            }
        }
        else {
            // Reset the counter and log
            if (cached.count > this.MAX_LOGS_PER_INTERVAL) {
                this.actualLog(level, `[THROTTLED] Previous message repeated ${cached.count - this.MAX_LOGS_PER_INTERVAL} more times (suppressed)`);
            }
            cached.count = 1;
            cached.lastLogged = now;
            this.actualLog(level, message);
        }
    }
    /**
     * Force log without throttling (for critical messages)
     */
    forceLog(level, message) {
        this.actualLog(level, message);
    }
    /**
     * Clean up old cache entries
     */
    cleanup() {
        const now = new Date();
        const OLD_THRESHOLD = 300000; // 5 minutes
        for (const [key, cached] of this.logCache.entries()) {
            if (now.getTime() - cached.lastLogged.getTime() > OLD_THRESHOLD) {
                this.logCache.delete(key);
            }
        }
    }
    extractLogKey(message) {
        // Extract meaningful parts to group similar messages
        // LINE API errors
        if (message.includes('LINE API 403') || message.includes('บอทไม่มีสิทธิ์เข้าถึง')) {
            return 'line_api_403';
        }
        if (message.includes('LINE API error')) {
            return 'line_api_error';
        }
        // UUID validation errors
        if (message.includes('Invalid taskId format')) {
            return 'invalid_uuid_format';
        }
        // Database errors
        if (message.includes('invalid input syntax for type uuid')) {
            return 'invalid_uuid_db_query';
        }
        // Task processing
        if (message.includes('Processing overdue task')) {
            return 'process_overdue_task';
        }
        // Leaderboard sync
        if (message.includes('Starting leaderboard sync')) {
            return 'leaderboard_sync_start';
        }
        // Default: use first 50 characters
        return message.substring(0, 50);
    }
    actualLog(level, message) {
        switch (level) {
            case 'info':
                console.log(message);
                break;
            case 'warn':
                console.warn(message);
                break;
            case 'error':
                console.error(message);
                break;
        }
    }
}
exports.throttledLogger = ThrottledLogger.getInstance();
// Auto cleanup every 5 minutes
setInterval(() => {
    exports.throttledLogger.cleanup();
}, 300000);
//# sourceMappingURL=throttledLogger.js.map