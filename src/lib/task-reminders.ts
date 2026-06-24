import { storage, Task } from "@/lib/storage";
import { notificationService } from "@/lib/notifications";

const minutes = (value: number) => value * 60 * 1000;

const nextFutureOccurrence = (start: Date, task: Task): Date => {
  const repeat = getTaskRepeatConfig(task);
  if (!repeat || start > new Date()) return start;

  const next = new Date(start);
  const now = new Date();
  const every = Math.max(1, repeat.every || 1);
  while (next <= now) {
    switch (repeat.unit) {
      case "minute": next.setMinutes(next.getMinutes() + every); break;
      case "hour": next.setHours(next.getHours() + every); break;
      case "day": next.setDate(next.getDate() + every); break;
      case "week": next.setDate(next.getDate() + every * 7); break;
      case "month": next.setMonth(next.getMonth() + every); break;
      case "year": next.setFullYear(next.getFullYear() + every); break;
    }
  }
  return next;
};

export const getTaskNotificationId = (taskId: string, offset: number) => {
  const numeric = Number.parseInt(taskId, 10);
  if (Number.isFinite(numeric)) return offset + (numeric % 100000);
  let hash = 0;
  for (let i = 0; i < taskId.length; i++) hash = ((hash << 5) - hash + taskId.charCodeAt(i)) | 0;
  return offset + (Math.abs(hash) % 100000);
};

export const getTaskRepeatConfig = (task: Task) => task.repeat && task.repeat.unit !== 'none'
  ? {
      unit: task.repeat.unit as 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year',
      every: Math.max(1, task.repeat.every || 1),
      count: task.duration?.type === 'count' ? task.duration.count : undefined,
      until: task.duration?.type === 'until' ? task.duration.until : undefined,
    }
  : undefined;

export const parseTaskReminder = (text: string): Pick<Task, "dueDate" | "dueTime"> => {
  const lower = text.toLowerCase();
  const timeMatch = lower.match(/\b(?:by|at|around|before)?\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|am|pm)?\b/);
  if (!timeMatch) return {};

  let hour = Number.parseInt(timeMatch[1], 10);
  const minute = Number.parseInt(timeMatch[2] || "0", 10);
  const meridiem = timeMatch[3]?.replace(/\./g, "");
  if (Number.isNaN(hour) || hour > 23 || minute > 59) return {};

  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;

  const due = new Date();
  if (/\btomorrow\b/.test(lower)) due.setDate(due.getDate() + 1);
  due.setHours(hour, minute, 0, 0);
  if (!/\btoday\b/.test(lower) && !/\btomorrow\b/.test(lower) && due <= new Date()) {
    due.setDate(due.getDate() + 1);
  }

  return {
    dueDate: `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`,
    dueTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
};

export const scheduleTaskNotifications = async (task: Task) => {
  if (!task.dueDate || !task.dueTime) return;
  let taskTime = new Date(`${task.dueDate}T${task.dueTime}`);
  if (Number.isNaN(taskTime.getTime())) return;
  taskTime = nextFutureOccurrence(taskTime, task);
  if (taskTime <= new Date()) return;

  const label = taskTime.toDateString() === new Date().toDateString() ? "Today" : task.dueDate;
  const repeat = getTaskRepeatConfig(task);

  await notificationService.scheduleTaskAlarm({
    id: getTaskNotificationId(task.id, 2000),
    title: task.title,
    body: `${label} · ${task.dueTime}`,
    at: taskTime,
    repeat,
    alertLevel: task.alertLevel || 'light',
    notificationSound: task.notificationSound || 'gentle',
    taskId: task.id,
    snoozeMinutes: task.snoozeMinutes || 10,
    route: "/tasks",
  });

  if (task.reminderBefore) {
    const beforeTime = new Date(taskTime.getTime() - minutes(task.reminderBefore));
    if (beforeTime > new Date()) {
      await notificationService.scheduleTaskAlarm({
        id: getTaskNotificationId(task.id, 3000),
        title: "Daily Nova reminder",
        body: `${task.title} · ${task.reminderBefore} minutes remaining`,
        at: beforeTime,
        alertLevel: task.alertLevel || 'light',
        notificationSound: task.notificationSound || 'gentle',
        taskId: task.id,
        snoozeMinutes: task.snoozeMinutes || 10,
        route: "/tasks",
      });
    }
  }

  if (task.reminderAfter) {
    await notificationService.scheduleTaskAlarm({
      id: getTaskNotificationId(task.id, 4000),
      title: task.title,
      body: `Did you complete it?`,
      at: new Date(taskTime.getTime() + minutes(task.reminderAfter)),
      alertLevel: task.alertLevel || 'light',
      notificationSound: task.notificationSound || 'gentle',
      taskId: task.id,
      snoozeMinutes: task.snoozeMinutes || 10,
      route: "/tasks",
    });
  }
};

export const cancelTaskNotifications = async (task: Task) => {
  await notificationService.cancelNotification(getTaskNotificationId(task.id, 2000));
  await notificationService.cancelNotification(getTaskNotificationId(task.id, 3000));
  await notificationService.cancelNotification(getTaskNotificationId(task.id, 4000));
};

export const rescheduleAllTaskNotifications = async () => {
  const tasks = storage.getTasks().filter((task) => !task.completed && task.dueDate && task.dueTime);
  for (const task of tasks) {
    await scheduleTaskNotifications(task);
  }
};