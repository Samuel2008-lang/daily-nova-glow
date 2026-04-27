import { useState, useEffect } from "react";
import { Plus, Trash2, Check, Mic, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { AmPmTimePicker } from "@/components/AmPmTimePicker";
import { storage, Habit } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { notificationService } from "@/lib/notifications";
import { haptics } from "@/lib/haptics";

const Habits = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabit, setNewHabit] = useState("");
  const { toast } = useToast();

  const { isListening, isSupported, startListening } = useSpeechRecognition({
    onResult: (transcript) => {
      setNewHabit(transcript);
    },
  });

  useEffect(() => {
    const raw = storage.getHabits();
    const normalized = raw.map(h => ({
      ...h,
      completedDates: h.completedDates.map(d => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        const parsed = new Date(d);
        if (isNaN(parsed.getTime())) return d;
        return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
      }),
    }));
    // Newest habits first (most recently created on top)
    normalized.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setHabits(normalized);
    storage.saveHabits(normalized);
  }, []);

  const addHabit = () => {
    if (!newHabit.trim()) return;
    const habit: Habit = {
      id: Date.now().toString(),
      name: newHabit,
      completedDates: [],
      lastMarkedDate: undefined,
      streak: 0,
      createdAt: new Date().toISOString(),
    };
    // Prepend so the newest habit is on top
    const updatedHabits = [habit, ...habits];
    setHabits(updatedHabits);
    storage.saveHabits(updatedHabits);
    setNewHabit("");
    toast({ title: "Habit added", description: "Start building your streak!" });
  };

  const getLocalDateString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const toggleHabitToday = (id: string) => {
    const today = getLocalDateString();
    const updatedHabits = habits.map((habit) => {
      if (habit.id !== id) return habit;
      const isCompletedToday = habit.completedDates.includes(today);
      if (isCompletedToday) {
        const completedDates = habit.completedDates.filter((date) => date !== today);
        const streak = calculateStreak(completedDates);
        return { ...habit, completedDates, lastMarkedDate: completedDates.length > 0 ? completedDates[completedDates.length - 1] : undefined, streak };
      } else {
        const completedDates = [...habit.completedDates, today].sort();
        const streak = calculateStreak(completedDates);
        return { ...habit, completedDates, lastMarkedDate: today, streak };
      }
    });
    setHabits(updatedHabits);
    storage.saveHabits(updatedHabits);
    const habit = updatedHabits.find((h) => h.id === id);
    const isNowCompleted = habit?.completedDates.includes(today);
    if (isNowCompleted) haptics.success(); else haptics.light();
    toast({
      title: isNowCompleted ? "Great job!" : "Unmarked",
      description: isNowCompleted ? `Keep building your streak! Current: ${habit?.streak || 0} days` : "Habit unmarked for today.",
    });
  };

  const deleteHabit = async (id: string) => {
    await notificationService.cancelHabitReminder(id);
    const updatedHabits = habits.filter((habit) => habit.id !== id);
    setHabits(updatedHabits);
    storage.saveHabits(updatedHabits);
    toast({ title: "Habit deleted", description: "Your habit has been removed." });
  };

  const toggleHabitReminder = async (id: string, enabled: boolean) => {
    const updatedHabits = habits.map((h) => {
      if (h.id !== id) return h;
      const updated = { ...h, reminderEnabled: enabled, reminderHour: h.reminderHour ?? 8, reminderMinute: h.reminderMinute ?? 0 };
      if (enabled) {
        notificationService.scheduleHabitReminder(id, h.name, updated.reminderHour!, updated.reminderMinute!);
      } else {
        notificationService.cancelHabitReminder(id);
      }
      return updated;
    });
    setHabits(updatedHabits);
    storage.saveHabits(updatedHabits);
  };

  const updateHabitReminderTime = async (id: string, hour: number, minute: number) => {
    const updatedHabits = habits.map((h) => {
      if (h.id !== id) return h;
      const updated = { ...h, reminderHour: hour, reminderMinute: minute };
      if (h.reminderEnabled) {
        notificationService.scheduleHabitReminder(id, h.name, hour, minute);
      }
      return updated;
    });
    setHabits(updatedHabits);
    storage.saveHabits(updatedHabits);
  };

  const calculateStreak = (completedDates: string[]): number => {
    if (completedDates.length === 0) return 0;
    const sorted = [...completedDates].sort().reverse();
    const today = getLocalDateString();
    const yesterday = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
    let streak = 1;
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = new Date(sorted[i]);
      const next = new Date(sorted[i + 1]);
      const diffDays = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) streak++;
      else break;
    }
    return streak;
  };

  const today = getLocalDateString();
  const completedToday = habits.filter((h) => h.completedDates.includes(today)).length;
  const totalHabits = habits.length;
  const completionPercentage = totalHabits > 0 ? (completedToday / totalHabits) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <h1 className="text-4xl font-bold mb-8 text-accent">Habit Tracker</h1>

        {/* Progress Overview */}
        <Card className="glass glow-pink p-6 mb-8">
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-accent">Today's Progress</span>
              <span className="text-sm font-bold text-accent">{completedToday}/{totalHabits}</span>
            </div>
            <Progress value={completionPercentage} className="h-3" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {completedToday === totalHabits && totalHabits > 0
              ? "Perfect! All habits completed today!"
              : `Keep going! ${totalHabits - completedToday} habit${totalHabits - completedToday !== 1 ? "s" : ""} left.`}
          </p>
        </Card>

        {/* Add Habit */}
        <Card className="glass glow-pink p-6 mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Add a new habit or use voice..."
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addHabit()}
                className="bg-background/50 border-border/50 focus:border-accent pr-12"
              />
              {isSupported && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => startListening(true, "habit")}
                  disabled={isListening}
                  className={`absolute top-1/2 -translate-y-1/2 right-1 ${
                    isListening ? "animate-pulse-glow text-accent" : "text-muted-foreground hover:text-accent"
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </Button>
              )}
            </div>
            <Button onClick={addHabit} className="glow-pink">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {isListening && (
            <div className="flex items-center gap-2 mt-3 px-4 py-2 bg-accent/20 rounded-lg animate-pulse-glow">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span className="text-sm text-accent font-medium">Listening for habit...</span>
            </div>
          )}
        </Card>

        {/* Habits List */}
        <div className="space-y-4">
          {habits.length === 0 ? (
            <Card className="glass p-8 text-center">
              <p className="text-muted-foreground">No habits yet. Create your first habit!</p>
            </Card>
          ) : (
            habits.map((habit) => {
              const isCompletedToday = habit.completedDates.includes(today);
              const streak = calculateStreak(habit.completedDates);

              return (
                <Card
                  key={habit.id}
                  className={`glass p-6 group transition-all duration-300 ${isCompletedToday ? "glow-pink border-accent/50" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <Button
                      size="icon"
                      variant={isCompletedToday ? "default" : "outline"}
                      onClick={() => toggleHabitToday(habit.id)}
                      className={`${isCompletedToday ? "bg-accent text-accent-foreground" : "border-border/50"} transition-all duration-300`}
                    >
                      <Check className="w-4 h-4" />
                    </Button>

                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{habit.name}</h3>
                      <div className="flex gap-4 mt-1">
                        <span className="text-xs text-muted-foreground">{streak} day streak 🔥</span>
                        <span className="text-xs text-muted-foreground">{habit.completedDates.length} total completions</span>
                      </div>
                      
                      {/* Per-habit reminder — collapsible */}
                      <div className="flex flex-col gap-1 mt-2">
                        <div className="flex items-center gap-2">
                          <Bell className="w-3 h-3 text-muted-foreground" />
                          <Switch
                            checked={habit.reminderEnabled || false}
                            onCheckedChange={(v) => toggleHabitReminder(habit.id, v)}
                            className="scale-75"
                          />
                          <span className="text-xs text-muted-foreground">Reminder</span>
                          {habit.reminderEnabled && (
                            <button
                              onClick={() => {
                                const el = document.getElementById(`habit-time-${habit.id}`);
                                if (el) el.classList.toggle("hidden");
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground ml-auto"
                            >
                              {habit.reminderHour !== undefined ? `${String(habit.reminderHour).padStart(2,'0')}:${String(habit.reminderMinute ?? 0).padStart(2,'0')}` : "Set time"} ▾
                            </button>
                          )}
                        </div>
                        {habit.reminderEnabled && (
                          <div id={`habit-time-${habit.id}`} className="ml-5 hidden">
                            <AmPmTimePicker
                              hour={String(habit.reminderHour ?? 8)}
                              minute={String(habit.reminderMinute ?? 0)}
                              onTimeChange={(h, m) => updateHabitReminderTime(habit.id, parseInt(h), parseInt(m))}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Uses phone's default notification sound</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteHabit(habit.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Habits;
