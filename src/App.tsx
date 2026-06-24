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
import { cancelTaskNotifications, getTaskNotificationId, rescheduleAllTaskNotifications } from "./lib/task-reminders";

const queryClient = new QueryClient();

const NotificationRouter = () => {
  const navigate = useNavigate();
  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        handle = await LocalNotifications.addListener("localNotificationActionPerformed", async (event) => {
          const extra = event.notification.extra || {};
          const actionId = event.actionId;
          const taskId = extra.taskId as string | undefined;
          const visibleId = Number(extra.visibleId || extra.taskGroupId || event.notification.id);

          if ((actionId === "complete" || actionId === "snooze") && Number.isFinite(visibleId)) {
            await notificationService.clearVisibleNotification(visibleId);
          }

          if (actionId === "complete" && taskId) {
            const tasks = storage.getTasks();
            const task = tasks.find((t) => t.id === taskId);
            if (task) {
              storage.saveTasks(tasks.map((t) => (t.id === taskId ? { ...t, completed: true } : t)));
              await cancelTaskNotifications(task);
            }
            return;
          }

          if (actionId === "snooze" && taskId) {
            const task = storage.getTasks().find((t) => t.id === taskId);
            const snoozeMinutes = Math.max(1, Number(extra.snoozeMinutes || task?.snoozeMinutes || 10));
            const snoozeAt = new Date(Date.now() + snoozeMinutes * 60 * 1000);
            await notificationService.scheduleTaskAlarm({
              id: getTaskNotificationId(taskId, 9000),
              title: task?.title || event.notification.title || "Reminder",
              body: `Snoozed for ${snoozeMinutes} minutes`,
              at: snoozeAt,
              alertLevel: (task?.alertLevel || extra.alertLevel || "medium") as any,
              notificationSound: (task?.notificationSound || extra.notificationSound || "gentle") as any,
              taskId,
              snoozeMinutes,
              route: "/tasks",
            });
            return;
          }

          const route = extra.route;
          navigate(typeof route === "string" && route.startsWith("/") ? route : "/");
        });
      } catch {}
    })();
    return () => handle?.remove();
  }, [navigate]);
  return null;
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