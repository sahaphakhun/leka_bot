import 'reflect-metadata';
/**
 * Migration script to update existing groups with placeholder names to proper group names
 * This script will find groups with names that match placeholder patterns and attempt to
 * fetch actual group names from LINE API or improve the fallback names.
 */
declare function migrateGroupNames(): Promise<void>;
export { migrateGroupNames };
//# sourceMappingURL=migrateGroupNames.d.ts.map