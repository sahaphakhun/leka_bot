export declare class AutoMigration {
    private static instance;
    private isRunning;
    private constructor();
    static getInstance(): AutoMigration;
    /**
     * รัน auto-migration เมื่อ server เริ่ม
     */
    runAutoMigration(): Promise<void>;
    /**
     * ตรวจสอบว่าจำเป็นต้องรัน migration หรือไม่
     */
    checkMigrationNeeded(): Promise<boolean>;
    /**
     * Get migration results for API endpoint
     */
    getMigrationResults(): Record<string, {
        success: boolean;
        message: string;
        details?: any;
    }>;
    /**
     * @deprecated Use comprehensiveMigration instead
     */
    private migrateMissingColumns;
    /**
     * @deprecated Use comprehensiveMigration instead
     */
    private migrateFileAttachmentType;
    /**
     * @deprecated Use comprehensiveMigration instead
     */
    private initializeWorkflowData;
}
export declare const autoMigration: AutoMigration;
//# sourceMappingURL=autoMigration.d.ts.map