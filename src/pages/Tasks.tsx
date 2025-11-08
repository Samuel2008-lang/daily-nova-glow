import { useState, useEffect } from "react";
import { Plus, Trash2, Check, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { storage, Task } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const { toast } = useToast();

  const { isListening, isSupported, startListening } = useSpeechRecognition({
    onResult: (transcript) => {
      setNewTask(transcript);
    },
  });

  useEffect(() => {
    setTasks(storage.getTasks());
  }, []);

  const addTask = () => {
    if (!newTask.trim()) return;

    const task: Task = {
      id: Date.now().toString(),
      title: newTask,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const updatedTasks = [...tasks, task];
    setTasks(updatedTasks);
    storage.saveTasks(updatedTasks);
    setNewTask("");

    toast({
      title: "Task added",
      description: "Your task has been created.",
    });
  };

  const toggleTask = (id: string) => {
    const updatedTasks = tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    storage.saveTasks(updatedTasks);

    const task = updatedTasks.find((t) => t.id === id);
    if (task?.completed) {
      toast({
        title: "Task completed!",
        description: "Great job! Keep up the momentum.",
      });
    }
  };

  const deleteTask = (id: string) => {
    const updatedTasks = tasks.filter((task) => task.id !== id);
    setTasks(updatedTasks);
    storage.saveTasks(updatedTasks);

    toast({
      title: "Task deleted",
      description: "Your task has been removed.",
    });
  };

  const activeTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <h1 className="text-4xl font-bold mb-8 text-secondary">Tasks & Reminders</h1>

        {/* Add Task */}
        <Card className="glass glow-purple p-6 mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Add a new task or use voice..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addTask()}
                className="bg-background/50 border-border/50 focus:border-secondary pr-12"
              />
              {isSupported && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={startListening}
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
                    <span className="flex-1 text-foreground">{task.title}</span>
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
