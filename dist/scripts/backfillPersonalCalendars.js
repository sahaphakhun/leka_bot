"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const database_1 = require("@/utils/database");
const models_1 = require("@/models");
const GoogleService_1 = require("@/services/GoogleService");
async function backfill() {
    await (0, database_1.initializeDatabase)();
    const taskRepo = database_1.AppDataSource.getRepository(models_1.Task);
    const userRepo = database_1.AppDataSource.getRepository(models_1.User);
    const google = new GoogleService_1.GoogleService();
    const tasks = await taskRepo.find({ relations: ['assignedUsers', 'createdByUser'] });
    let created = 0, updated = 0;
    for (const task of tasks) {
        try {
            const map = task.googleEventIds || {};
            const participants = new Set();
            if (task.createdBy)
                participants.add(task.createdBy);
            const reviewerId = task.workflow?.review?.reviewerUserId;
            if (reviewerId)
                participants.add(reviewerId);
            for (const u of (task.assignedUsers || []))
                participants.add(u.id);
            let changed = false;
            for (const userId of participants) {
                if (!map[userId]) {
                    try {
                        const { calendarId, eventId } = await google.syncTaskToUserCalendar(task, userId);
                        map[userId] = { calendarId, eventId };
                        changed = true;
                        created++;
                    }
                    catch (err) {
                        console.warn('Failed to create event for user', userId, 'task', task.id, err);
                    }
                }
            }
            // Remove stale mappings for users no longer involved
            for (const userId of Object.keys(map)) {
                if (!participants.has(userId)) {
                    try {
                        await google.removeTaskFromUserCalendar(task, userId);
                    }
                    catch (err) {
                        console.warn('Failed to remove stale event for user', userId, 'task', task.id, err);
                    }
                    delete map[userId];
                    changed = true;
                }
            }
            if (changed) {
                task.googleEventIds = map;
                await taskRepo.save(task);
                updated++;
            }
        }
        catch (err) {
            console.warn('Backfill error for task', task.id, err);
        }
    }
    console.log(`Backfill completed. New events: ${created}, tasks updated: ${updated}`);
    await (0, database_1.closeDatabase)();
}
backfill().catch(async (err) => {
    console.error('Backfill failed:', err);
    try {
        await (0, database_1.closeDatabase)();
    }
    catch { }
    process.exit(1);
});
//# sourceMappingURL=backfillPersonalCalendars.js.map