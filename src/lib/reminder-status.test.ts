import { describe, expect, it } from "bun:test";
import { getReminderBucket, earlyReminderLevel } from "./reminder-status";
import type { Task } from "./storage";

const now = new Date("2026-11-07T12:00:00");
const base: Task = { id: "1", title: "t", completed: false, createdAt: now.toISOString() };

describe("reminder buckets", () => {
  it("past one-off reminder that was not completed is missed", () => {
    expect(getReminderBucket({ ...base, dueDate: "2026-11-07", dueTime: "09:00" }, now)).toBe("missed");
  });
  it("later today is today", () => {
    expect(getReminderBucket({ ...base, dueDate: "2026-11-07", dueTime: "18:00" }, now)).toBe("today");
  });
  it("future date is upcoming", () => {
    expect(getReminderBucket({ ...base, dueDate: "2026-11-09", dueTime: "08:00" }, now)).toBe("upcoming");
  });
  it("completed wins over missed", () => {
    expect(getReminderBucket({ ...base, completed: true, dueDate: "2026-11-01", dueTime: "08:00" }, now)).toBe("completed");
  });
  it("disabled reminder is disabled, not missed", () => {
    expect(getReminderBucket({ ...base, enabled: false, dueDate: "2026-11-01", dueTime: "08:00" }, now)).toBe("disabled");
  });
  it("early reminder never uses the strong alarm", () => {
    expect(earlyReminderLevel()).toBe("light");
  });
});
