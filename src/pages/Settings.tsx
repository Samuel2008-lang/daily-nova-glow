import { useState } from "react";
import {
  Settings as SettingsIcon,
  Bell,
  Trash2,
  Download,
  Info,
  BookOpen,
  BookMarked,
  Share2,
  MessageCircle,
  Send,
  Lock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Database,
  Brain,
  Inbox,
} from "lucide-react";
import PinSetup from "@/components/PinSetup";
import { notificationService } from "@/lib/notifications";
import { AmPmTimePicker } from "@/components/AmPmTimePicker";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getCorrectionRecords, clearLearning } from "@/lib/ai-learning";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { storage } from "@/lib/storage";
import { format } from "date-fns";

const Settings = () => {
  const [notifyDiary, setNotifyDiary] = useState(localStorage.getItem("dailynova_notify_diary") === "true");
  const [notifyJournal, setNotifyJournal] = useState(localStorage.getItem("dailynova_notify_journal") === "true");
  const [notifyHabits, setNotifyHabits] = useState(localStorage.getItem("dailynova_notify_habits") === "true");
  const [notifyTasks, setNotifyTasks] = useState(localStorage.getItem("dailynova_notify_tasks") === "true");
  const [diaryHour, setDiaryHour] = useState(localStorage.getItem("dailynova_diary_hour") || "21");
  const [diaryMinute, setDiaryMinute] = useState(localStorage.getItem("dailynova_diary_minute") || "0");
  const [journalHour, setJournalHour] = useState(localStorage.getItem("dailynova_journal_hour") || "21");
  const [journalMinute, setJournalMinute] = useState(localStorage.getItem("dailynova_journal_minute") || "0");
  const [diaryTimeOpen, setDiaryTimeOpen] = useState(false);
  const [journalTimeOpen, setJournalTimeOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(localStorage.getItem("dailynova_lock_enabled") === "true");
  const [diaryLock, setDiaryLock] = useState(localStorage.getItem("dailynova_diary_lock") === "true");
  const [journalLock, setJournalLock] = useState(localStorage.getItem("dailynova_journal_lock") === "true");
  const [showPinSetup, setShowPinSetup] = useState(false);
  const { toast } = useToast();

  const sendFeedback = () => {
    if (!feedbackText.trim()) return;
    // Native in-app feedback: store locally (zero-cost, no external mail intent).
    try {
      const existing = JSON.parse(localStorage.getItem("dailynova_feedback_queue") || "[]");
      existing.push({
        id: crypto.randomUUID(),
        message: feedbackText.trim(),
        createdAt: new Date().toISOString(),
        version: "1.0.0",
      });
      localStorage.setItem("dailynova_feedback_queue", JSON.stringify(existing));
    } catch {
      // ignore storage errors
    }
    setFeedbackText("");
    setFeedbackSent(true);
    toast({ title: "Thank you!", description: "Your feedback has been saved and will help shape future updates." });
    setTimeout(() => setFeedbackSent(false), 3000);
  };

  const exportAllData = () => {
    try {
      const data = {
        notes: storage.getNotes(),
        diaryEntries: storage.getDiaryEntries(),
        journalEntries: storage.getJournalEntries(),
        habits: storage.getHabits(),
        tasks: storage.getTasks(),
        exportedAt: new Date().toISOString(),
      };
      downloadFile(JSON.stringify(data, null, 2), `dailynova-backup-${new Date().toISOString().split("T")[0]}.json`, "application/json");
      toast({ title: "Export successful", description: "Your data has been exported." });
    } catch {
      toast({ title: "Export failed", description: "Could not export data.", variant: "destructive" });
    }
  };

  const exportDiary = () => {
    const entries = storage.getDiaryEntries();
    if (!entries.length) { toast({ title: "No diary entries" }); return; }
    const content = entries
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((e) => `--- ${format(new Date(e.date), "MMMM d, yyyy")} ---\n\n${e.content}`)
      .join("\n\n\n");
    downloadFile(content, `diary-export-${format(new Date(), "yyyy-MM-dd")}.txt`, "text/plain");
    toast({ title: "Diary exported", description: `${entries.length} entries saved.` });
  };

  const exportJournal = () => {
    const entries = storage.getJournalEntries();
    if (!entries.length) { toast({ title: "No journal entries" }); return; }
    const content = entries
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((e) => `--- ${format(new Date(e.createdAt), "MMMM d, yyyy")} ---\n\n${e.content}`)
      .join("\n\n\n");
    downloadFile(content, `journal-export-${format(new Date(), "yyyy-MM-dd")}.txt`, "text/plain");
    toast({ title: "Journal exported", description: `${entries.length} entries saved.` });
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearAllData = () => {
    localStorage.clear();
    toast({ title: "Data cleared", description: "All app data has been deleted." });
    setTimeout(() => window.location.reload(), 1000);
  };

  if (showPinSetup) {
    return (
      <PinSetup
        onComplete={(newPin) => {
          localStorage.setItem("dailynova_app_pin", newPin);
          localStorage.setItem("dailynova_lock_enabled", "true");
          setLockEnabled(true);
          setShowPinSetup(false);
          toast({ title: "PIN set!", description: "App lock is now enabled." });
        }}
        onCancel={() => setShowPinSetup(false)}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold text-primary">Settings</h1>
        </div>

        <div className="space-y-5">
          {/* Reminders — unified */}
          <Card className="glass p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Reminders</h2>
            </div>
            <div className="space-y-3">
              {/* Diary */}
              <Collapsible open={diaryTimeOpen} onOpenChange={setDiaryTimeOpen}>
                <div className="p-3 rounded-lg bg-background/30 border border-border/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify-diary" className="cursor-pointer text-sm font-medium">📖 Diary</Label>
                    <Switch id="notify-diary" checked={notifyDiary} onCheckedChange={(v) => {
                      localStorage.setItem("dailynova_notify_diary", String(v));
                      setNotifyDiary(v);
                      if (v) setDiaryTimeOpen(true);
                      notificationService.setupDiaryReminder();
                    }} />
                  </div>
                  {notifyDiary && (
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {diaryTimeOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {diaryTimeOpen ? "Hide time" : "Set time"}
                      </button>
                    </CollapsibleTrigger>
                  )}
                  <CollapsibleContent>
                    <AmPmTimePicker hour={diaryHour} minute={diaryMinute} onTimeChange={(h, m) => {
                      localStorage.setItem("dailynova_diary_hour", h);
                      localStorage.setItem("dailynova_diary_minute", m);
                      setDiaryHour(h);
                      setDiaryMinute(m);
                      notificationService.setupDiaryReminder();
                    }} />
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Journal */}
              <Collapsible open={journalTimeOpen} onOpenChange={setJournalTimeOpen}>
                <div className="p-3 rounded-lg bg-background/30 border border-border/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify-journal" className="cursor-pointer text-sm font-medium">✍️ Journal</Label>
                    <Switch id="notify-journal" checked={notifyJournal} onCheckedChange={(v) => {
                      localStorage.setItem("dailynova_notify_journal", String(v));
                      setNotifyJournal(v);
                      if (v) setJournalTimeOpen(true);
                      notificationService.setupJournalReminder();
                    }} />
                  </div>
                  {notifyJournal && (
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {journalTimeOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {journalTimeOpen ? "Hide time" : "Set time"}
                      </button>
                    </CollapsibleTrigger>
                  )}
                  <CollapsibleContent>
                    <AmPmTimePicker hour={journalHour} minute={journalMinute} onTimeChange={(h, m) => {
                      localStorage.setItem("dailynova_journal_hour", h);
                      localStorage.setItem("dailynova_journal_minute", m);
                      setJournalHour(h);
                      setJournalMinute(m);
                      notificationService.setupJournalReminder();
                    }} />
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Habits */}
              <div className="p-3 rounded-lg bg-background/30 border border-border/20">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-habits" className="cursor-pointer text-sm font-medium">🎯 Habits</Label>
                  <Switch id="notify-habits" checked={notifyHabits} onCheckedChange={(v) => {
                    localStorage.setItem("dailynova_notify_habits", String(v));
                    setNotifyHabits(v);
                    notificationService.setupDailyReminders();
                  }} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Per-habit times set in Habit Tracker.</p>
              </div>

              {/* Tasks */}
              <div className="p-3 rounded-lg bg-background/30 border border-border/20">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-tasks" className="cursor-pointer text-sm font-medium">✅ Tasks</Label>
                  <Switch id="notify-tasks" checked={notifyTasks} onCheckedChange={(v) => {
                    localStorage.setItem("dailynova_notify_tasks", String(v));
                    setNotifyTasks(v);
                    notificationService.setupDailyReminders();
                  }} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Per-task alarms set when creating tasks.</p>
              </div>
            </div>
          </Card>

          {/* App Lock */}
          <Card className="glass p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold">App Lock</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="app-lock" className="cursor-pointer">Enable PIN Lock</Label>
                <Switch id="app-lock" checked={lockEnabled} onCheckedChange={(checked) => {
                  if (checked) {
                    const existingPin = localStorage.getItem("dailynova_app_pin");
                    if (existingPin) {
                      localStorage.setItem("dailynova_lock_enabled", "true");
                      setLockEnabled(true);
                    } else {
                      setShowPinSetup(true);
                    }
                  } else {
                    localStorage.setItem("dailynova_lock_enabled", "false");
                    setLockEnabled(false);
                  }
                }} />
              </div>
              {lockEnabled && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="diary-lock" className="cursor-pointer text-sm">Lock Diary</Label>
                    </div>
                    <Switch id="diary-lock" checked={diaryLock} onCheckedChange={(v) => {
                      localStorage.setItem("dailynova_diary_lock", String(v));
                      setDiaryLock(v);
                    }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="journal-lock" className="cursor-pointer text-sm">Lock Journal</Label>
                    </div>
                    <Switch id="journal-lock" checked={journalLock} onCheckedChange={(v) => {
                      localStorage.setItem("dailynova_journal_lock", String(v));
                      setJournalLock(v);
                    }} />
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => setShowPinSetup(true)}>
                    Change PIN
                  </Button>
                </>
              )}
              <p className="text-[11px] text-muted-foreground">Require a 4-digit PIN when opening the app.</p>
            </div>
          </Card>

          {/* Data Management — grouped */}
          <Card className="glass p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Data Management</h2>
            </div>
            <div className="space-y-2">
              <Button onClick={exportAllData} variant="outline" className="w-full justify-start gap-2">
                <Download className="w-4 h-4" /> Export All Data
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={exportDiary} variant="outline" className="justify-start gap-2 text-sm">
                  <BookOpen className="w-4 h-4" /> Export Diary
                </Button>
                <Button onClick={exportJournal} variant="outline" className="justify-start gap-2 text-sm">
                  <BookMarked className="w-4 h-4" /> Export Journal
                </Button>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full gap-2">
                    <Trash2 className="w-4 h-4" /> Clear All Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear All Data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your notes, diary entries, journal entries, habits, and tasks. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={clearAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>

          {/* Feedback */}
          <Card className="glass p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold">Send Feedback</h2>
            </div>
            <div className="space-y-3">
              <Textarea
                placeholder="Tell us what you think, report bugs, or suggest features..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="min-h-[80px] bg-background/50 border-border/50 focus:border-accent"
              />
              <Button onClick={sendFeedback} disabled={!feedbackText.trim() || feedbackSent} className="w-full gap-2">
                <Send className="w-4 h-4" />
                {feedbackSent ? "Sent! Thank you ✓" : "Send Feedback"}
              </Button>
            </div>
          </Card>

          {/* Feedback Review — internal */}
          <FeedbackReviewSection />

          {/* About */}
          <Card className="glass p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">About</h2>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><strong>DailyNova</strong> v1.0.0</p>
              <p>Your personal life system — Notes, Tasks, Habits, Diary, Journal & more.</p>
              <p className="pt-1">© 2024 DailyNova. All rights reserved.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

/* ---- Feedback & AI-Learning Review ---- */
function FeedbackReviewSection() {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [corrections, setCorrections] = useState<any[]>([]);
  const { toast } = useToast();

  const refresh = () => {
    try {
      setFeedback(JSON.parse(localStorage.getItem("dailynova_feedback_queue") || "[]"));
    } catch { setFeedback([]); }
    setCorrections(getCorrectionRecords());
  };

  const handleToggle = (next: boolean) => {
    setOpen(next);
    if (next) refresh();
  };

  const clearFeedback = () => {
    localStorage.removeItem("dailynova_feedback_queue");
    setFeedback([]);
    toast({ title: "Feedback cleared" });
  };

  const resetLearning = () => {
    clearLearning();
    setCorrections([]);
    toast({ title: "AI learning reset", description: "Auto-detection will start fresh." });
  };

  return (
    <Card className="glass p-5">
      <Collapsible open={open} onOpenChange={handleToggle}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold">Feedback Review</h2>
            </div>
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-accent" />
                Saved Feedback ({feedback.length})
              </h3>
              {feedback.length > 0 && (
                <Button size="sm" variant="ghost" onClick={clearFeedback} className="h-7 text-xs">Clear</Button>
              )}
            </div>
            {feedback.length === 0 ? (
              <p className="text-xs text-muted-foreground">No feedback submitted yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {feedback.slice().reverse().map((f) => (
                  <div key={f.id} className="p-2 rounded bg-background/40 border border-border/20">
                    <p className="text-xs text-foreground whitespace-pre-wrap">{f.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(f.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                AI Auto-Detect Corrections ({corrections.length})
              </h3>
              {corrections.length > 0 && (
                <Button size="sm" variant="ghost" onClick={resetLearning} className="h-7 text-xs">Reset</Button>
              )}
            </div>
            {corrections.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                The AI learns from your Quick Capture corrections — none recorded yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {corrections.slice().reverse().slice(0, 30).map((c, i) => (
                  <div key={i} className="p-2 rounded bg-background/40 border border-border/20">
                    <p className="text-xs text-foreground line-clamp-2">{c.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Predicted <span className="text-destructive">{c.predicted}</span> → corrected to{" "}
                      <span className="text-success">{c.chosen}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default Settings;
