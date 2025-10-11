"use strict";
// Logger Utility - ระบบ logging
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
const config_1 = require("./config");
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        this.level = config_1.config.nodeEnv === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
    formatMessage(level, message, meta) {
        const timestamp = new Date().toISOString();
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level}] ${message}${metaStr}`;
    }
    error(message, meta) {
        if (this.level >= LogLevel.ERROR) {
            console.error(this.formatMessage('ERROR', message, meta));
        }
    }
    warn(message, meta) {
        if (this.level >= LogLevel.WARN) {
            console.warn(this.formatMessage('WARN', message, meta));
        }
    }
    info(message, meta) {
        if (this.level >= LogLevel.INFO) {
            console.log(this.formatMessage('INFO', message, meta));
        }
    }
    debug(message, meta) {
        if (this.level >= LogLevel.DEBUG) {
            console.log(this.formatMessage('DEBUG', message, meta));
        }
    }
    setLevel(level) {
        this.level = level;
    }
}
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map