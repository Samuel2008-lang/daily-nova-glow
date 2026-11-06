import { describe, expect, it } from "bun:test";
import { softDelete, restore, purge, PERMANENT_HABIT_DELETE_MESSAGE } from "./habit-trash";
import type { Habit } from "./storage";

const h = (id: string, createdAt: string): Habit => ({ id, name: id, completedDates: ["2026-11-01"], streak: 1, createdAt, reminderEnabled: true, reminderHour: 7, reminderMinute: 30 });

describe("habit trash", () => {
  it("soft delete moves the habit to Recently Deleted", () => {
    const r = softDelete([h("a", "2026-01-01"), h("b", "2026-01-02")], [], "a");
    expect(r.active.map((x) => x.id)).toEqual(["b"]);
    expect(r.trash.map((x) => x.id)).toEqual(["a"]);
  });
  it("restore returns the habit with its history and reminder settings", () => {
    const d = softDelete([h("a", "2026-01-01")], [], "a");
    const r = restore(d.active, d.trash, "a");
    expect(r.active.map((x) => x.id)).toEqual(["a"]);
    expect(r.trash).toHaveLength(0);
    expect(r.restored?.completedDates).toEqual(["2026-11-01"]);
    expect(r.restored?.reminderHour).toBe(7);
    expect("deletedAt" in (r.restored as object)).toBe(false);
  });
  it("delete forever removes it from Recently Deleted", () => {
    const d = softDelete([h("a", "2026-01-01")], [], "a");
    expect(purge(d.trash, "a")).toHaveLength(0);
  });
  it("uses the exact permanent delete wording", () => {
    expect(PERMANENT_HABIT_DELETE_MESSAGE).toBe("This habit will be permanently deleted and cannot be restored. Are you sure?");
  });
});
