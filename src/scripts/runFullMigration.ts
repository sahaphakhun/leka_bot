import { logger } from '@/utils/logger';
import { addMissingColumns } from './addMissingColumns';
import { addMissingTaskStatusEnum } from './addMissingTaskStatusEnum';
import { migrateTaskWorkflow } from './migrateTaskWorkflow';
import { updateTaskStatuses } from './updateTaskStatuses';
import { updateAllMembersToAdmin } from './updateAllMembersToAdmin';
import { updateGroupSettingsForSupervisors } from './updateGroupSettingsForSupervisors';
import { fixUnknownDisplayNames } from './fixUnknownDisplayNames';
import { fixKpiRecordsForeignKey } from './fixKpiRecordsForeignKey';
import { checkDatabaseSchema } from './checkDatabaseSchema';
import { checkKpiForeignKeys } from './checkKpiForeignKeys';

async function runFullMigration() {
  const steps: { name: string; fn: () => Promise<void> }[] = [
    { name: 'Add missing task status enum', fn: addMissingTaskStatusEnum },
    { name: 'Add missing columns', fn: addMissingColumns },
    { name: 'Migrate task workflow', fn: migrateTaskWorkflow },
    { name: 'Update task statuses', fn: updateTaskStatuses },
    { name: 'Update all members to admin', fn: updateAllMembersToAdmin },
    { name: 'Update group settings for supervisors', fn: updateGroupSettingsForSupervisors },
    { name: 'Fix unknown display names', fn: fixUnknownDisplayNames },
    { name: 'Fix KPI records foreign key', fn: fixKpiRecordsForeignKey },
    { name: 'Check database schema', fn: checkDatabaseSchema },
    { name: 'Check KPI foreign keys', fn: checkKpiForeignKeys }
  ];

  logger.info('🚀 Starting full migration process...');

  for (const step of steps) {
    try {
      logger.info(`\n➡️  ${step.name}`);
      await step.fn();
      logger.info(`✅ Completed: ${step.name}`);
    } catch (error) {
      logger.error(`❌ Step failed: ${step.name}`, error);
      throw error;
    }
  }

  logger.info('\n🎉 All migration steps completed successfully');
}

if (require.main === module) {
  runFullMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { runFullMigration };
