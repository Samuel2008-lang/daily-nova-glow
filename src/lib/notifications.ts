import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { ReminderSound } from "@/lib/storage";

const isNative = Capacitor.isNativePlatform();

type AlertLevel = "light" | "medium" | "strong";

/**
 * Resolves the sound resource for a channel.
 * `system_*` names are translated natively into the phone's own
 * notification / ringtone / alarm tones (see scripts/patch-native.mjs).
 */
const soundFileFor = (sound: ReminderSound = "gentle") => {
  switch (sound) {
    case "classic": return "dailynova_alarm_classic.wav";
    case "system_notification": return "system_notification";
    case "system_ringtone": return "system_ringtone";
    case "system_alarm": return "system_alarm";
    default: return "dailynova_alarm_short.wav";
  }
};

export const REMINDER_SOUNDS: ReminderSound[] = [
  "gentle",
  "classic",
  "system_notification",
  "system_ringtone",
  "system_alarm",
];

const channelForAlert = (level: AlertLevel, sound: ReminderSound = "gentle"): string => {
  return `dailynova-reminders-${level}-${sound}-pink-v3`;
};

/**
 * Master reminder switches from Settings. A category that is switched OFF must
 * never fire, no matter what individual items are configured with.
 * Absent key = enabled (existing users keep their reminders).
 */
export type ReminderChannelKey = "diary" | "journal" | "habits" | "tasks";

export const isReminderChannelEnabled = (key: ReminderChannelKey): boolean =>
  localStorage.getItem(`dailynova_notify_${key}`) !== "false";

export const setReminderChannelEnabled = (key: ReminderChannelKey, enabled: boolean) => {
  localStorage.setItem(`dailynova_notify_${key}`, String(enabled));
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
    if (!isReminderChannelEnabled("tasks")) return;
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

      for (const sound of REMINDER_SOUNDS) {
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
    const enabled = isReminderChannelEnabled("diary");
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
    const enabled = isReminderChannelEnabled("journal");
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
    if (!isReminderChannelEnabled("habits")) return;
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

  async cancelAllHabitReminders() {
    if (!isNative) return;
    const habits = JSON.parse(localStorage.getItem("dailynova_habits") || "[]") as { id?: string }[];
    for (const habit of habits) {
      if (habit.id) await this.cancelHabitReminder(habit.id);
    }
  },

  /**
   * Android 13+ downgrades alarms to inexact (which fires reminders up to a
   * few minutes late) unless exact scheduling is allowed. Ask once.
   */
  async ensureExactAlarms() {
    if (!isNative) return;
    try {
      const check = await (LocalNotifications as any).checkExactNotificationSetting?.();
      if (check && check.exact_alarm !== "granted") {
        if (localStorage.getItem("dailynova_exact_alarm_asked") === "true") return;
        localStorage.setItem("dailynova_exact_alarm_asked", "true");
        await (LocalNotifications as any).changeExactNotificationSetting?.();
      }
    } catch {}
  },

  async setupDailyReminders() {
    if (!isNative) return;
    await this.ensureAlarmsChannel();
    await this.ensureExactAlarms();
    await this.setupDiaryReminder();
    await this.setupJournalReminder();
    const granted = await this.requestPermission();
    if (!granted) return;
    await this.cancelNotification(1003);
    await this.cancelNotification(1004);
    const hour = parseInt(localStorage.getItem("dailynova_notify_hour") || "20", 10);
    const minute = parseInt(localStorage.getItem("dailynova_notify_minute") || "0", 10);
    const habitsEnabled = isReminderChannelEnabled("habits");
    const tasksEnabled = isReminderChannelEnabled("tasks");
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
