// Recurring Task Service
// Re-export functions from api.js for backward compatibility

export async function getRecurringTasks(groupId) {
  const { listRecurringTasks } = await import("./api");
  return listRecurringTasks(groupId);
}

export async function createRecurringTask(groupId, taskData) {
  const { createRecurringTask: apiCreate } = await import("./api");
  return apiCreate(groupId, taskData);
}

export async function updateRecurringTask(groupId, taskId, taskData) {
  const { updateRecurringTask: apiUpdate } = await import("./api");
  return apiUpdate(groupId, taskId, taskData);
}

export async function deleteRecurringTask(groupId, taskId) {
  const { deleteRecurringTask: apiDelete } = await import("./api");
  return apiDelete(groupId, taskId);
}

export async function toggleRecurringTask(groupId, taskId, enabled) {
  const { toggleRecurringTask: apiToggle } = await import("./api");
  return apiToggle(groupId, taskId, enabled);
}

export async function getRecurringTaskHistory(groupId, taskId) {
  const { getRecurringTaskHistory: apiGetHistory } = await import("./api");
  return apiGetHistory(groupId, taskId);
}

export function parseRecurrencePattern(pattern) {
  // Parse recurrence pattern string
  // e.g., "DAILY", "WEEKLY:1,3,5", "MONTHLY:1,15", "CUSTOM:0 9 * * 1-5"
  const [type, value] = pattern.split(":");

  switch (type) {
    case "DAILY":
      return { type: "daily", description: "ทุกวัน" };
    case "WEEKLY": {
      const days = value ? value.split(",").map((d) => parseInt(d)) : [];
      const dayNames = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
      return {
        type: "weekly",
        days,
        description: `ทุก ${days.map((d) => dayNames[d]).join(", ")}`,
      };
    }
    case "MONTHLY": {
      const dates = value ? value.split(",").map((d) => parseInt(d)) : [];
      return {
        type: "monthly",
        dates,
        description: `ทุกวันที่ ${dates.join(", ")} ของเดือน`,
      };
    }
    case "QUARTERLY":
      return { type: "quarterly", description: "ทุก 3 เดือน" };
    case "CUSTOM":
      return { type: "custom", cron: value, description: "กำหนดเอง" };
    default:
      return { type: "unknown", description: pattern };
  }
}

export function generateRecurrencePattern(type, config) {
  switch (type) {
    case "daily":
      return "DAILY";
    case "weekly":
      return `WEEKLY:${config.days.join(",")}`;
    case "monthly":
      return `MONTHLY:${config.dates.join(",")}`;
    case "quarterly":
      return "QUARTERLY";
    case "custom":
      return `CUSTOM:${config.cron}`;
    default:
      return "";
  }
}
