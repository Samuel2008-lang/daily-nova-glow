import type { Task } from "@/lib/storage";

export type ReminderBucket = "completed" | "disabled" | "missed" | "today" | "upcoming" | "nodate";

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const isRepeating = (t: Task) => !!t.repeat && t.repeat.unit !== "none";

/** Which dashboard list a reminder belongs in at `now`. */
export const getReminderBucket = (task: Task, now: Date = new Date()): ReminderBucket => {
  if (task.completed) return "completed";
  if (task.enabled === false) return "disabled";
  if (!task.dueDate) return "nodate";
  const due = new Date(`${task.dueDate}T${task.dueTime || "23:59"}:00`);
  // Repeating reminders roll forward, so they are never "missed".
  if (!isRepeating(task) && due.getTime() < now.getTime()) return "missed";
  if (task.dueDate === ymd(now)) return "today";
  if (task.dueDate < ymd(now)) return isRepeating(task) ? "today" : "missed";
  return "upcoming";
};

/** Early reminders must never ring as a Strong alarm — they are always a light heads-up. */
export const earlyReminderLevel = () => "light" as const;

export const EARLY_REMINDER_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Off" },
  { value: 5, label: "5 minutes before" },
  { value: 10, label: "10 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];

export const SNOOZE_OPTIONS = [5, 10, 15, 30];
