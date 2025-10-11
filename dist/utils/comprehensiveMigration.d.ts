export declare class ComprehensiveMigration {
    private static instance;
    private isRunning;
    private migrationResults;
    private constructor();
    static getInstance(): ComprehensiveMigration;
    /**
     * Main migration runner - executes all migration steps
     */
    runComprehensiveMigration(): Promise<void>;
    /**
     * Execute a specific migration step
     */
    private executeStep;
    /**
     * Validate and fix database schema
     */
    private validateDatabaseSchema;
    /**
     * Add missing columns to tables
     */
    private addMissingColumns;
    /**
     * Helper method to get table columns
     */
    private getTableColumns;
    /**
     * Helper method to add missing columns to a table
     */
    private addMissingColumnsToTable;
    /**
     * Fix enum values and constraints
     */
    private fixEnumValues;
    /**
     * Initialize task workflow data for existing tasks
     */
    private migrateTaskWorkflow;
    /**
     * Fix user data inconsistencies
     */
    private fixUserData;
    /**
     * Fix group data inconsistencies
     */
    private fixGroupData;
    /**
     * Fix task assignment relationships
     */
    private fixTaskAssignments;
    /**
     * Fix file attachment relationships
     */
    private fixFileAttachments;
    /**
     * Fix KPI record foreign keys
     */
    private fixKPIRecords;
    /**
     * Update task statuses based on workflow
     */
    private updateTaskStatuses;
    /**
     * Clean up orphaned data
     */
    private cleanupOrphanedData;
    /**
     * Final data integrity validation
     */
    private validateDataIntegrity;
    /**
     * Check if migration is needed
     */
    checkMigrationNeeded(): Promise<boolean>;
    /**
     * Get migration results summary
     */
    getMigrationResults(): Record<string, {
        success: boolean;
        message: string;
        details?: any;
    }>;
}
export declare const comprehensiveMigration: ComprehensiveMigration;
//# sourceMappingURL=comprehensiveMigration.d.ts.map