// Backfill script: set status to 'submitted' for tasks that have submissions/review pending
// and currently in a non-terminal state (pending/in_progress/overdue), and backfill submittedAt.

import 'reflect-metadata';
import moment from 'moment-timezone';
import { AppDataSource } from '@/utils/database';
import { Task } from '@/models';

async function run() {
  const groupArg = process.argv.find(a => a.startsWith('--group='));
  const lineGroupId = groupArg ? groupArg.split('=')[1] : undefined;

  try {
    await AppDataSource.initialize();

    const taskRepo = AppDataSource.getRepository(Task);
    const groupRepo = AppDataSource.getRepository('groups' as any);

    let groupIdFilter: string | undefined;
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
        const wf: any = (task as any).workflow || {};
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
        let submittedAt: Date | undefined = (task as any).submittedAt || undefined;
        if (!submittedAt) {
          if (Array.isArray(submissions) && submissions.length > 0) {
            const times = submissions
              .map((s: any) => (s?.submittedAt ? new Date(s.submittedAt) : undefined))
              .filter(Boolean) as Date[];
            if (times.length > 0) {
              submittedAt = new Date(Math.min(...times.map(t => t.getTime())));
            }
          }
        }

        // Patch entity
        (task as any).submittedAt = submittedAt || new Date();
        task.status = 'submitted';

        await taskRepo.save(task);
        updated++;
      } catch (e) {
        console.warn('⚠️ Failed to backfill task', task.id, e);
      }
    }

    console.log(`✅ Backfill done. Updated ${updated} tasks${lineGroupId ? ` in group ${lineGroupId}` : ''}.`);
  } catch (err) {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
  } finally {
    try { await AppDataSource.destroy(); } catch {}
  }
}

if (require.main === module) {
  run();
}

export { run };

