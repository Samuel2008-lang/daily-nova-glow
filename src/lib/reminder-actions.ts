import { storage, Task } from "@/lib/storage";
import { notificationService } from "@/lib/notifications";
import { cancelTaskNotifications, getTaskNotificationId } from "@/lib/task-reminders";

export interface ReminderActionPayload {
  taskId?: string;
  visibleId?: number;
  title?: string;
  alertLevel?: "light" | "medium" | "strong";
  notificationSound?: "gentle" | "classic";
  snoozeMinutes?: number;
}

const getTask = (taskId?: string): Task | undefined => {
  if (!taskId) return undefined;
  return storage.getTasks().find((task) => task.id === taskId);
};

export const completeReminder = async (payload: ReminderActionPayload) => {
  if (payload.visibleId) await notificationService.clearVisibleNotification(payload.visibleId);
  const task = getTask(payload.taskId);
  if (!task) return;
  storage.saveTasks(storage.getTasks().map((t) => (t.id === task.id ? { ...t, completed: true } : t)));
  await cancelTaskNotifications(task);
};

export const snoozeReminder = async (payload: ReminderActionPayload) => {
  if (payload.visibleId) await notificationService.clearVisibleNotification(payload.visibleId);
  if (!payload.taskId) return;
  const task = getTask(payload.taskId);
  const snoozeMinutes = Math.max(1, Number(payload.snoozeMinutes || task?.snoozeMinutes || 10));
  await notificationService.scheduleTaskAlarm({
    id: getTaskNotificationId(payload.taskId, 9000),
    title: task?.title || payload.title || "Reminder",
    body: `Snoozed for ${snoozeMinutes} minutes`,
    at: new Date(Date.now() + snoozeMinutes * 60 * 1000),
    alertLevel: task?.alertLevel || payload.alertLevel || "medium",
    notificationSound: task?.notificationSound || payload.notificationSound || "gentle",
    taskId: payload.taskId,
    snoozeMinutes,
    route: "/tasks",
  });
};
