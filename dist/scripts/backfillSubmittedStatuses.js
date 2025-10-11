"use strict";
// Backfill script: set status to 'submitted' for tasks that have submissions/review pending
// and currently in a non-terminal state (pending/in_progress/overdue), and backfill submittedAt.
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
require("reflect-metadata");
const database_1 = require("@/utils/database");
const models_1 = require("@/models");
async function run() {
    const groupArg = process.argv.find(a => a.startsWith('--group='));
    const lineGroupId = groupArg ? groupArg.split('=')[1] : undefined;
    try {
        await database_1.AppDataSource.initialize();
        const taskRepo = database_1.AppDataSource.getRepository(models_1.Task);
        const groupRepo = database_1.AppDataSource.getRepository('groups');
        let groupIdFilter;
        if (lineGroupId) {
            const group = await groupRepo.findOne({ where: { lineGroupId } });
            if (!group) {
                console.error(`❌ Group not found for LINE ID: ${lineGroupId}`);
                process.exit(1);
            }
            groupIdFilter = group.id;
            console.log(`🔎 Filtering by group ${group.name} (${groupIdFilter})`);
        }
        const qb = taskRepo
            .createQueryBuilder('task')
            .leftJoinAndSelect('task.group', 'group')
            .where('task.status IN (:...st)', { st: ['pending', 'in_progress', 'overdue'] });
        if (groupIdFilter) {
            qb.andWhere('task.groupId = :gid', { gid: groupIdFilter });
        }
        const tasks = await qb.getMany();
        let updated = 0;
        for (const task of tasks) {
            try {
                const wf = task.workflow || {};
                const submissions = wf?.submissions;
                const hasSubmission = Array.isArray(submissions)
                    ? submissions.length > 0
                    : submissions && typeof submissions === 'object'
                        ? Object.keys(submissions).length > 0
                        : false;
                const review = wf?.review;
                const reviewRequested = !!(review && (review.status === 'pending' || review.reviewRequestedAt));
                if (!hasSubmission && !reviewRequested) {
                    continue;
                }
                // Determine submittedAt to backfill
                let submittedAt = task.submittedAt || undefined;
                if (!submittedAt) {
                    if (Array.isArray(submissions) && submissions.length > 0) {
                        const times = submissions
                            .map((s) => (s?.submittedAt ? new Date(s.submittedAt) : undefined))
                            .filter(Boolean);
                        if (times.length > 0) {
                            submittedAt = new Date(Math.min(...times.map(t => t.getTime())));
                        }
                    }
                }
                // Patch entity
                task.submittedAt = submittedAt || new Date();
                task.status = 'submitted';
                await taskRepo.save(task);
                updated++;
            }
            catch (e) {
                console.warn('⚠️ Failed to backfill task', task.id, e);
            }
        }
        console.log(`✅ Backfill done. Updated ${updated} tasks${lineGroupId ? ` in group ${lineGroupId}` : ''}.`);
    }
    catch (err) {
        console.error('❌ Backfill failed:', err);
        process.exit(1);
    }
    finally {
        try {
            await database_1.AppDataSource.destroy();
        }
        catch { }
    }
}
if (require.main === module) {
    run();
}
//# sourceMappingURL=backfillSubmittedStatuses.js.map