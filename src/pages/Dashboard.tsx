import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, CheckSquare, Target, BookOpen, Sparkles, BookMarked } from "lucide-react";
import { Card } from "@/components/ui/card";
import { storage } from "@/lib/storage";

const Dashboard = () => {
  const [stats, setStats] = useState({
    notesToday: 0,
    nextTask: "",
    habitsCompleted: 0,
    totalHabits: 0,
  });

  useEffect(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const notes = storage.getNotes();
    const tasks = storage.getTasks();
    const habits = storage.getHabits();

    const notesToday = notes.filter(
      (note) => new Date(note.createdAt).toDateString() === todayStr
    ).length;

    const incompleteTasks = tasks.filter((task) => !task.completed);
    const nextTask = incompleteTasks.length > 0 ? incompleteTasks[0].title : "No pending tasks";

    const habitsCompleted = habits.filter((habit) =>
      habit.completedDates.includes(todayLocal)
    ).length;

    setStats({
      notesToday,
      nextTask,
      habitsCompleted,
      totalHabits: habits.length,
    });
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            DailyNova
          </h1>
          <p className="text-muted-foreground text-lg">
            Your personal productivity companion
          </p>
        </div>

        {/* Primary Actions - Large Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Link to="/notes" className="group">
            <Card className="glass glow p-6 border-primary/20 h-full transition-all duration-300 hover:scale-[1.03] hover:border-primary/50">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <FileText className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">Notes</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.notesToday} today
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to="/tasks" className="group">
            <Card className="glass glow-purple p-6 border-secondary/20 h-full transition-all duration-300 hover:scale-[1.03] hover:border-secondary/50">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                  <CheckSquare className="w-7 h-7 text-secondary" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">Tasks</p>
                  <p className="text-sm text-muted-foreground mt-1 truncate max-w-[180px]">
                    {stats.nextTask}
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to="/habits" className="group">
            <Card className="glass glow-pink p-6 border-accent/20 h-full transition-all duration-300 hover:scale-[1.03] hover:border-accent/50">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <Target className="w-7 h-7 text-accent" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">Habits</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.habitsCompleted}/{stats.totalHabits} today
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Secondary Actions - Smaller Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link to="/diary" className="group">
            <Card className="glass p-4 border-border/30 transition-all duration-300 hover:scale-[1.02] hover:border-success/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors shrink-0">
                  <BookOpen className="w-5 h-5 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm">Diary</p>
                  <p className="text-xs text-muted-foreground">Daily reflection</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to="/journal" className="group">
            <Card className="glass p-4 border-border/30 transition-all duration-300 hover:scale-[1.02] hover:border-secondary/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors shrink-0">
                  <BookMarked className="w-5 h-5 text-secondary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm">Journal</p>
                  <p className="text-xs text-muted-foreground">Free writing</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Quote of the Day */}
        <Link to="/quotes">
          <Card className="glass glow p-6 text-center cursor-pointer hover:scale-[1.02] transition-transform duration-300">
            <Sparkles className="w-6 h-6 text-accent mx-auto mb-3" />
            <p className="text-base italic text-foreground mb-1">
              "The only way to do great work is to love what you do."
            </p>
            <p className="text-xs text-muted-foreground">— Steve Jobs</p>
            <p className="text-xs text-primary mt-3">Tap for more inspiration →</p>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
