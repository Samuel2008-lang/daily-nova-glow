import { useState, useEffect } from "react";
import { Plus, Trash2, Check, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { storage, Habit } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

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
    setHabits(storage.getHabits());
  }, []);

  const addHabit = () => {
    if (!newHabit.trim()) return;

    const habit: Habit = {
      id: Date.now().toString(),
      name: newHabit,
      completedDates: [],
      createdAt: new Date().toISOString(),
    };

    const updatedHabits = [...habits, habit];
    setHabits(updatedHabits);
    storage.saveHabits(updatedHabits);
    setNewHabit("");

    toast({
      title: "Habit added",
      description: "Start building your streak!",
    });
  };

  const toggleHabitToday = (id: string) => {
    const today = new Date().toDateString();
    const updatedHabits = habits.map((habit) => {
      if (habit.id === id) {
        const isCompleted = habit.completedDates.includes(today);
        const completedDates = isCompleted
          ? habit.completedDates.filter((date) => date !== today)
          : [...habit.completedDates, today];
        return { ...habit, completedDates };
      }
      return habit;
    });

    setHabits(updatedHabits);
    storage.saveHabits(updatedHabits);

    const habit = updatedHabits.find((h) => h.id === id);
    const isNowCompleted = habit?.completedDates.includes(today);

    toast({
      title: isNowCompleted ? "Great job!" : "Unmarked",
      description: isNowCompleted
        ? "Keep building your streak!"
        : "Habit unmarked for today.",
    });
  };

  const deleteHabit = (id: string) => {
    const updatedHabits = habits.filter((habit) => habit.id !== id);
    setHabits(updatedHabits);
    storage.saveHabits(updatedHabits);

    toast({
      title: "Habit deleted",
      description: "Your habit has been removed.",
    });
  };

  const getStreak = (completedDates: string[]) => {
    if (completedDates.length === 0) return 0;

    const sorted = completedDates
      .map((date) => new Date(date).getTime())
      .sort((a, b) => b - a);

    let streak = 1;
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (let i = 0; i < sorted.length - 1; i++) {
      const diff = sorted[i] - sorted[i + 1];
      if (diff <= oneDayMs * 1.5) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const today = new Date().toDateString();
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
              <span className="text-sm font-bold text-accent">
                {completedToday}/{totalHabits}
              </span>
            </div>
            <Progress value={completionPercentage} className="h-3" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {completedToday === totalHabits && totalHabits > 0
              ? "Perfect! All habits completed today! 🎉"
              : `Keep going! ${totalHabits - completedToday} habit${
                  totalHabits - completedToday !== 1 ? "s" : ""
                } left.`}
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
                  onClick={startListening}
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
              const streak = getStreak(habit.completedDates);

              return (
                <Card
                  key={habit.id}
                  className={`glass p-6 group transition-all duration-300 ${
                    isCompletedToday ? "glow-pink border-accent/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <Button
                      size="icon"
                      variant={isCompletedToday ? "default" : "outline"}
                      onClick={() => toggleHabitToday(habit.id)}
                      className={`${
                        isCompletedToday
                          ? "bg-accent text-accent-foreground"
                          : "border-border/50"
                      } transition-all duration-300`}
                    >
                      <Check className="w-4 h-4" />
                    </Button>

                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{habit.name}</h3>
                      <div className="flex gap-4 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {streak} day streak 🔥
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {habit.completedDates.length} total completions
                        </span>
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
