// Local storage utilities for DailyNova

export interface Note {
  id: string;
  topic: string;
  content: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export type RepeatUnit = 'none' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
export type AlertLevel = 'light' | 'medium' | 'strong';
export type DurationType = 'forever' | 'count' | 'until';
export type ReminderSound = 'gentle' | 'classic';

export interface TaskRepeat { unit: RepeatUnit; every: number }
export interface TaskDuration { type: DurationType; count?: number; until?: string }

export interface ChecklistItem { id: string; text: string; done: boolean }

export interface Task {
  id: string;
  /** Primary reminder text. `title` is kept in sync for backward compatibility. */
  title: string;
  memo?: string;
  description?: string;
  completed: boolean;
  completedAt?: string;
  important?: boolean;
  color?: string;
  category?: string;
  checklist?: ChecklistItem[];
  /** IDs of images stored in IndexedDB via `reminder-images.ts`. */
  imageIds?: string[];
  dueDate?: string;
  dueTime?: string;
  reminderBefore?: number;
  reminderAfter?: number;
  repeat?: TaskRepeat;
  duration?: TaskDuration;
  alertLevel?: AlertLevel;
  notificationSound?: ReminderSound;
  snoozeMinutes?: number;
  createdAt: string;
}


export interface Habit {
  id: string;
  name: string;
  description?: string;
  completedDates: string[];
  lastMarkedDate?: string;
  streak: number;
  reminderEnabled?: boolean;
  reminderHour?: number;
  reminderMinute?: number;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEYS = {
  NOTES: 'dailynova_notes',
  TASKS: 'dailynova_tasks',
  HABITS: 'dailynova_habits',
  JOURNAL: 'dailynova_journal',
  DIARY: 'dailynova_diary',
  FIRST_LAUNCH: 'dailynova_first_launch',
};

export const storage = {
  // Generic storage functions
  get: <T>(key: string): T[] => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

  set: <T>(key: string, data: T[]): void => {
    localStorage.setItem(key, JSON.stringify(data));
  },

  // Notes
  getNotes: (): Note[] => storage.get<Note>(STORAGE_KEYS.NOTES),
  saveNotes: (notes: Note[]): void => storage.set(STORAGE_KEYS.NOTES, notes),

  // Tasks
  getTasks: (): Task[] => storage.get<Task>(STORAGE_KEYS.TASKS),
  saveTasks: (tasks: Task[]): void => storage.set(STORAGE_KEYS.TASKS, tasks),

  // Habits
  getHabits: (): Habit[] => storage.get<Habit>(STORAGE_KEYS.HABITS),
  saveHabits: (habits: Habit[]): void => storage.set(STORAGE_KEYS.HABITS, habits),

  // Journal
  getJournalEntries: (): JournalEntry[] => storage.get<JournalEntry>(STORAGE_KEYS.JOURNAL),
  saveJournalEntries: (entries: JournalEntry[]): void => storage.set(STORAGE_KEYS.JOURNAL, entries),

  // Diary
  getDiaryEntries: (): DiaryEntry[] => storage.get<DiaryEntry>(STORAGE_KEYS.DIARY),
  saveDiaryEntries: (entries: DiaryEntry[]): void => storage.set(STORAGE_KEYS.DIARY, entries),

  // First launch
  isFirstLaunch: (): boolean => {
    return localStorage.getItem(STORAGE_KEYS.FIRST_LAUNCH) !== 'false';
  },
  setFirstLaunchComplete: (): void => {
    localStorage.setItem(STORAGE_KEYS.FIRST_LAUNCH, 'false');
  },
};