import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Notes from "./pages/Notes";
import Tasks from "./pages/Tasks";
import Habits from "./pages/Habits";
import Diary from "./pages/Diary";
import DiaryAi from "./pages/DiaryAi";
import Journal from "./pages/Journal";
import JournalAi from "./pages/JournalAi";
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

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const isFirst = storage.isFirstLaunch();
    if (isFirst) {
      setShowWelcome(true);
    }
    const pin = localStorage.getItem("dailynova_app_pin");
    const lockEnabled = localStorage.getItem("dailynova_lock_enabled") === "true";
    if (pin && lockEnabled) {
      setIsLocked(true);
    }
    notificationService.setupDailyReminders();
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
    if (!showWelcome) {
      setIsReady(true);
    }
  };

  const handleWelcomeComplete = () => {
    storage.setFirstLaunchComplete();
    setShowWelcome(false);
    setIsReady(true);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (showWelcome) {
    return <WelcomeScreen onComplete={handleWelcomeComplete} />;
  }

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navigation />
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
            <Route path="/diary/ai" element={<PinGate storageKey="dailynova_diary_lock" pinKey="dailynova_diary_pin" title="Unlock Diary"><DiaryAi /></PinGate>} />
            <Route path="/journal" element={<PinGate storageKey="dailynova_journal_lock" pinKey="dailynova_journal_pin" title="Unlock Journal"><Journal /></PinGate>} />
            <Route path="/journal/ai" element={<PinGate storageKey="dailynova_journal_lock" pinKey="dailynova_journal_pin" title="Unlock Journal"><JournalAi /></PinGate>} />
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