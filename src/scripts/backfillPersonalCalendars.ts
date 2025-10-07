import 'reflect-metadata';
import { AppDataSource, initializeDatabase, closeDatabase } from '@/utils/database';
import { Task, User } from '@/models';
import { GoogleService } from '@/services/GoogleService';

async function backfill() {
  await initializeDatabase();
  const taskRepo = AppDataSource.getRepository(Task);
  const userRepo = AppDataSource.getRepository(User);
  const google = new GoogleService();

  const tasks = await taskRepo.find({ relations: ['assignedUsers', 'createdByUser'] });
  let created = 0, updated = 0;

  for (const task of tasks) {
    try {
      const map: Record<string, { calendarId: string; eventId: string }> = (task as any).googleEventIds || {};
      const participants = new Set<string>();
      if (task.createdBy) participants.add(task.createdBy);
      const reviewerId = (task.workflow as any)?.review?.reviewerUserId;
      if (reviewerId) participants.add(reviewerId);
      for (const u of (task.assignedUsers || [])) participants.add(u.id);

      let changed = false;
      for (const userId of participants) {
        if (!map[userId]) {
          try {
            const { calendarId, eventId } = await google.syncTaskToUserCalendar(task as any, userId);
            map[userId] = { calendarId, eventId };
            changed = true;
            created++;
          } catch (err) {
            console.warn('Failed to create event for user', userId, 'task', task.id, err);
          }
        }
      }

      // Remove stale mappings for users no longer involved
      for (const userId of Object.keys(map)) {
        if (!participants.has(userId)) {
          try {
            await google.removeTaskFromUserCalendar(task as any, userId);
          } catch (err) {
            console.warn('Failed to remove stale event for user', userId, 'task', task.id, err);
          }
          delete map[userId];
          changed = true;
        }
      }

      if (changed) {
        (task as any).googleEventIds = map;
        await taskRepo.save(task);
        updated++;
      }
    } catch (err) {
      console.warn('Backfill error for task', task.id, err);
    }
  }

  console.log(`Backfill completed. New events: ${created}, tasks updated: ${updated}`);
  await closeDatabase();
}

backfill().catch(async (err) => {
  console.error('Backfill failed:', err);
  try { await closeDatabase(); } catch {}
  process.exit(1);
});

