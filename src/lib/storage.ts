// Local storage utilities for DailyNova

export interface Note {
  id: string;
  content: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  completedDates: string[];
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
};
