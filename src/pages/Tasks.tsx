import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Bell, Repeat as RepeatIcon, Star, Search, ListChecks, Image as ImageIcon, RotateCcw, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { storage, Task } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { haptics } from "@/lib/haptics";
import { cancelTaskNotifications, scheduleTaskNotifications } from "@/lib/task-reminders";
import { reminderImages, StoredImage } from "@/lib/reminder-images";
import { colorValue } from "@/lib/reminder-constants";
import { restartGeofenceEngine } from "@/lib/geo-reminders";
import { syncWidget } from "@/lib/widget-sync";
import { RichText, plainText } from "@/lib/rich-text";
import ReminderEditor, { type ReminderEditorPayload } from "@/components/ReminderEditor";
import DeleteConfirmation from "@/components/DeleteConfirmation";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const formatTime = (time?: string) => {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
};

const repeatLabel = (t: Task) => {
  if (!t.repeat || t.repeat.unit === "none") return null;
  const n = t.repeat.every;
  return n === 1 ? `Every ${t.repeat.unit}` : `Every ${n} ${t.repeat.unit}s`;
};

const sortByDue = (items: Task[]) =>
  [...items].sort((a, b) => {
    const aT = a.dueDate && a.dueTime ? new Date(`${a.dueDate}T${a.dueTime}`).getTime() : Number.MAX_SAFE_INTEGER;
    const bT = b.dueDate && b.dueTime ? new Date(`${b.dueDate}T${b.dueTime}`).getTime() : Number.MAX_SAFE_INTEGER;
    return aT - bT;
  });

const sortNewest = (items: Task[]) =>
  [...items].sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime());

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>(() => storage.getTasks());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [initialTitle, setInitialTitle] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("today");
  const [thumbCache, setThumbCache] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Keep the home-screen widget and offline geofences in sync with reminders.
  useEffect(() => {
    syncWidget();
    restartGeofenceEngine();
  }, [tasks]);

  // Preload first thumbnail per task
  useEffect(() => {
    const ids = tasks.map((t) => t.imageIds?.[0]).filter((id): id is string => !!id && !thumbCache[id]);
    if (!ids.length) return;
    reminderImages.getMany(ids).then((imgs) => {
      setThumbCache((prev) => {
        const next = { ...prev };
        imgs.forEach((i: StoredImage) => { next[i.id] = i.thumb; });
        return next;
      });
    });
  }, [tasks]);

  const openNewEditor = () => {
    setEditingTask(null);
    setInitialTitle("");
    setEditorOpen(true);
  };

  const openEditFor = (t: Task) => {
    haptics.light();
    setEditingTask(t);
    setInitialTitle("");
    setEditorOpen(true);
  };

  const handleSaveReminder = async (data: ReminderEditorPayload) => {
    if (editingTask) {
      await cancelTaskNotifications(editingTask);
      const updated: Task = {
        ...editingTask,
        ...data,
        title: data.title,
      };
      const next = tasks.map((x) => (x.id === editingTask.id ? updated : x));
      setTasks(next);
      storage.saveTasks(next);
      if (data.dueDate && data.dueTime) await scheduleTaskNotifications(updated);
      toast({ title: "Reminder updated" });
    } else {
      const task: Task = {
        id: Date.now().toString(),
        ...data,
        title: data.title,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      const next = [task, ...tasks];
      setTasks(next);
      storage.saveTasks(next);
      if (data.dueDate && data.dueTime) await scheduleTaskNotifications(task);
      toast({
        title: "Reminder saved",
        description: data.dueDate ? `${data.dueDate} at ${formatTime(data.dueTime)}` : "Saved without time",
      });
    }
    setEditingTask(null);
    setEditorOpen(false);
  };

  const toggleTask = async (id: string) => {
    const target = tasks.find((t) => t.id === id);
    const nowIso = new Date().toISOString();
    const next = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? nowIso : undefined } : t
    );
    setTasks(next);
    storage.saveTasks(next);
    if (target && !target.completed) {
      haptics.success();
      await cancelTaskNotifications(target);
    } else {
      haptics.light();
      const updated = next.find((t) => t.id === id);
      if (updated?.dueDate && updated?.dueTime) await scheduleTaskNotifications(updated);
    }
  };

  const deleteTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      await cancelTaskNotifications(task);
      if (task.imageIds?.length) reminderImages.removeMany(task.imageIds);
    }
    const next = tasks.filter((t) => t.id !== id);
    setTasks(next);
    storage.saveTasks(next);
    haptics.warning();
    toast({ title: "Reminder deleted" });
  };

  const toggleImportant = (id: string) => {
    haptics.light();
    const next = tasks.map((t) => (t.id === id ? { ...t, important: !t.important } : t));
    setTasks(next);
    storage.saveTasks(next);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? tasks.filter((t) =>
          plainText(t.memo || t.title || "").toLowerCase().includes(q) ||
          (t.category || "").toLowerCase().includes(q) ||
          (t.location?.label || "").toLowerCase().includes(q)
        )
      : tasks;
  }, [tasks, search]);

  const groups = useMemo(() => {
    const today = ymd(new Date());
    const active = filtered.filter((t) => !t.completed);
    return {
      today: sortByDue(active.filter((t) => t.dueDate === today)),
      overdue: sortByDue(active.filter((t) => t.dueDate && t.dueDate < today)),
      all: sortByDue(filtered),
      scheduled: sortByDue(active.filter((t) => t.dueDate && t.dueDate > today)),
      noDate: sortNewest(active.filter((t) => !t.dueDate)),
      important: sortByDue(active.filter((t) => t.important)),
      completed: sortNewest(filtered.filter((t) => t.completed)),
    };
  }, [filtered]);

  const renderCard = (task: Task) => {
    const thumbId = task.imageIds?.[0];
    const thumb = thumbId ? thumbCache[thumbId] : undefined;
    const stripe = colorValue(task.color);
    const checklistTotal = task.checklist?.length || 0;
    const checklistDone = task.checklist?.filter((c) => c.done).length || 0;

    return (
      <Card
        key={task.id}
        className="glass p-0 overflow-hidden cursor-pointer border-border/40 hover:border-primary/40 transition-colors"
        onClick={() => !task.completed && openEditFor(task)}
      >
        <div className="flex items-stretch">
          <div className="w-1" style={{ background: stripe }} />
          <div className="flex-1 p-3">
            <div className="flex items-start gap-3">
              <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => toggleTask(task.id)}
                  className="border-primary data-[state=checked]:bg-primary"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <RichText
                    text={task.memo || task.title}
                    className={`font-medium flex-1 min-w-0 ${task.completed ? "line-through opacity-60" : "text-foreground"}`}
                  />

                  {thumb && (
                    <img src={thumb} alt="" className="w-12 h-12 rounded-md object-cover shrink-0" />
                  )}
                </div>
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
                  {task.location && (
                    <span className="flex items-center gap-1 text-primary">
                      <MapPin className="w-3 h-3" />
                      {task.location.trigger === "arrive" ? "Arrive" : "Leave"} · {task.location.label || "place"}
                    </span>
                  )}
                  {task.category && (
                    <span className="px-1.5 py-0.5 rounded-full bg-muted/60 text-[10px]">{task.category}</span>
                  )}
                  {checklistTotal > 0 && (
                    <span className="flex items-center gap-1">
                      <ListChecks className="w-3 h-3" /> {checklistDone}/{checklistTotal}
                    </span>
                  )}
                  {(task.imageIds?.length || 0) > 1 && (
                    <span className="flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> {task.imageIds!.length}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => toggleImportant(task.id)}
                  className={task.important ? "text-primary" : "text-muted-foreground/70"}
                  aria-label="Toggle important"
                >
                  <Star className={`w-4 h-4 ${task.important ? "fill-primary" : ""}`} />
                </Button>
                {task.completed ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => toggleTask(task.id)}
                    className="text-muted-foreground"
                    aria-label="Restore"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteId(task.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const Empty = ({ text }: { text: string }) => (
    <Card className="glass p-8 text-center border-border/30">
      <p className="text-sm text-muted-foreground">{text}</p>
    </Card>
  );

  const Section = ({ label, items, empty }: { label: string; items: Task[]; empty: string }) =>
    items.length === 0 ? <Empty text={empty} /> : (
      <div>
        {label && (
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">
            {label} <span className="opacity-60">· {items.length}</span>
          </h2>
        )}
        <div className="space-y-2">{items.map(renderCard)}</div>
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-6 md:pt-24 pb-28 md:pb-8">
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">Reminders</h1>
          <Button onClick={openNewEditor} size="sm" className="gap-1">
            <Plus className="w-4 h-4" /> New
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search reminders…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50 border-border/40"
          />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-5 w-full h-auto">
            <TabsTrigger value="all" className="px-1 text-xs sm:text-sm">All</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="scheduled" className="px-1 text-xs sm:text-sm">Scheduled</TabsTrigger>
            <TabsTrigger value="important" className="px-1 text-xs sm:text-sm">Important</TabsTrigger>
            <TabsTrigger value="completed">Done</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-4 space-y-6">
            {groups.overdue.length > 0 && <Section label="Overdue" items={groups.overdue} empty="" />}
            <Section label="Today" items={groups.today} empty="No reminders for today. Enjoy the calm." />
            {groups.noDate.length > 0 && <Section label="No date" items={groups.noDate} empty="" />}
          </TabsContent>
          <TabsContent value="all" className="mt-4"><Section label="" items={groups.all} empty="No reminders yet." /></TabsContent>
          <TabsContent value="scheduled" className="mt-4">
            <Section label="" items={groups.scheduled} empty="Nothing scheduled ahead." />
          </TabsContent>
          <TabsContent value="important" className="mt-4">
            <Section label="" items={groups.important} empty="Star reminders to see them here." />
          </TabsContent>
          <TabsContent value="completed" className="mt-4">
            <Section label="" items={groups.completed} empty="Completed reminders will appear here." />
          </TabsContent>
        </Tabs>
      </div>

      <DeleteConfirmation open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }} onConfirm={async () => { if (deleteId) await deleteTask(deleteId); setDeleteId(null); }} />
      {editorOpen && (
        <ReminderEditor
          initialTitle={initialTitle}
          initialTask={editingTask}
          onCancel={() => { setEditorOpen(false); setEditingTask(null); }}
          onSave={handleSaveReminder}
        />
      )}
    </div>
  );
};

export default Tasks;
