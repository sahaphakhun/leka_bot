"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateGroupNames = migrateGroupNames;
require("reflect-metadata");
const database_1 = require("@/utils/database");
const models_1 = require("@/models");
const LineService_1 = require("@/services/LineService");
/**
 * Migration script to update existing groups with placeholder names to proper group names
 * This script will find groups with names that match placeholder patterns and attempt to
 * fetch actual group names from LINE API or improve the fallback names.
 */
async function migrateGroupNames() {
    console.log('🔄 Starting group name migration...');
    try {
        await database_1.AppDataSource.initialize();
        console.log('✅ Database connected successfully');
        const lineService = new LineService_1.LineService();
        await lineService.initialize();
        // Find all groups with placeholder names
        const groups = await database_1.AppDataSource.getRepository(models_1.Group).find();
        console.log(`📊 Found ${groups.length} groups to check`);
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        for (const group of groups) {
            try {
                console.log(`\n🔍 Checking group: ${group.name} (${group.lineGroupId})`);
                // Check if the group name looks like a placeholder
                const isPlaceholder = isPlaceholderName(group.name);
                if (!isPlaceholder) {
                    console.log(`✅ Group "${group.name}" already has a proper name, skipping`);
                    skippedCount++;
                    continue;
                }
                console.log(`🔄 Attempting to get better name for: ${group.name}`);
                // Try to get group information from LINE API
                const groupInfo = await lineService.getGroupInformation(group.lineGroupId);
                // Only update if we got a better name (not just another fallback)
                if (groupInfo.source === 'line_api' || isImprovedName(group.name, groupInfo.name)) {
                    await database_1.AppDataSource.getRepository(models_1.Group).update({ id: group.id }, { name: groupInfo.name });
                    console.log(`✅ Updated "${group.name}" → "${groupInfo.name}" (${groupInfo.source})`);
                    updatedCount++;
                }
                else {
                    console.log(`ℹ️ No better name available for: ${group.name}`);
                    skippedCount++;
                }
                // Add a small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            catch (error) {
                console.error(`❌ Error processing group ${group.name}:`, error);
                errorCount++;
            }
        }
        console.log('\n📊 Migration Summary:');
        console.log(`• Groups checked: ${groups.length}`);
        console.log(`• Groups updated: ${updatedCount}`);
        console.log(`• Groups skipped: ${skippedCount}`);
        console.log(`• Errors: ${errorCount}`);
        if (updatedCount > 0) {
            console.log('✅ Group name migration completed successfully!');
        }
        else {
            console.log('ℹ️ No groups needed updating');
        }
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        process.exitCode = 1;
    }
    finally {
        if (database_1.AppDataSource.isInitialized) {
            await database_1.AppDataSource.destroy();
            console.log('🔌 Database connection closed');
        }
    }
}
/**
 * Check if a group name looks like a placeholder pattern
 */
function isPlaceholderName(name) {
    // Match patterns like "กลุ่ม xxxxxxxx", "กลุ่ม C1234567", etc.
    const placeholderPatterns = [
        /^กลุ่ม [A-Za-z0-9]{1,8}$/, // กลุ่ม C1234567
        /^กลุ่ม [A-Za-z0-9]{8,}$/, // กลุ่ม Cxxxxxxxx (long IDs)
        /^\[INACTIVE\]/, // [INACTIVE] groups
        /^Group /, // English "Group " prefix
        /^แชทส่วนตัว$/, // Personal chat
        /^personal_/ // personal_xxxxx
    ];
    return placeholderPatterns.some(pattern => pattern.test(name));
}
/**
 * Check if the new name is an improvement over the old name
 */
function isImprovedName(oldName, newName) {
    // Don't consider it improved if the new name is also a placeholder
    if (isPlaceholderName(newName)) {
        return false;
    }
    // If the old name was a placeholder and new name isn't, it's improved
    if (isPlaceholderName(oldName) && !isPlaceholderName(newName)) {
        return true;
    }
    // If the new name is longer and more descriptive, it might be better
    if (newName.length > oldName.length && newName.length > 10) {
        return true;
    }
    return false;
}
// Run if called directly
if (require.main === module) {
    migrateGroupNames();
}
//# sourceMappingURL=migrateGroupNames.js.map