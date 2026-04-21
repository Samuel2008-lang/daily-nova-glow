import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, CheckSquare, Target, BookOpen, Sparkles, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  // Time-aware primary actions for proactive dashboard
  const hour = new Date().getHours();
  const isEvening = hour >= 18;
  const isMorning = hour < 12;

  const primaryActions = isEvening
    ? [
        { to: "/diary", icon: BookOpen, label: "Daily Reset" },
        { to: "/journal", icon: BookMarked, label: "Reflect" },
        { to: "/tasks", icon: CheckSquare, label: "Plan Tomorrow" },
      ]
    : isMorning
      ? [
          { to: "/tasks", icon: CheckSquare, label: "Plan Tasks" },
          { to: "/habits", icon: Target, label: "Track Habit" },
          { to: "/notes", icon: FileText, label: "Capture Thought" },
        ]
      : [
          { to: "/notes", icon: FileText, label: "Add Note" },
          { to: "/tasks", icon: CheckSquare, label: "New Task" },
          { to: "/habits", icon: Target, label: "Track Habit" },
        ];

  const secondaryActions = [
    { to: "/diary", icon: BookOpen, label: "Write Diary" },
    { to: "/journal", icon: BookMarked, label: "Journal" },
  ];

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            DailyNova
          </h1>
          <p className="text-muted-foreground text-lg">
            Your personal productivity companion
          </p>
        </div>

        {/* Notes & Habits — interactive Dashboard cards (moved from bottom nav) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Link to="/notes">
            <Card className="glass p-6 border-primary/20 cursor-pointer hover:scale-[1.02] transition-transform duration-300">
              <div className="flex items-center gap-4">
                <FileText className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-primary">{stats.notesToday}</p>
                  <p className="text-sm text-muted-foreground">Notes Today</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to="/habits">
            <Card className="glass p-6 border-accent/20 cursor-pointer hover:scale-[1.02] transition-transform duration-300">
              <div className="flex items-center gap-4">
                <Target className="w-8 h-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold text-accent">
                    {stats.habitsCompleted}/{stats.totalHabits}
                  </p>
                  <p className="text-sm text-muted-foreground">Habits Today</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Next Task */}
        <Card className="glass p-6 mb-8 border-secondary/20">
          <div className="flex items-center gap-4">
            <CheckSquare className="w-8 h-8 text-secondary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-secondary truncate">
                {stats.nextTask}
              </p>
              <p className="text-sm text-muted-foreground">Next Task</p>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="glass glow p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6 text-primary">Quick Actions</h2>
          {/* Primary Actions - larger */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {primaryActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.to} to={action.to}>
                  <Button
                    variant="outline"
                    className="w-full h-24 flex flex-col gap-2 glass border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105"
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm">{action.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
          {/* Secondary Actions - smaller */}
          <div className="grid grid-cols-2 gap-3">
            {secondaryActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.to} to={action.to}>
                  <Button
                    variant="outline"
                    className="w-full h-16 flex flex-row items-center gap-2 glass border-border/30 hover:border-primary/40 transition-all duration-300 hover:scale-[1.03] text-muted-foreground hover:text-foreground"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{action.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Quote of the Day */}
        <Link to="/quotes">
          <Card className="glass glow p-8 text-center cursor-pointer hover:scale-[1.02] transition-transform duration-300">
            <Sparkles className="w-8 h-8 text-accent mx-auto mb-4" />
            <p className="text-lg italic text-foreground mb-2">
              "The only way to do great work is to love what you do."
            </p>
            <p className="text-sm text-muted-foreground">— Steve Jobs</p>
            <p className="text-xs text-primary mt-4">Click for more inspiration →</p>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
