import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { ReminderSound } from "@/lib/storage";

const isNative = Capacitor.isNativePlatform();

type AlertLevel = "light" | "medium" | "strong";

const soundFileFor = (sound: ReminderSound = "gentle") =>
  sound === "classic" ? "dailynova_alarm_classic.wav" : "dailynova_alarm_short.wav";

const channelForAlert = (level: AlertLevel, sound: ReminderSound = "gentle"): string => {
  return `dailynova-reminders-${level}-${sound}-pink-v2`;
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
    route?: string;
  }) {
    if (!isNative) return;
    try {
      await this.ensureAlarmsChannel();
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
            channelId: channelForAlert("medium", "gentle"),
            smallIcon: "ic_stat_icon_config_sample",
            iconColor: "#ff69b4",
            group: "daily-reminders",
            autoCancel: true,
            extra: { route: config.route || "/" },
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
    notificationSound?: ReminderSound;
    taskId?: string;
    snoozeMinutes?: number;
    route?: string;
  }) {
    if (!isNative) return;
    const alertLevel = config.alertLevel || "light";
    const notificationSound = config.notificationSound || "gentle";
    const channelId = channelForAlert(alertLevel, notificationSound);

    try {
      await this.ensureAlarmsChannel();
      const repeatEvery = Math.max(1, config.repeat?.every || 1);
      const repeatEveryMs = config.repeat ? intervalMs(config.repeat.unit, repeatEvery) : undefined;
      const repeatsForever = Capacitor.getPlatform() === "android" && !!config.repeat && !config.repeat.count && !config.repeat.until;
      const occurrences: Date[] = [config.at];

      if (config.repeat && !repeatsForever) {
        const untilDate = config.repeat.until ? new Date(`${config.repeat.until}T23:59:59`) : null;
        // Hard ceiling on occurrences to avoid OS notification limits.
        const MAX = 500;
        const targetCount = config.repeat.count && config.repeat.count > 0
          ? Math.min(config.repeat.count, MAX)
          : MAX;

        const stepFromUnit = (d: Date): Date => {
          const next = new Date(d);
          switch (config.repeat!.unit) {
            case "minute": next.setMinutes(next.getMinutes() + repeatEvery); break;
            case "hour":   next.setHours(next.getHours() + repeatEvery); break;
            case "day":    next.setDate(next.getDate() + repeatEvery); break;
            case "week":   next.setDate(next.getDate() + repeatEvery * 7); break;
            case "month":  next.setMonth(next.getMonth() + repeatEvery); break;
            case "year":   next.setFullYear(next.getFullYear() + repeatEvery); break;
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

      await this.cancelNotification(config.id);
      const notifications = occurrences.filter((date) => date > new Date()).map((date, idx) => ({
        id: repeatsForever ? config.id : config.id + idx,
        title: config.title,
        body: config.body,
        largeBody: config.body,
        schedule: { 
          at: date, 
          allowWhileIdle: true,
          repeats: repeatsForever || undefined,
        },
        channelId,
        smallIcon: "ic_stat_icon_config_sample",
        iconColor: "#ff69b4",
        group: `task-${config.id}`,
        threadIdentifier: `task-${config.id}`,
        autoCancel: alertLevel !== "strong",
        ongoing: alertLevel === "strong",
        sound: soundFileFor(notificationSound),
        actionTypeId: alertLevel === "light" ? undefined : "dailynova_reminder_actions",
        extra: {
          taskId: config.taskId,
          taskGroupId: config.id,
          visibleId: config.id,
          route: config.route || "/tasks",
          alertLevel,
          notificationSound,
          snoozeMinutes: config.snoozeMinutes || 10,
          importance: alertLevel === "strong" ? 5 : alertLevel === "medium" ? 5 : 4,
          fullScreen: alertLevel !== "light",
          timeoutAfterMs: alertLevel === "light" ? 7000 : undefined,
          insistent: alertLevel === "strong",
          repeatEveryMs,
          repeatIndex: idx,
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
      await LocalNotifications.registerActionTypes?.({
        types: [
          {
            id: "dailynova_reminder_actions",
            actions: [
              { id: "snooze", title: "Snooze" },
              { id: "complete", title: "Complete" },
            ],
          },
        ],
      });

      for (const sound of ["gentle", "classic"] as ReminderSound[]) {
        await LocalNotifications.createChannel?.({
          id: channelForAlert("light", sound),
          name: `Reminders Light (${sound})`,
          description: "Standard notification with one short sound.",
          importance: 3,
          visibility: 1,
          vibration: true,
          lights: true,
          lightColor: "#ff69b4",
          sound: soundFileFor(sound),
        } as any);

        await LocalNotifications.createChannel?.({
          id: channelForAlert("medium", sound),
          name: `Reminders Medium (${sound})`,
          description: "High priority full-screen reminder with one short sound.",
          importance: 5,
          visibility: 1,
          vibration: true,
          lights: true,
          lightColor: "#ff69b4",
          sound: soundFileFor(sound),
        } as any);

        await LocalNotifications.createChannel?.({
          id: channelForAlert("strong", sound),
          name: `Reminders Strong (${sound})`,
          description: "Maximum priority full-screen reminder that keeps sounding until handled.",
          importance: 5,
          visibility: 1,
          vibration: true,
          lights: true,
          lightColor: "#ff69b4",
          sound: soundFileFor(sound),
        } as any);
      }
    } catch (err) {
      console.error("Failed to create alarm channels:", err);
    }
  },

  async cancelNotification(id: number) {
    if (!isNative) return;
    try {
      const ids = Array.from({ length: 500 }, (_, i) => ({ id: id + i }));
      await LocalNotifications.cancel({ notifications: ids });
      await LocalNotifications.removeDeliveredNotifications?.({ notifications: ids } as any);
    } catch (err) {
      console.error("Failed to cancel notification:", err);
    }
  },

  async clearVisibleNotification(id: number) {
    if (!isNative) return;
    try {
      await LocalNotifications.removeDeliveredNotifications?.({ notifications: [{ id }] } as any);
    } catch {}
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
    await this.scheduleDailyReminder({ id: 1001, title: "Diary reminder", body: "Time to write your diary entry.", hour, minute, route: "/diary" });
    const followHour = (hour + 2) % 24;
    await this.scheduleDailyReminder({ id: 1011, title: "Diary reminder", body: "Your diary is ready when you are.", hour: followHour, minute, route: "/diary" });
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
    await this.scheduleDailyReminder({ id: 1002, title: "Journal reminder", body: "Time to write in your journal.", hour, minute, route: "/journal" });
    const followHour = (hour + 2) % 24;
    await this.scheduleDailyReminder({ id: 1012, title: "Journal reminder", body: "Your journal is ready when you are.", hour: followHour, minute, route: "/journal" });
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

function intervalMs(unit: "minute" | "hour" | "day" | "week" | "month" | "year", every: number): number {
  switch (unit) {
    case "minute": return every * 60 * 1000;
    case "hour": return every * 60 * 60 * 1000;
    case "day": return every * 24 * 60 * 60 * 1000;
    case "week": return every * 7 * 24 * 60 * 60 * 1000;
    case "month": return every * 30 * 24 * 60 * 60 * 1000;
    case "year": return every * 365 * 24 * 60 * 60 * 1000;
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
