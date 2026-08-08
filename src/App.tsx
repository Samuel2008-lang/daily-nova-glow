import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Notes from "./pages/Notes";
import Tasks from "./pages/Tasks";
import Habits from "./pages/Habits";
import Diary from "./pages/Diary";
import Journal from "./pages/Journal";
import Quotes from "./pages/Quotes";
import Premium from "./pages/Premium";
import Settings from "./pages/Settings";
import Timeline from "./pages/Timeline";
import Feedback from "./pages/Feedback";
import NotFound from "./pages/NotFound";
import Navigation from "./components/Navigation";
import QuickCapture from "./components/QuickCapture";
import DailyReset from "./components/DailyReset";
import { InterstitialAdManager } from "./components/InterstitialAdManager";
import SplashScreen from "./components/SplashScreen";
import WelcomeScreen from "./components/WelcomeScreen";
import LockScreen from "./components/LockScreen";
import PinGate from "./components/PinGate";
import { storage } from "./lib/storage";
import { notificationService } from "./lib/notifications";
import { rescheduleAllTaskNotifications } from "./lib/task-reminders";
import { completeReminder, snoozeReminder } from "./lib/reminder-actions";
import type { ReminderActionPayload } from "./lib/reminder-actions";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";

const queryClient = new QueryClient();

const NotificationRouter = () => {
  const navigate = useNavigate();
  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    let receiveHandle: { remove: () => void } | undefined;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        handle = await LocalNotifications.addListener("localNotificationActionPerformed", async (event) => {
          const extra = event.notification.extra || {};
          const actionId = event.actionId;
          const payload: ReminderActionPayload = {
            taskId: extra.taskId,
            visibleId: Number(extra.visibleId || extra.taskGroupId || event.notification.id),
            title: event.notification.title,
            alertLevel: extra.alertLevel,
            notificationSound: extra.notificationSound,
            snoozeMinutes: Number(extra.snoozeMinutes || 10),
          };

          if (actionId === "complete") {
            await completeReminder(payload);
            return;
          }

          if (actionId === "snooze") {
            await snoozeReminder(payload);
            return;
          }

          if (extra.fullScreen && payload.taskId) {
            window.dispatchEvent(new CustomEvent("dailynova:reminder-alert", { detail: payload }));
          }

          const route = extra.route;
          navigate(typeof route === "string" && route.startsWith("/") ? route : "/");
        });
        receiveHandle = await LocalNotifications.addListener("localNotificationReceived", (notification) => {
          const extra = notification.extra || {};
          if (extra.fullScreen && extra.taskId) {
            window.dispatchEvent(new CustomEvent("dailynova:reminder-alert", {
              detail: {
                taskId: extra.taskId,
                visibleId: Number(extra.visibleId || extra.taskGroupId || notification.id),
                title: notification.title,
                alertLevel: extra.alertLevel,
                notificationSound: extra.notificationSound,
                snoozeMinutes: Number(extra.snoozeMinutes || 10),
              } satisfies ReminderActionPayload,
            }));
          }
        });
      } catch {}
    })();
    return () => {
      handle?.remove();
      receiveHandle?.remove();
    };
  }, [navigate]);
  return null;
};

const FullScreenReminderOverlay = () => {
  const [reminder, setReminder] = useState<ReminderActionPayload | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    const onReminder = (event: Event) => setReminder((event as CustomEvent<ReminderActionPayload>).detail);
    window.addEventListener("dailynova:reminder-alert", onReminder);
    return () => window.removeEventListener("dailynova:reminder-alert", onReminder);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setThumb(null);
    if (!reminder?.taskId) return;
    const task = storage.getTasks().find((t) => t.id === reminder.taskId);
    const first = task?.imageIds?.[0];
    if (!first) return;
    import("./lib/reminder-images").then(({ reminderImages }) =>
      reminderImages.get(first).then((img) => { if (!cancelled && img) setThumb(img.dataUrl); })
    );
    return () => { cancelled = true; };
  }, [reminder?.taskId]);

  if (!reminder) return null;

  const task = storage.getTasks().find((t) => t.id === reminder.taskId);
  const title = task?.memo || task?.title || reminder.title || "Reminder";
  const strong = reminder.alertLevel === "strong";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl px-6 animate-fade-in">
      <Card className={`glass w-full max-w-sm p-6 text-center border-primary/40 ${strong ? "animate-pulse-glow" : ""}`}>
        {thumb && (
          <img src={thumb} alt="" className="w-full h-40 object-cover rounded-lg mb-4" />
        )}
        <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl">🔔</div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{strong ? "Alarm" : "Reminder"}</p>
        <h2 className="text-xl font-bold text-foreground mb-6 whitespace-pre-wrap">{title}</h2>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={async () => { await snoozeReminder(reminder); setReminder(null); }}>Snooze</Button>
          <Button onClick={async () => { await completeReminder(reminder); setReminder(null); }}>Complete</Button>
        </div>
      </Card>
    </div>
  );
};


const App = () => {
  // Splash & app lock only on TRUE cold-start within a session — never re-trigger on navigation.
  const [showSplash, setShowSplash] = useState(() => sessionStorage.getItem("dailynova_splash_shown") !== "true");
  const [showWelcome, setShowWelcome] = useState(false);
  const [isLocked, setIsLocked] = useState(() => {
    if (sessionStorage.getItem("dailynova_app_unlocked") === "true") return false;
    const pin = localStorage.getItem("dailynova_app_pin");
    const lockEnabled = localStorage.getItem("dailynova_lock_enabled") === "true";
    return !!(pin && lockEnabled);
  });

  useEffect(() => {
    if (storage.isFirstLaunch()) setShowWelcome(true);
    notificationService.setupDailyReminders();
    rescheduleAllTaskNotifications();
    import("./lib/geo-reminders").then(({ startGeofenceEngine }) => startGeofenceEngine());
    import("./lib/widget-sync").then(({ syncWidget }) => syncWidget());
  }, []);

  useEffect(() => {
    const clearTapFocus = () => {
      const active = document.activeElement as HTMLElement | null;
      if (active?.matches?.('button, a, [role="button"], [data-radix-collection-item]')) {
        window.setTimeout(() => active.blur(), 0);
      }
    };
    window.addEventListener("pointerup", clearTapFocus, true);
    window.addEventListener("touchend", clearTapFocus, true);
    window.addEventListener("click", clearTapFocus, true);
    return () => {
      window.removeEventListener("pointerup", clearTapFocus, true);
      window.removeEventListener("touchend", clearTapFocus, true);
      window.removeEventListener("click", clearTapFocus, true);
    };
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem("dailynova_splash_shown", "true");
    setShowSplash(false);
  };

  const handleWelcomeComplete = () => {
    storage.setFirstLaunchComplete();
    setShowWelcome(false);
  };

  const handleUnlock = () => {
    sessionStorage.setItem("dailynova_app_unlocked", "true");
    setIsLocked(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (showWelcome) {
    return <WelcomeScreen onComplete={handleWelcomeComplete} />;
  }

  if (isLocked) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navigation />
          <NotificationRouter />
          <FullScreenReminderOverlay />
          <InterstitialAdManager />
          <QuickCapture />
          <DailyReset />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/diary" element={<PinGate storageKey="dailynova_diary_lock" pinKey="dailynova_diary_pin" title="Unlock Diary"><Diary /></PinGate>} />
            <Route path="/journal" element={<PinGate storageKey="dailynova_journal_lock" pinKey="dailynova_journal_pin" title="Unlock Journal"><Journal /></PinGate>} />
            <Route path="/quotes" element={<Quotes />} />
            <Route path="/premium" element={<Premium />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;