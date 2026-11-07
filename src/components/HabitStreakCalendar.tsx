import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

interface Props {
  streak: number;
  completedDates: string[];
  createdAt?: string;
}

export const HabitStreakCalendar = ({ streak, completedDates, createdAt }: Props) => {
  const now = new Date();
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const done = new Set(completedDates.map((d) => d.slice(0, 10)));
  const todayKey = ymd(now);
  const startKey = createdAt ? ymd(new Date(createdAt)) : [...done].sort()[0] ?? todayKey;

  const first = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="text-xs text-primary underline decoration-dotted underline-offset-2">
          {streak}-day streak 🔥
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 glass p-3">
        <div className="flex items-center justify-between mb-2">
          <button type="button" aria-label="Previous month" className="p-1" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
          <button type="button" aria-label="Next month" className="p-1" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground mb-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <span key={i} />;
            const key = ymd(new Date(month.getFullYear(), month.getMonth(), day));
            const isDone = done.has(key);
            const isToday = key === todayKey;
            const missed = !isDone && key < todayKey && key >= startKey;
            const cls = isDone
              ? "bg-success/25 text-success"
              : missed
              ? "bg-destructive/20 text-destructive"
              : "text-muted-foreground";
            return (
              <span key={i} className={`h-8 rounded-md flex flex-col items-center justify-center text-[11px] ${cls} ${isToday ? "ring-1 ring-primary" : ""}`}>
                {day}
                <span className="text-[9px] leading-none">{isDone ? "✓" : missed ? "✕" : ""}</span>
              </span>
            );
          })}
        </div>
        <div className="flex justify-center gap-3 mt-3 text-[10px] text-muted-foreground">
          <span className="text-success">✓ Done</span>
          <span className="text-destructive">✕ Missed</span>
          <span>▢ Today</span>
        </div>
      </PopoverContent>
    </Popover>
  );
};
