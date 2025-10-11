declare class ThrottledLogger {
    private static instance;
    private logCache;
    private readonly THROTTLE_INTERVAL;
    private readonly MAX_LOGS_PER_INTERVAL;
    private constructor();
    static getInstance(): ThrottledLogger;
    /**
     * Log with throttling to prevent spam
     */
    log(level: 'info' | 'warn' | 'error', message: string, key?: string): void;
    /**
     * Force log without throttling (for critical messages)
     */
    forceLog(level: 'info' | 'warn' | 'error', message: string): void;
    /**
     * Clean up old cache entries
     */
    cleanup(): void;
    private extractLogKey;
    private actualLog;
}
export declare const throttledLogger: ThrottledLogger;
export {};
//# sourceMappingURL=throttledLogger.d.ts.map