export const REMINDER_COLORS = [
  { id: "rose", label: "Rose", value: "#ff6b9a", ring: "ring-[#ff6b9a]" },
  { id: "amber", label: "Amber", value: "#f5a623", ring: "ring-[#f5a623]" },
  { id: "lime", label: "Lime", value: "#7ed957", ring: "ring-[#7ed957]" },
  { id: "cyan", label: "Cyan", value: "#3bd6d6", ring: "ring-[#3bd6d6]" },
  { id: "violet", label: "Violet", value: "#a78bfa", ring: "ring-[#a78bfa]" },
  { id: "slate", label: "Slate", value: "#94a3b8", ring: "ring-[#94a3b8]" },
] as const;

export type ReminderColorId = typeof REMINDER_COLORS[number]["id"];

export const REMINDER_CATEGORIES = [
  "Personal",
  "Work",
  "Health",
  "Home",
  "Learning",
  "Errands",
];

export const colorValue = (id?: string) =>
  REMINDER_COLORS.find((c) => c.id === id)?.value || REMINDER_COLORS[0].value;
