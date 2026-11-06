import type { Habit } from "@/lib/storage";

export type DeletedHabit = Habit & { deletedAt: string };

export const HABIT_TRASH_KEY = "dailynova_habits_deleted";
export const PERMANENT_HABIT_DELETE_MESSAGE =
  "This habit will be permanently deleted and cannot be restored. Are you sure?";

/** Move a habit from the active list into Recently Deleted. */
export function softDelete(active: Habit[], trash: DeletedHabit[], id: string, now = new Date()) {
  const habit = active.find((h) => h.id === id);
  if (!habit) return { active, trash };
  return {
    active: active.filter((h) => h.id !== id),
    trash: [{ ...habit, deletedAt: now.toISOString() }, ...trash.filter((h) => h.id !== id)],
  };
}

/** Move a habit back from Recently Deleted to the active list (keeps its history). */
export function restore(active: Habit[], trash: DeletedHabit[], id: string) {
  const item = trash.find((h) => h.id === id);
  if (!item) return { active, trash, restored: undefined as Habit | undefined };
  const { deletedAt: _d, ...habit } = item;
  const nextActive = [habit as Habit, ...active.filter((h) => h.id !== id)].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return { active: nextActive, trash: trash.filter((h) => h.id !== id), restored: habit as Habit };
}

export function purge(trash: DeletedHabit[], id: string) {
  return trash.filter((h) => h.id !== id);
}

export const habitTrash = {
  get: (): DeletedHabit[] => {
    try { return JSON.parse(localStorage.getItem(HABIT_TRASH_KEY) || "[]"); } catch { return []; }
  },
  save: (items: DeletedHabit[]) => localStorage.setItem(HABIT_TRASH_KEY, JSON.stringify(items)),
};
