import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const isNative = Capacitor.isNativePlatform();

type AlertLevel = "light" | "medium" | "strong";

const channelForAlert = (level: AlertLevel): string => {
  if (level === "strong") return "alarms-strong";
  if (level === "medium") return "alarms-medium";
  return "alarms-light";
};

export const notificationService = {
  async requestPermission(): Promise<boolean> {
    if (!isNative) return false;
    try {
      const result = await LocalNotifications.requestPermissions();
      return result.display === "granted";
    } catch {
      return false;
    }
  },

  async scheduleDailyReminder(config: {
    id: number;
    title: string;
    body: string;
    hour: number;
    minute: number;
  }) {
    if (!isNative) return;
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: config.id,
            title: config.title,
            body: config.body,
            schedule: {
              on: { hour: config.hour, minute: config.minute },
              allowWhileIdle: true,
            },
            channelId: "alarms-medium",
            smallIcon: "ic_stat_icon",
            iconColor: "#7c3aed",
            group: "daily-reminders",
          },
        ],
      });
    } catch (err) {
      console.error("Failed to schedule notification:", err);
    }
  },

  /**
   * Schedule a task alarm. Supports custom repeat intervals (every N minutes/hours/days/etc.)
   * by expanding into multiple absolute-time notifications, capped by `count` or `until`.
   */
  async scheduleTaskAlarm(config: {
    id: number;
    title: string;
    body: string;
    at: Date;
    repeat?: {
      unit: "minute" | "hour" | "day" | "week" | "month" | "year";
      every?: number;
      count?: number;
      until?: string; // YYYY-MM-DD
    };
    alertLevel?: AlertLevel;
  }) {
    if (!isNative) return;
    const alertLevel = config.alertLevel || "light";
    const channelId = channelForAlert(alertLevel);

    try {
      const occurrences: Date[] = [config.at];

      if (config.repeat) {
        const every = Math.max(1, config.repeat.every || 1);
        const untilDate = config.repeat.until ? new Date(`${config.repeat.until}T23:59:59`) : null;
        // Hard ceiling on occurrences to avoid OS notification limits.
        const MAX = 60;
        const targetCount = config.repeat.count && config.repeat.count > 0
          ? Math.min(config.repeat.count, MAX)
          : MAX;

        const stepFromUnit = (d: Date): Date => {
          const next = new Date(d);
          switch (config.repeat!.unit) {
            case "minute": next.setMinutes(next.getMinutes() + every); break;
            case "hour":   next.setHours(next.getHours() + every); break;
            case "day":    next.setDate(next.getDate() + every); break;
            case "week":   next.setDate(next.getDate() + every * 7); break;
            case "month":  next.setMonth(next.getMonth() + every); break;
            case "year":   next.setFullYear(next.getFullYear() + every); break;
          }
          return next;
        };

        let current = config.at;
        while (occurrences.length < targetCount) {
          current = stepFromUnit(current);
          if (untilDate && current > untilDate) break;
          occurrences.push(current);
        }
      }

      const notifications = occurrences.map((date, idx) => ({
        id: config.id + idx, // unique per occurrence
        title: config.title,
        body: config.body,
        schedule: { 
          at: date, 
          allowWhileIdle: true,
        },
        channelId,
        smallIcon: "ic_stat_icon",
        iconColor: "#7c3aed",
        group: `task-${config.id}`,
        // Extra data for potential native listener
        extra: {
          taskGroupId: config.id,
          alertLevel,
          importance: alertLevel === "strong" ? 5 : alertLevel === "medium" ? 5 : 4,
          fullScreen: alertLevel !== "light",
        },
      }));

      await LocalNotifications.schedule({ notifications });
    } catch (err) {
      console.error("Failed to schedule task alarm:", err);
    }
  },

  /** Create alarm channels (call once on app startup). */
  async ensureAlarmsChannel() {
    if (!isNative) return;
    try {
      await LocalNotifications.createChannel?.({
        id: "alarms-light",
        name: "Reminders (Light)",
        description: "Standard notification with a short sound.",
        importance: 3,
        visibility: 1,
        vibration: true,
      } as any);

      await LocalNotifications.createChannel?.({
        id: "alarms-medium",
        name: "Reminders (Medium)",
        description: "High priority notification that pops up on screen.",
        importance: 4,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: "#7c3aed",
      } as any);

      await LocalNotifications.createChannel?.({
        id: "alarms-strong",
        name: "Reminders (Strong)",
        description: "Maximum priority alert for important tasks.",
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: "#7c3aed",
      } as any);
    } catch (err) {
      console.error("Failed to create alarm channels:", err);
    }
  },

  async cancelNotification(id: number) {
    if (!isNative) return;
    try {
      const ids = Array.from({ length: 60 }, (_, i) => ({ id: id + i }));
      await LocalNotifications.cancel({ notifications: ids });
    } catch (err) {
      console.error("Failed to cancel notification:", err);
    }
  },

  async cancelAll() {
    if (!isNative) return;
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
    } catch (err) {
      console.error("Failed to cancel notifications:", err);
    }
  },

  async setupDiaryReminder() {
    if (!isNative) return;
    const granted = await this.requestPermission();
    if (!granted) return;
    await this.cancelNotification(1001);
    await this.cancelNotification(1011);
    const enabled = localStorage.getItem("dailynova_notify_diary") === "true";
    if (!enabled) return;
    const hour = parseInt(localStorage.getItem("dailynova_diary_hour") || "21", 10);
    const minute = parseInt(localStorage.getItem("dailynova_diary_minute") || "0", 10);
    await this.scheduleDailyReminder({ id: 1001, title: "📖 Write in your Diary", body: "Take a moment to reflect on your day!", hour, minute });
    const followHour = (hour + 2) % 24;
    await this.scheduleDailyReminder({ id: 1011, title: "📖 Diary Reminder", body: "You haven't written in your diary today. Don't miss it!", hour: followHour, minute });
  },

  async setupJournalReminder() {
    if (!isNative) return;
    const granted = await this.requestPermission();
    if (!granted) return;
    await this.cancelNotification(1002);
    await this.cancelNotification(1012);
    const enabled = localStorage.getItem("dailynova_notify_journal") === "true";
    if (!enabled) return;
    const hour = parseInt(localStorage.getItem("dailynova_journal_hour") || "21", 10);
    const minute = parseInt(localStorage.getItem("dailynova_journal_minute") || "0", 10);
    await this.scheduleDailyReminder({ id: 1002, title: "✍️ Journal Time", body: "Time to write today's journal entry!", hour, minute });
    const followHour = (hour + 2) % 24;
    await this.scheduleDailyReminder({ id: 1012, title: "✍️ Journal Reminder", body: "You haven't journaled today. Take a few minutes!", hour: followHour, minute });
  },

  async scheduleHabitReminder(habitId: string, habitName: string, hour: number, minute: number) {
    if (!isNative) return;
    const granted = await this.requestPermission();
    if (!granted) return;
    const idNum = Math.abs(hashCode(habitId)) % 50000;
    await this.cancelNotification(5000 + idNum);
    await this.cancelNotification(5500 + idNum);
    await this.scheduleDailyReminder({ id: 5000 + idNum, title: `🌱 Habit: ${habitName}`, body: `Time to complete: ${habitName}`, hour, minute });
    const followHour = (hour + 3) % 24;
    await this.scheduleDailyReminder({ id: 5500 + idNum, title: `🌱 Habit Reminder: ${habitName}`, body: `Did you complete "${habitName}" today?`, hour: followHour, minute });
  },

  async cancelHabitReminder(habitId: string) {
    if (!isNative) return;
    const idNum = Math.abs(hashCode(habitId)) % 50000;
    await this.cancelNotification(5000 + idNum);
    await this.cancelNotification(5500 + idNum);
  },

  async setupDailyReminders() {
    if (!isNative) return;
    await this.ensureAlarmsChannel();
    await this.setupDiaryReminder();
    await this.setupJournalReminder();
    const granted = await this.requestPermission();
    if (!granted) return;
    await this.cancelNotification(1003);
    await this.cancelNotification(1004);
    const hour = parseInt(localStorage.getItem("dailynova_notify_hour") || "20", 10);
    const minute = parseInt(localStorage.getItem("dailynova_notify_minute") || "0", 10);
    const habitsEnabled = localStorage.getItem("dailynova_notify_habits") === "true";
    const tasksEnabled = localStorage.getItem("dailynova_notify_tasks") === "true";
    if (habitsEnabled) {
      await this.scheduleDailyReminder({ id: 1003, title: "🎯 Track Your Habits", body: "Have you completed your habits today? Check them off!", hour, minute: Math.min(minute + 10, 59) });
    }
    if (tasksEnabled) {
      await this.scheduleDailyReminder({ id: 1004, title: "✅ Pending Tasks", body: "You have tasks waiting. Stay productive!", hour, minute: Math.min(minute + 15, 59) });
    }
  },
};

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}
