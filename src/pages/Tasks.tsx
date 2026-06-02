import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Check, Mic, Bell, Repeat as RepeatIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { storage, Task } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { haptics } from "@/lib/haptics";
import { cancelTaskNotifications, scheduleTaskNotifications } from "@/lib/task-reminders";
import ReminderEditor from "@/components/ReminderEditor";

const sortByDue = (items: Task[]) =>
  [...items].sort((a, b) => {
    const aT = a.dueDate && a.dueTime ? new Date(`${a.dueDate}T${a.dueTime}`).getTime() : Number.MAX_SAFE_INTEGER;
    const bT = b.dueDate && b.dueTime ? new Date(`${b.dueDate}T${b.dueTime}`).getTime() : Number.MAX_SAFE_INTEGER;
    return aT - bT;
  });

const sortNewest = (items: Task[]) =>
  [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const repeatLabel = (t: Task) => {
  if (!t.repeat || t.repeat.unit === "none") return null;
  const n = t.repeat.every;
  const unit = t.repeat.unit;
  return n === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`;
};

const formatTime = (time?: string) => {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
};

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { toast } = useToast();

  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
    onResult: (transcript) => setNewTask((prev) => (prev ? prev + " " + transcript : transcript)),
  });

  useEffect(() => {
    setTasks(storage.getTasks());
  }, []);

  const openNewEditor = () => {
    if (!newTask.trim()) return;
    haptics.light();
    setEditingTask(null);
    setShowEditor(true);
  };

  const openEditFor = (t: Task) => {
    haptics.light();
    setEditingTask(t);
    setShowEditor(true);
  };

  const handleSaveReminder = async (data: any) => {
    if (editingTask) {
      await cancelTaskNotifications(editingTask);
      const updated: Task = {
        ...editingTask,
        title: data.title,
        memo: data.memo,
        dueDate: data.dueDate,
        dueTime: data.dueTime,
        repeat: data.repeat,
        duration: data.duration,
        alertLevel: data.alertLevel,
      };
      const next = tasks.map((x) => (x.id === editingTask.id ? updated : x));
      setTasks(next);
      storage.saveTasks(next);
      await scheduleTaskNotifications(updated);
      toast({ title: "Reminder updated" });
    } else {
      const task: Task = {
        id: Date.now().toString(),
        title: data.title,
        memo: data.memo,
        completed: false,
        dueDate: data.dueDate,
        dueTime: data.dueTime,
        repeat: data.repeat,
        duration: data.duration,
        alertLevel: data.alertLevel,
        createdAt: new Date().toISOString(),
      };
      const next = [task, ...tasks];
      setTasks(next);
      storage.saveTasks(next);
      await scheduleTaskNotifications(task);
      toast({ title: "Reminder saved", description: `${data.dueDate} at ${formatTime(data.dueTime)}` });
    }
    setNewTask("");
    setEditingTask(null);
    setShowEditor(false);
  };

  const toggleTask = async (id: string) => {
    const next = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    setTasks(next);
    storage.saveTasks(next);
    const task = next.find((t) => t.id === id);
    if (task?.completed) {
      haptics.success();
      await cancelTaskNotifications(task);
      toast({ title: "Done!" });
    } else {
      haptics.light();
    }
  };

  const deleteTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (task) await cancelTaskNotifications(task);
    const next = tasks.filter((t) => t.id !== id);
    setTasks(next);
    storage.saveTasks(next);
    haptics.warning();
    toast({ title: "Reminder deleted" });
  };

  const groups = useMemo(() => {
    const today = ymd(new Date());
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = ymd(tomorrowDate);

    const active = tasks.filter((t) => !t.completed);
    const completed = sortNewest(tasks.filter((t) => t.completed));

    return {
      today: sortByDue(active.filter((t) => t.dueDate === today)),
      tomorrow: sortByDue(active.filter((t) => t.dueDate === tomorrow)),
      upcoming: sortByDue(active.filter((t) => t.dueDate && t.dueDate > tomorrow)),
      noDate: sortNewest(active.filter((t) => !t.dueDate)),
      completed,
    };
  }, [tasks]);

  const renderCard = (task: Task) => (
    <Card
      key={task.id}
      className="glass p-4 group cursor-pointer hover:border-primary/40 transition-colors"
      onClick={() => !task.completed && openEditFor(task)}
    >
      <div className="flex items-start gap-3">
        <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
          <Checkbox
            checked={task.completed}
            onCheckedChange={() => toggleTask(task.id)}
            className="border-primary data-[state=checked]:bg-primary"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-foreground font-medium ${task.completed ? "line-through opacity-60" : ""}`}>
            {task.title}
          </p>
          {task.memo && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.memo}</p>}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
            {task.dueTime && (
              <span className="flex items-center gap-1">
                <Bell className="w-3 h-3 text-primary" />
                {task.dueDate} · {formatTime(task.dueTime)}
              </span>
            )}
            {repeatLabel(task) && (
              <span className="flex items-center gap-1 text-secondary">
                <RepeatIcon className="w-3 h-3" /> {repeatLabel(task)}
              </span>
            )}
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
          className="opacity-60 hover:opacity-100 hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );

  const Section = ({ label, items, accent = "text-primary" }: { label: string; items: Task[]; accent?: string }) =>
    items.length === 0 ? null : (
      <section className="mb-6">
        <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${accent}`}>
          {label} <span className="text-muted-foreground font-normal">· {items.length}</span>
        </h2>
        <div className="space-y-2">{items.map(renderCard)}</div>
      </section>
    );

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto animate-fade-in">
        <h1 className="text-3xl font-bold mb-6 text-foreground">Reminders</h1>

        {showEditor ? (
          <div className="mb-8">
            <ReminderEditor
              initialTitle={editingTask?.title || newTask}
              onCancel={() => { setShowEditor(false); setEditingTask(null); }}
              onSave={handleSaveReminder}
            />
          </div>
        ) : (
          <Card className="glass p-3 mb-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Add a new reminder…"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && openNewEditor()}
                  className="bg-background/50 border-border/50 focus:border-primary pr-12"
                />
                {isSupported && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => (isListening ? stopListening() : startListening(false, "task"))}
                    className={`absolute top-1/2 -translate-y-1/2 right-1 ${
                      isListening ? "animate-pulse text-primary" : "text-muted-foreground"
                    }`}
                    aria-label={isListening ? "Stop listening" : "Start voice input"}
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <Button onClick={openNewEditor} disabled={!newTask.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        <Section label="Today" items={groups.today} accent="text-primary" />
        <Section label="Tomorrow" items={groups.tomorrow} accent="text-secondary" />
        <Section label="Upcoming" items={groups.upcoming} accent="text-accent" />
        <Section label="No date" items={groups.noDate} accent="text-muted-foreground" />
        <Section label="Completed" items={groups.completed} accent="text-success" />

        {tasks.length === 0 && (
          <Card className="glass p-8 text-center">
            <Check className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No reminders yet. Add one above.</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Tasks;
