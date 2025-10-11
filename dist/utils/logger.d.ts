export declare enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
}
declare class Logger {
    private level;
    constructor();
    private formatMessage;
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
    setLevel(level: LogLevel): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map