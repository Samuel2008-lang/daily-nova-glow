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
import Journal from "./pages/Journal";
import Quotes from "./pages/Quotes";
import Premium from "./pages/Premium";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Navigation from "./components/Navigation";
import { InterstitialAdManager } from "./components/InterstitialAdManager";
import SplashScreen from "./components/SplashScreen";
import WelcomeScreen from "./components/WelcomeScreen";
import LockScreen from "./components/LockScreen";
import PinGate from "./components/PinGate";
import { storage } from "./lib/storage";

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
    // Check if app lock is enabled
    const pin = localStorage.getItem("dailynova_app_pin");
    const lockEnabled = localStorage.getItem("dailynova_lock_enabled") === "true";
    if (pin && lockEnabled) {
      setIsLocked(true);
    }
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
           <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/diary" element={<PinGate storageKey="dailynova_diary_lock"><Diary /></PinGate>} />
            <Route path="/journal" element={<PinGate storageKey="dailynova_journal_lock"><Journal /></PinGate>} />
            <Route path="/quotes" element={<Quotes />} />
            <Route path="/premium" element={<Premium />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;