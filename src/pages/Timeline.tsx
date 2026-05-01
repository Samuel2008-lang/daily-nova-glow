import { useState, useEffect } from "react";
import { FileText, CheckSquare, Target, BookOpen, BookMarked, Clock, Sun, Sunset, Moon, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { storage, Note, Task, Habit, JournalEntry, DiaryEntry } from "@/lib/storage";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface TimelineItem {
  id: string;
  rawId: string;
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
  diary: { icon: BookOpen, label: "Diary", color: "text-primary" },
  journal: { icon: BookMarked, label: "Journal", color: "text-accent" },
};

type DayPhase = "morning" | "afternoon" | "evening";

function getDayPhase(): DayPhase {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const PHASE_CONFIG: Record<DayPhase, { icon: typeof Sun; greeting: string; suggestion: string; color: string }> = {
  morning: {
    icon: Sun,
    greeting: "Good morning",
    suggestion: "Plan your tasks and set intentions for today",
    color: "text-yellow-400",
  },
  afternoon: {
    icon: Sunset,
    greeting: "Good afternoon",
    suggestion: "Capture thoughts and track your progress",
    color: "text-orange-400",
  },
  evening: {
    icon: Moon,
    greeting: "Good evening",
    suggestion: "Reflect on your day and prepare for tomorrow",
    color: "text-secondary",
  },
};

const PHASE_ACTIONS: Record<DayPhase, { to: string; label: string; icon: typeof FileText }[]> = {
  morning: [
    { to: "/tasks", label: "Plan Tasks", icon: CheckSquare },
    { to: "/habits", label: "Check Habits", icon: Target },
  ],
  afternoon: [
    { to: "/notes", label: "Capture Thought", icon: FileText },
    { to: "/tasks", label: "Check Progress", icon: CheckSquare },
  ],
  evening: [
    { to: "/diary", label: "Write Diary", icon: BookOpen },
    { to: "/journal", label: "Reflect", icon: BookMarked },
  ],
};

const Timeline = () => {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const { toast } = useToast();
  const phase = getDayPhase();
  const phaseConfig = PHASE_CONFIG[phase];
  const PhaseIcon = phaseConfig.icon;

  useEffect(() => {
    loadTimeline();
  }, []);

  const loadTimeline = () => {
    const now = new Date();
    const todayStr = now.toDateString();
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const timeline: TimelineItem[] = [];

    storage.getNotes().forEach((n) => {
      if (new Date(n.createdAt).toDateString() === todayStr) {
        timeline.push({ id: `note-${n.id}`, rawId: n.id, type: "note", title: n.topic, preview: n.content.slice(0, 80), time: formatTime(n.createdAt), timestamp: new Date(n.createdAt).getTime() });
      }
    });

    storage.getTasks().forEach((t) => {
      const isToday = new Date(t.createdAt).toDateString() === todayStr || t.dueDate === todayLocal;
      if (isToday) {
        timeline.push({ id: `task-${t.id}`, rawId: t.id, type: "task", title: t.title, preview: t.description?.slice(0, 80), time: t.dueTime || formatTime(t.createdAt), timestamp: new Date(t.createdAt).getTime(), completed: t.completed });
      }
    });

    storage.getHabits().forEach((h) => {
      const done = h.completedDates.includes(todayLocal);
      timeline.push({ id: `habit-${h.id}`, rawId: h.id, type: "habit", title: h.name, time: "Today", timestamp: now.getTime(), completed: done });
    });

    storage.getDiaryEntries().forEach((d) => {
      if (new Date(d.createdAt).toDateString() === todayStr) {
        timeline.push({ id: `diary-${d.id}`, rawId: d.id, type: "diary", title: "Diary Entry", preview: d.content.slice(0, 80), time: formatTime(d.createdAt), timestamp: new Date(d.createdAt).getTime() });
      }
    });

    storage.getJournalEntries().forEach((j) => {
      if (new Date(j.createdAt).toDateString() === todayStr) {
        timeline.push({ id: `journal-${j.id}`, rawId: j.id, type: "journal", title: "Journal Entry", preview: j.content.slice(0, 80), time: formatTime(j.createdAt), timestamp: new Date(j.createdAt).getTime() });
      }
    });

    timeline.sort((a, b) => b.timestamp - a.timestamp);
    setItems(timeline);
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const toggleTask = (rawId: string) => {
    const tasks = storage.getTasks();
    const updated = tasks.map((t) => t.id === rawId ? { ...t, completed: !t.completed } : t);
    storage.saveTasks(updated);
    loadTimeline();
    const task = updated.find((t) => t.id === rawId);
    toast({ title: task?.completed ? "Task completed ✓" : "Task reopened" });
  };

  const toggleHabit = (rawId: string) => {
    const now = new Date();
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const habits = storage.getHabits();
    const updated = habits.map((h) => {
      if (h.id !== rawId) return h;
      const done = h.completedDates.includes(todayLocal);
      if (done) {
        return { ...h, completedDates: h.completedDates.filter((d) => d !== todayLocal), streak: Math.max(0, h.streak - 1) };
      } else {
        return { ...h, completedDates: [...h.completedDates, todayLocal], lastMarkedDate: todayLocal, streak: h.streak + 1 };
      }
    });
    storage.saveHabits(updated);
    loadTimeline();
    const habit = updated.find((h) => h.id === rawId);
    const isDone = habit?.completedDates.includes(todayLocal);
    toast({ title: isDone ? "Habit logged ✓" : "Habit unmarked" });
  };

  // Daily Reset data
  const resetData = (() => {
    try {
      const raw = localStorage.getItem("dailynova_daily_reset");
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.date === new Date().toDateString()) return data;
      return null;
    } catch { return null; }
  })();

  const tasksCompleted = storage.getTasks().filter((t) => t.completed && new Date(t.createdAt).toDateString() === new Date().toDateString()).length;
  const totalTasks = storage.getTasks().filter((t) => new Date(t.createdAt).toDateString() === new Date().toDateString()).length;

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto animate-fade-in">
        {/* Daily Flow Header */}
        <Card className="glass p-5 mb-6 border-border/30" style={{ boxShadow: `0 0 25px hsl(var(--primary) / 0.08)` }}>
          <div className="flex items-center gap-3 mb-3">
            <PhaseIcon className={`w-6 h-6 ${phaseConfig.color}`} />
            <div>
              <h1 className="text-2xl font-bold text-foreground">{phaseConfig.greeting}</h1>
              <p className="text-sm text-muted-foreground">{phaseConfig.suggestion}</p>
            </div>
          </div>

          <div className="flex gap-4 text-sm mb-3">
            <span className="text-muted-foreground">{items.length} activities today</span>
            {totalTasks > 0 && (
              <span className="text-muted-foreground">Tasks: {tasksCompleted}/{totalTasks}</span>
            )}
          </div>

          <div className="flex gap-2">
            {PHASE_ACTIONS[phase].map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.to} to={action.to} className="flex-1">
                  <Button variant="outline" className="w-full gap-2 text-sm h-9 border-border/30">
                    <Icon className="w-4 h-4" />
                    {action.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Daily Reset Summary */}
        {resetData && (
          <Card className="glass p-4 mb-5 border-secondary/20">
            <div className="flex items-center gap-2 mb-2">
              <Moon className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-secondary">Last Night's Reflection</span>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              {resetData.wentWell && <p>✨ {resetData.wentWell}</p>}
              {resetData.tomorrow && <p>🎯 Priority: {resetData.tomorrow}</p>}
            </div>
          </Card>
        )}

        {/* Timeline */}
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Today's Timeline</h2>
        </div>

        {items.length === 0 ? (
          <Card className="glass p-8 text-center border-border/20">
            <p className="text-muted-foreground text-lg mb-2">Your day is a blank canvas</p>
            <p className="text-sm text-muted-foreground">Start by capturing a thought, task, or reflection.</p>
          </Card>
        ) : (
          (() => {
            // Group items into Morning / Afternoon / Evening for the unified Daily Flow view
            const sections: Record<DayPhase, TimelineItem[]> = { morning: [], afternoon: [], evening: [] };
            items.forEach((it) => {
              const h = new Date(it.timestamp).getHours();
              const sec: DayPhase = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
              sections[sec].push(it);
            });

            const order: DayPhase[] = ["morning", "afternoon", "evening"];
            return (
              <div className="space-y-6">
                {order.map((sec) => {
                  const list = sections[sec];
                  if (list.length === 0) return null;
                  const cfg = PHASE_CONFIG[sec];
                  const SecIcon = cfg.icon;
                  return (
                    <div key={sec}>
                      <div className="flex items-center gap-2 mb-3">
                        <SecIcon className={`w-4 h-4 ${cfg.color}`} />
                        <h3 className={`text-sm font-semibold uppercase tracking-wider ${cfg.color}`}>
                          {sec === "morning" ? "Morning" : sec === "afternoon" ? "Afternoon" : "Evening"}
                        </h3>
                        <span className="text-xs text-muted-foreground">({list.length})</span>
                      </div>
                      <div className="relative">
                        <div className="absolute left-5 top-0 bottom-0 w-px bg-border/40" />
                        <div className="space-y-2.5">
                          {list.map((item) => {
                            const style = TYPE_STYLES[item.type];
                            const Icon = style.icon;
                            const isInteractive = item.type === "task" || item.type === "habit";
                            return (
                              <div key={item.id} className="relative flex gap-3 pl-2">
                                <div
                                  className={`relative z-10 flex-shrink-0 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center ${style.color} ${isInteractive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
                                  onClick={() => {
                                    if (item.type === "task") toggleTask(item.rawId);
                                    if (item.type === "habit") toggleHabit(item.rawId);
                                  }}
                                >
                                  {item.completed ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                                </div>
                                <Card className={`flex-1 glass p-3 border-border/20 ${item.completed ? "opacity-60" : ""}`}>
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${style.color}`}>{style.label}</span>
                                    <span className="text-[10px] text-muted-foreground">{item.time}</span>
                                    {isInteractive && (
                                      <button
                                        onClick={() => {
                                          if (item.type === "task") toggleTask(item.rawId);
                                          if (item.type === "habit") toggleHabit(item.rawId);
                                        }}
                                        className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                                          item.completed
                                            ? "border-primary/30 text-primary bg-primary/10"
                                            : "border-border/40 text-muted-foreground hover:text-primary hover:border-primary/40"
                                        }`}
                                      >
                                        {item.completed ? "Done ✓" : "Mark done"}
                                      </button>
                                    )}
                                  </div>
                                  <p className={`text-sm font-medium ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.title}</p>
                                  {item.preview && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.preview}</p>}
                                </Card>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
};

export default Timeline;
