import { useState, useEffect } from "react";
import { FileText, CheckSquare, Target, BookOpen, BookMarked, Clock, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { storage, Note, Task, Habit, JournalEntry, DiaryEntry } from "@/lib/storage";

interface TimelineItem {
  id: string;
  type: "note" | "task" | "habit" | "diary" | "journal";
  title: string;
  preview?: string;
  time: string;
  timestamp: number;
  completed?: boolean;
}

const TYPE_STYLES: Record<string, { icon: typeof FileText; color: string; label: string }> = {
  note: { icon: FileText, label: "Note", color: "text-primary" },
  task: { icon: CheckSquare, label: "Task", color: "text-secondary" },
  habit: { icon: Target, label: "Habit", color: "text-accent" },
  diary: { icon: BookOpen, label: "Diary", color: "text-success" },
  journal: { icon: BookMarked, label: "Journal", color: "text-accent" },
};

const Timeline = () => {
  const [items, setItems] = useState<TimelineItem[]>([]);

  useEffect(() => {
    loadTimeline();
  }, []);

  const loadTimeline = () => {
    const now = new Date();
    const todayStr = now.toDateString();
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const timeline: TimelineItem[] = [];

    // Notes from today
    storage.getNotes().forEach((n) => {
      if (new Date(n.createdAt).toDateString() === todayStr) {
        timeline.push({
          id: `note-${n.id}`,
          type: "note",
          title: n.topic,
          preview: n.content.slice(0, 80),
          time: formatTime(n.createdAt),
          timestamp: new Date(n.createdAt).getTime(),
        });
      }
    });

    // Tasks from today
    storage.getTasks().forEach((t) => {
      if (new Date(t.createdAt).toDateString() === todayStr) {
        timeline.push({
          id: `task-${t.id}`,
          type: "task",
          title: t.title,
          time: formatTime(t.createdAt),
          timestamp: new Date(t.createdAt).getTime(),
          completed: t.completed,
        });
      }
    });

    // Habits completed today
    storage.getHabits().forEach((h) => {
      if (h.completedDates.includes(todayLocal)) {
        timeline.push({
          id: `habit-${h.id}`,
          type: "habit",
          title: h.name,
          time: "Today",
          timestamp: now.getTime(),
          completed: true,
        });
      }
    });

    // Diary entries from today
    storage.getDiaryEntries().forEach((d) => {
      if (new Date(d.createdAt).toDateString() === todayStr) {
        timeline.push({
          id: `diary-${d.id}`,
          type: "diary",
          title: "Diary Entry",
          preview: d.content.slice(0, 80),
          time: formatTime(d.createdAt),
          timestamp: new Date(d.createdAt).getTime(),
        });
      }
    });

    // Journal entries from today
    storage.getJournalEntries().forEach((j) => {
      if (new Date(j.createdAt).toDateString() === todayStr) {
        timeline.push({
          id: `journal-${j.id}`,
          type: "journal",
          title: "Journal Entry",
          preview: j.content.slice(0, 80),
          time: formatTime(j.createdAt),
          timestamp: new Date(j.createdAt).getTime(),
        });
      }
    });

    // Sort reverse chronological
    timeline.sort((a, b) => b.timestamp - a.timestamp);
    setItems(timeline);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold text-primary">Today's Timeline</h1>
        </div>

        {items.length === 0 ? (
          <Card className="glass p-8 text-center">
            <p className="text-muted-foreground text-lg mb-2">Your day is a blank canvas</p>
            <p className="text-sm text-muted-foreground">Start by capturing a thought, task, or reflection.</p>
          </Card>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border/50" />

            <div className="space-y-3">
              {items.map((item) => {
                const style = TYPE_STYLES[item.type];
                const Icon = style.icon;
                return (
                  <div key={item.id} className="relative flex gap-4 pl-2">
                    {/* Dot on timeline */}
                    <div className={`relative z-10 flex-shrink-0 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center ${style.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    {/* Content */}
                    <Card className={`flex-1 glass p-3 ${item.completed ? "opacity-60" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${style.color}`}>
                              {style.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{item.time}</span>
                          </div>
                          <p className={`text-sm font-medium ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {item.title}
                          </p>
                          {item.preview && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.preview}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Timeline;
