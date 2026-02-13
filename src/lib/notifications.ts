import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const isNative = Capacitor.isNativePlatform();

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
          },
        ],
      });
    } catch (err) {
      console.error("Failed to schedule notification:", err);
    }
  },

  async scheduleTaskAlarm(config: {
    id: number;
    title: string;
    body: string;
    at: Date;
  }) {
    if (!isNative) return;
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: config.id,
            title: config.title,
            body: config.body,
            schedule: { at: config.at, allowWhileIdle: true },
          },
        ],
      });
    } catch (err) {
      console.error("Failed to schedule task alarm:", err);
    }
  },

  async cancelNotification(id: number) {
    if (!isNative) return;
    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
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

  /** Call this once on app start to set up all enabled reminders */
  async setupDailyReminders() {
    if (!isNative) return;

    const granted = await this.requestPermission();
    if (!granted) return;

    // Cancel existing daily reminders first
    await this.cancelNotification(1001);
    await this.cancelNotification(1002);
    await this.cancelNotification(1003);
    await this.cancelNotification(1004);

    const diaryEnabled = localStorage.getItem("dailynova_notify_diary") === "true";
    const journalEnabled = localStorage.getItem("dailynova_notify_journal") === "true";
    const habitsEnabled = localStorage.getItem("dailynova_notify_habits") === "true";
    const tasksEnabled = localStorage.getItem("dailynova_notify_tasks") === "true";

    const hour = parseInt(localStorage.getItem("dailynova_notify_hour") || "20", 10);
    const minute = parseInt(localStorage.getItem("dailynova_notify_minute") || "0", 10);

    if (diaryEnabled) {
      await this.scheduleDailyReminder({
        id: 1001,
        title: "📖 Write in your Diary",
        body: "You haven't written in your diary today. Take a moment to reflect!",
        hour,
        minute,
      });
    }

    if (journalEnabled) {
      await this.scheduleDailyReminder({
        id: 1002,
        title: "✍️ Journal Time",
        body: "Don't forget to write in your journal today!",
        hour,
        minute: Math.min(minute + 5, 59),
      });
    }

    if (habitsEnabled) {
      await this.scheduleDailyReminder({
        id: 1003,
        title: "🎯 Track Your Habits",
        body: "Have you completed your habits today? Check them off!",
        hour,
        minute: Math.min(minute + 10, 59),
      });
    }

    if (tasksEnabled) {
      await this.scheduleDailyReminder({
        id: 1004,
        title: "✅ Pending Tasks",
        body: "You have tasks waiting. Stay productive!",
        hour,
        minute: Math.min(minute + 15, 59),
      });
    }
  },
};
