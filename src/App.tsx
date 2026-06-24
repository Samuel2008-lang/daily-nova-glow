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
import { completeReminder, ReminderActionPayload, snoozeReminder } from "./lib/reminder-actions";
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

  useEffect(() => {
    const onReminder = (event: Event) => setReminder((event as CustomEvent<ReminderActionPayload>).detail);
    window.addEventListener("dailynova:reminder-alert", onReminder);
    return () => window.removeEventListener("dailynova:reminder-alert", onReminder);
  }, []);

  if (!reminder) return null;

  const title = storage.getTasks().find((task) => task.id === reminder.taskId)?.title || reminder.title || "Reminder";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl px-6 animate-fade-in">
      <Card className="glass glow-pink w-full max-w-sm p-6 text-center border-accent/40">
        <div className="mx-auto mb-5 h-14 w-14 rounded-2xl bg-accent/20 flex items-center justify-center text-2xl">🔔</div>
        <p className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Reminder</p>
        <h2 className="text-2xl font-bold text-foreground mb-8">{title}</h2>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={async () => {
              await snoozeReminder(reminder);
              setReminder(null);
            }}
          >
            Snooze
          </Button>
          <Button
            className="glow-pink"
            onClick={async () => {
              await completeReminder(reminder);
              setReminder(null);
            }}
          >
            Complete
          </Button>
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