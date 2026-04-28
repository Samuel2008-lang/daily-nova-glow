import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const isNative = Capacitor.isNativePlatform();
let taskChannelReady = false;

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
      await ensureTaskChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: config.id,
            title: config.title,
            body: config.body,
            channelId: "task-reminders",
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

    await this.scheduleDailyReminder({
      id: 1001,
      title: "📖 Write in your Diary",
      body: "Take a moment to reflect on your day!",
      hour,
      minute,
    });

    const followHour = (hour + 2) % 24;
    await this.scheduleDailyReminder({
      id: 1011,
      title: "📖 Diary Reminder",
      body: "You haven't written in your diary today. Don't miss it!",
      hour: followHour,
      minute,
    });
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

    await this.scheduleDailyReminder({
      id: 1002,
      title: "✍️ Journal Time",
      body: "Time to write today's journal entry!",
      hour,
      minute,
    });

    const followHour = (hour + 2) % 24;
    await this.scheduleDailyReminder({
      id: 1012,
      title: "✍️ Journal Reminder",
      body: "You haven't journaled today. Take a few minutes!",
      hour: followHour,
      minute,
    });
  },

  async scheduleHabitReminder(habitId: string, habitName: string, hour: number, minute: number) {
    if (!isNative) return;
    const granted = await this.requestPermission();
    if (!granted) return;

    const idNum = Math.abs(hashCode(habitId)) % 50000;

    await this.cancelNotification(5000 + idNum);
    await this.cancelNotification(5500 + idNum);

    await this.scheduleDailyReminder({
      id: 5000 + idNum,
      title: `🌱 Habit: ${habitName}`,
      body: `Time to complete: ${habitName}`,
      hour,
      minute,
    });

    const followHour = (hour + 3) % 24;
    await this.scheduleDailyReminder({
      id: 5500 + idNum,
      title: `🌱 Habit Reminder: ${habitName}`,
      body: `Did you complete "${habitName}" today?`,
      hour: followHour,
      minute,
    });
  },

  async cancelHabitReminder(habitId: string) {
    if (!isNative) return;
    const idNum = Math.abs(hashCode(habitId)) % 50000;
    await this.cancelNotification(5000 + idNum);
    await this.cancelNotification(5500 + idNum);
  },

  async setupDailyReminders() {
    if (!isNative) return;
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

async function ensureTaskChannel() {
  if (taskChannelReady || Capacitor.getPlatform() !== "android") return;
  try {
    await LocalNotifications.createChannel({
      id: "task-reminders",
      name: "Task reminders",
      description: "Task alarms and follow-up reminders",
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
    });
    taskChannelReady = true;
  } catch {
    taskChannelReady = true;
  }
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}
