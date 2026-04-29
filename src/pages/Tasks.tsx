import { useState, useEffect } from "react";
import { Plus, Trash2, Check, Mic, Bell, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { storage, Task } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { AmPmTimePicker } from "@/components/AmPmTimePicker";
import { haptics } from "@/lib/haptics";
import { cancelTaskNotifications, parseTaskReminder, scheduleTaskNotifications } from "@/lib/task-reminders";

const sortTasksNewestFirst = (items: Task[]) =>
  [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const REMINDER_OPTIONS = [
  { label: "5 min before", value: 5 },
  { label: "10 min before", value: 10 },
  { label: "30 min before", value: 30 },
  { label: "1 hour before", value: 60 },
];

const FOLLOWUP_OPTIONS = [
  { label: "10 min after", value: 10 },
  { label: "30 min after", value: 30 },
  { label: "1 hour after", value: 60 },
];

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [showAlarmForm, setShowAlarmForm] = useState(false);
  const [alarmDate, setAlarmDate] = useState("");
  const [alarmHour, setAlarmHour] = useState("12");
  const [alarmMinute, setAlarmMinute] = useState("0");
  const [reminderBefore, setReminderBefore] = useState<number | undefined>();
  const [reminderAfter, setReminderAfter] = useState<number | undefined>();
  const { toast } = useToast();

  const { isListening, isSupported, startListening } = useSpeechRecognition({
    onResult: (transcript) => {
      setNewTask(transcript);
    },
  });

  useEffect(() => {
    const sorted = sortTasksNewestFirst(storage.getTasks());
    setTasks(sorted);
    storage.saveTasks(sorted);
  }, []);

  const resetTaskForm = () => {
    setNewTask("");
    setAlarmDate("");
    setAlarmHour("12");
    setAlarmMinute("0");
    setReminderBefore(undefined);
    setReminderAfter(undefined);
    setShowAlarmForm(false);
  };

  const openAlarmFormForTask = () => {
    if (!newTask.trim()) return;
    haptics.light();
    const parsed = parseTaskReminder(newTask);
    setAlarmDate(parsed.dueDate || new Date().toISOString().slice(0, 10));
    if (parsed.dueTime) {
      const [h, m] = parsed.dueTime.split(":");
      setAlarmHour(String(parseInt(h, 10)));
      setAlarmMinute(String(parseInt(m, 10)));
    }
    setShowAlarmForm(true);
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    if (!showAlarmForm) {
      openAlarmFormForTask();
      return;
    }
    haptics.success();

    // Convert hour/minute to HH:MM for storage
    const h24 = parseInt(alarmHour, 10);
    const m = parseInt(alarmMinute, 10);
    const timeStr = alarmDate ? `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}` : undefined;

    const task: Task = {
      id: Date.now().toString(),
      title: newTask,
      completed: false,
      dueDate: alarmDate || undefined,
      dueTime: timeStr,
      reminderBefore,
      reminderAfter,
      createdAt: new Date().toISOString(),
    };

    const updatedTasks = [task, ...tasks];
    setTasks(updatedTasks);
    storage.saveTasks(updatedTasks);
    resetTaskForm();

    if (task.dueDate && task.dueTime) {
      await scheduleTaskNotifications(task);
      toast({
        title: "Task added with alarm",
        description: `Reminder set for ${task.dueDate} at ${task.dueTime}.`,
      });
    } else {
      toast({
        title: "Task added",
        description: "Your task has been created.",
      });
    }
  };

  const toggleTask = async (id: string) => {
    const updatedTasks = tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    storage.saveTasks(updatedTasks);

    const task = updatedTasks.find((t) => t.id === id);
    if (task?.completed) {
      haptics.success();
      await cancelTaskNotifications(task);
      toast({
        title: "Task completed!",
        description: "Great job! Keep up the momentum.",
      });
    } else {
      haptics.light();
    }
  };

  const deleteTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (task) await cancelTaskNotifications(task);

    const updatedTasks = tasks.filter((task) => task.id !== id);
    setTasks(updatedTasks);
    storage.saveTasks(updatedTasks);
    haptics.warning();

    toast({
      title: "Task deleted",
      description: "Your task has been removed.",
    });
  };

  const activeTasks = sortTasksNewestFirst(tasks.filter((task) => !task.completed));
  const completedTasks = sortTasksNewestFirst(tasks.filter((task) => task.completed));

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <h1 className="text-4xl font-bold mb-8 text-secondary">Tasks & Reminders</h1>

        {/* Add Task */}
        <Card className="glass glow-purple p-6 mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Add a new task..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                className="bg-background/50 border-border/50 focus:border-secondary pr-12"
              />
              {isSupported && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => startListening(true, "task")}
                  disabled={isListening}
                  className={`absolute top-1/2 -translate-y-1/2 right-1 ${
                    isListening ? "animate-pulse-glow text-secondary" : "text-muted-foreground hover:text-secondary"
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </Button>
              )}
            </div>
            <Button onClick={addTask} className="glow-purple">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Alarm scheduling form — appears after pressing +, before saving */}
          {showAlarmForm && (
            <div className="mt-4 p-4 rounded-lg bg-background/30 border border-border/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-secondary" />
                  <span className="text-sm font-medium">Set Alarm</span>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={resetTaskForm}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={alarmDate}
                  onChange={(e) => setAlarmDate(e.target.value)}
                  className="bg-background/50 border-border/50 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Time</Label>
                <AmPmTimePicker
                  hour={alarmHour}
                  minute={alarmMinute}
                  onTimeChange={(h, m) => { setAlarmHour(h); setAlarmMinute(m); }}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Remind before</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {REMINDER_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      size="sm"
                      variant={reminderBefore === opt.value ? "default" : "outline"}
                      className="text-xs h-7"
                      onClick={() => setReminderBefore(reminderBefore === opt.value ? undefined : opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Follow-up after</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {FOLLOWUP_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      size="sm"
                      variant={reminderAfter === opt.value ? "default" : "outline"}
                      className="text-xs h-7"
                      onClick={() => setReminderAfter(reminderAfter === opt.value ? undefined : opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={resetTaskForm}>Cancel</Button>
                <Button className="flex-1 glow-purple" onClick={addTask}>Save Task</Button>
              </div>
              <p className="text-xs text-muted-foreground">🔔 Shows in your phone notifications with the default alarm sound and vibration.</p>
            </div>
          )}

          {isListening && (
            <div className="flex items-center gap-2 mt-3 px-4 py-2 bg-secondary/20 rounded-lg animate-pulse-glow">
              <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
              <span className="text-sm text-secondary font-medium">Listening for task...</span>
            </div>
          )}
        </Card>

        {/* Active Tasks */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-secondary">Active Tasks</h2>
          <div className="space-y-3">
            {activeTasks.length === 0 ? (
              <Card className="glass p-6 text-center">
                <p className="text-muted-foreground">No active tasks. Add one to get started!</p>
              </Card>
            ) : (
              activeTasks.map((task) => (
                <Card key={task.id} className="glass glow-purple p-4 group">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="border-secondary data-[state=checked]:bg-secondary"
                    />
                    <div className="flex-1">
                      <span className="text-foreground">{task.title}</span>
                      {task.dueDate && task.dueTime && (
                        <div className="flex items-center gap-1 mt-1">
                          <Bell className="w-3 h-3 text-secondary" />
                          <span className="text-xs text-muted-foreground">
                            {task.dueDate} at {task.dueTime}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-success">Completed</h2>
            <div className="space-y-3">
              {completedTasks.map((task) => (
                <Card key={task.id} className="glass p-4 opacity-60 group">
                  <div className="flex items-center gap-4">
                    <Check className="w-5 h-5 text-success" />
                    <span className="flex-1 text-foreground line-through">{task.title}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
