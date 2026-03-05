import { useState, useEffect } from "react";
import { 
  Settings as SettingsIcon, 
  Palette, 
  Bell, 
  Trash2, 
  Download, 
  Moon,
  Sun,
  Info,
  BookOpen,
  BookMarked,
  Share2,
  MessageCircle,
  Send,
  Lock,
  ShieldCheck,
  Clock
} from "lucide-react";
import PinSetup from "@/components/PinSetup";
import { notificationService } from "@/lib/notifications";
import { AmPmTimePicker } from "@/components/AmPmTimePicker";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import { storage } from "@/lib/storage";
import { format } from "date-fns";

const Settings = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifyDiary, setNotifyDiary] = useState(localStorage.getItem("dailynova_notify_diary") === "true");
  const [notifyJournal, setNotifyJournal] = useState(localStorage.getItem("dailynova_notify_journal") === "true");
  const [notifyHabits, setNotifyHabits] = useState(localStorage.getItem("dailynova_notify_habits") === "true");
  const [notifyTasks, setNotifyTasks] = useState(localStorage.getItem("dailynova_notify_tasks") === "true");
  const [notifyHour, setNotifyHour] = useState(localStorage.getItem("dailynova_notify_hour") || "20");
  const [notifyMinute, setNotifyMinute] = useState(localStorage.getItem("dailynova_notify_minute") || "0");
  const [diaryHour, setDiaryHour] = useState(localStorage.getItem("dailynova_diary_hour") || "21");
  const [diaryMinute, setDiaryMinute] = useState(localStorage.getItem("dailynova_diary_minute") || "0");
  const [journalHour, setJournalHour] = useState(localStorage.getItem("dailynova_journal_hour") || "21");
  const [journalMinute, setJournalMinute] = useState(localStorage.getItem("dailynova_journal_minute") || "0");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(
    localStorage.getItem("dailynova_lock_enabled") === "true"
  );
  const [diaryLock, setDiaryLock] = useState(
    localStorage.getItem("dailynova_diary_lock") === "true"
  );
  const [journalLock, setJournalLock] = useState(
    localStorage.getItem("dailynova_journal_lock") === "true"
  );
  const [showPinSetup, setShowPinSetup] = useState(false);
  const { toast } = useToast();

  const sendFeedback = () => {
    if (!feedbackText.trim()) return;
    // Store feedback locally (will sync to backend in native app)
    const feedbackLog = JSON.parse(localStorage.getItem("dailynova_user_feedback") || "[]");
    feedbackLog.push({
      message: feedbackText,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem("dailynova_user_feedback", JSON.stringify(feedbackLog));
    setFeedbackText("");
    setFeedbackSent(true);
    toast({
      title: "Thank you!",
      description: "Your feedback has been recorded.",
    });
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
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dailynova-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export successful",
        description: "Your data has been exported.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export data.",
        variant: "destructive",
      });
    }
  };

  const exportDiary = async () => {
    try {
      const entries = storage.getDiaryEntries();
      if (entries.length === 0) {
        toast({ title: "No diary entries", description: "Nothing to export." });
        return;
      }
      
      const content = entries
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(e => `--- ${format(new Date(e.date), "MMMM d, yyyy")} ---\n\n${e.content}`)
        .join("\n\n\n");
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diary-export-${format(new Date(), "yyyy-MM-dd")}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: "Diary exported", description: `${entries.length} entries saved.` });
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const exportJournal = async () => {
    try {
      const entries = storage.getJournalEntries();
      if (entries.length === 0) {
        toast({ title: "No journal entries", description: "Nothing to export." });
        return;
      }
      
      const content = entries
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map(e => `--- ${format(new Date(e.createdAt), "MMMM d, yyyy")} ---\n\n${e.content}`)
        .join("\n\n\n");
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `journal-export-${format(new Date(), "yyyy-MM-dd")}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: "Journal exported", description: `${entries.length} entries saved.` });
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const shareDiary = async () => {
    const entries = storage.getDiaryEntries();
    if (entries.length === 0) {
      toast({ title: "No diary entries", description: "Nothing to share." });
      return;
    }
    
    const latest = entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const shareText = `Diary Entry - ${format(new Date(latest.date), "MMMM d, yyyy")}\n\n${latest.content}\n\n— From DailyNova`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Diary Entry", text: shareText });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }
    
    await navigator.clipboard.writeText(shareText);
    toast({ title: "Copied!", description: "Latest diary entry copied to clipboard." });
  };

  const shareJournal = async () => {
    const entries = storage.getJournalEntries();
    if (entries.length === 0) {
      toast({ title: "No journal entries", description: "Nothing to share." });
      return;
    }
    
    const latest = entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    const shareText = `Journal Entry - ${format(new Date(latest.createdAt), "MMMM d, yyyy")}\n\n${latest.content}\n\n— From DailyNova`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Journal Entry", text: shareText });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }
    
    await navigator.clipboard.writeText(shareText);
    toast({ title: "Copied!", description: "Latest journal entry copied to clipboard." });
  };

  const clearAllData = () => {
    try {
      localStorage.clear();
      toast({
        title: "Data cleared",
        description: "All app data has been deleted.",
      });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not clear data.",
        variant: "destructive",
      });
    }
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
          <SettingsIcon className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold text-primary">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Appearance */}
          <Card className="glass p-6">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Appearance</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isDarkMode ? <Moon className="w-5 h-5 text-muted-foreground" /> : <Sun className="w-5 h-5 text-muted-foreground" />}
                  <Label htmlFor="dark-mode" className="cursor-pointer">Dark Mode</Label>
                </div>
                <Switch 
                  id="dark-mode" 
                  checked={isDarkMode} 
                  onCheckedChange={setIsDarkMode}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Dark mode is currently the default theme. Light mode coming soon.
              </p>
            </div>
          </Card>

          {/* Notifications & Reminders */}
          <Card className="glass p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Reminders</h2>
            </div>
            <div className="space-y-5">
              {/* Diary Reminder */}
              <div className="space-y-2 p-3 rounded-lg bg-background/30 border border-border/20">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-diary" className="cursor-pointer text-sm font-medium">📖 Diary Reminder</Label>
                  <Switch id="notify-diary" checked={notifyDiary} onCheckedChange={(v) => {
                    localStorage.setItem("dailynova_notify_diary", String(v));
                    setNotifyDiary(v);
                    notificationService.setupDiaryReminder();
                  }} />
                </div>
                {notifyDiary && (
                  <AmPmTimePicker hour={diaryHour} minute={diaryMinute} onTimeChange={(h, m) => {
                    localStorage.setItem("dailynova_diary_hour", h); localStorage.setItem("dailynova_diary_minute", m);
                    setDiaryHour(h); setDiaryMinute(m); notificationService.setupDiaryReminder();
                  }} />
                )}
                <p className="text-xs text-muted-foreground">Reminds you to write + 1 follow-up 2hrs later.</p>
              </div>

              {/* Journal Reminder */}
              <div className="space-y-2 p-3 rounded-lg bg-background/30 border border-border/20">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-journal" className="cursor-pointer text-sm font-medium">✍️ Journal Reminder</Label>
                  <Switch id="notify-journal" checked={notifyJournal} onCheckedChange={(v) => {
                    localStorage.setItem("dailynova_notify_journal", String(v));
                    setNotifyJournal(v);
                    notificationService.setupJournalReminder();
                  }} />
                </div>
                {notifyJournal && (
                  <AmPmTimePicker hour={journalHour} minute={journalMinute} onTimeChange={(h, m) => {
                    localStorage.setItem("dailynova_journal_hour", h); localStorage.setItem("dailynova_journal_minute", m);
                    setJournalHour(h); setJournalMinute(m); notificationService.setupJournalReminder();
                  }} />
                )}
                <p className="text-xs text-muted-foreground">Reminds you to journal + 1 follow-up 2hrs later.</p>
              </div>

              {/* Habits General Reminder */}
              <div className="space-y-2 p-3 rounded-lg bg-background/30 border border-border/20">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-habits" className="cursor-pointer text-sm font-medium">🎯 Habits Reminder</Label>
                  <Switch id="notify-habits" checked={notifyHabits} onCheckedChange={(v) => {
                    localStorage.setItem("dailynova_notify_habits", String(v));
                    setNotifyHabits(v);
                    notificationService.setupDailyReminders();
                  }} />
                </div>
                <p className="text-xs text-muted-foreground">General daily reminder. Set per-habit times in the Habit Tracker.</p>
              </div>

              {/* Tasks General Reminder */}
              <div className="space-y-2 p-3 rounded-lg bg-background/30 border border-border/20">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-tasks" className="cursor-pointer text-sm font-medium">✅ Tasks Reminder</Label>
                  <Switch id="notify-tasks" checked={notifyTasks} onCheckedChange={(v) => {
                    localStorage.setItem("dailynova_notify_tasks", String(v));
                    setNotifyTasks(v);
                    notificationService.setupDailyReminders();
                  }} />
                </div>
                <p className="text-xs text-muted-foreground">Per-task alarms are set when creating tasks.</p>
              </div>

              {/* General fallback time */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm">Default Reminder Time</Label>
                <AmPmTimePicker hour={notifyHour} minute={notifyMinute} onTimeChange={(h, m) => {
                  localStorage.setItem("dailynova_notify_hour", h); localStorage.setItem("dailynova_notify_minute", m);
                  setNotifyHour(h); setNotifyMinute(m); notificationService.setupDailyReminders();
                }} />
              </div>
              <p className="text-xs text-muted-foreground">
                Used for habits & tasks general reminders. Uses phone's default notification sound. Works in native app only.
              </p>
            </div>
          </Card>

          {/* App Lock */}
          <Card className="glass p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-semibold">App Lock</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="app-lock" className="cursor-pointer">Enable PIN Lock</Label>
                <Switch
                  id="app-lock"
                  checked={lockEnabled}
                  onCheckedChange={(checked) => {
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
                  }}
                />
              </div>
              {lockEnabled && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="diary-lock" className="cursor-pointer text-sm">Lock Diary</Label>
                    </div>
                    <Switch
                      id="diary-lock"
                      checked={diaryLock}
                      onCheckedChange={(v) => {
                        localStorage.setItem("dailynova_diary_lock", String(v));
                        setDiaryLock(v);
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="journal-lock" className="cursor-pointer text-sm">Lock Journal</Label>
                    </div>
                    <Switch
                      id="journal-lock"
                      checked={journalLock}
                      onCheckedChange={(v) => {
                        localStorage.setItem("dailynova_journal_lock", String(v));
                        setJournalLock(v);
                      }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowPinSetup(true)}
                  >
                    Change PIN
                  </Button>
                </>
              )}
              <p className="text-xs text-muted-foreground">
                Require a 4-digit PIN when opening the app.
              </p>
            </div>
          </Card>

          {/* Diary & Journal Export */}
          <Card className="glass p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-success" />
              <h2 className="text-xl font-semibold">Diary Export</h2>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportDiary} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={shareDiary} variant="outline" className="flex-1">
                <Share2 className="w-4 h-4 mr-2" />
                Share Latest
              </Button>
            </div>
          </Card>

          <Card className="glass p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookMarked className="w-5 h-5 text-secondary" />
              <h2 className="text-xl font-semibold">Journal Export</h2>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportJournal} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={shareJournal} variant="outline" className="flex-1">
                <Share2 className="w-4 h-4 mr-2" />
                Share Latest
              </Button>
            </div>
          </Card>

          {/* Data Management */}
          <Card className="glass p-6">
            <div className="flex items-center gap-2 mb-4">
              <Download className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Data Management</h2>
            </div>
            <div className="space-y-4">
              <Button onClick={exportAllData} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Export All Data
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Data
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

          {/* Send Feedback */}
          <Card className="glass p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-semibold">Send Feedback</h2>
            </div>
            <div className="space-y-3">
              <Textarea
                placeholder="Tell us what you think, report bugs, or suggest features..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="min-h-[100px] bg-background/50 border-border/50 focus:border-accent"
              />
              <Button 
                onClick={sendFeedback} 
                disabled={!feedbackText.trim() || feedbackSent}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {feedbackSent ? "Sent! Thank you ✓" : "Send Feedback"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Your feedback helps us improve DailyNova for everyone.
              </p>
            </div>
          </Card>

          <Card className="glass p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">About</h2>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>DailyNova</strong> v1.0.0</p>
              <p>Your personal productivity companion with Notes, Diary, Journal, Habits, Tasks, and Daily Quotes.</p>
              <p className="pt-2">© 2024 DailyNova. All rights reserved.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
