import { useState, useEffect } from "react";
import { Moon, X, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

const RESET_KEY = "dailynova_daily_reset";
const RESET_DISMISSED_KEY = "dailynova_reset_dismissed";

interface ResetData {
  date: string;
  wentWell: string;
  improve: string;
  tomorrow: string;
}

const DailyReset = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [wentWell, setWentWell] = useState("");
  const [improve, setImprove] = useState("");
  const [tomorrow, setTomorrow] = useState("");

  useEffect(() => {
    checkIfShouldShow();
  }, []);

  const checkIfShouldShow = () => {
    const now = new Date();
    const hour = now.getHours();
    
    // Show between 8 PM and midnight
    if (hour < 20) return;

    const today = now.toDateString();
    const dismissed = localStorage.getItem(RESET_DISMISSED_KEY);
    const existing = localStorage.getItem(RESET_KEY);

    if (dismissed === today) return;
    if (existing) {
      const data: ResetData = JSON.parse(existing);
      if (data.date === today) return;
    }

    // Show after a short delay
    setTimeout(() => setIsVisible(true), 2000);
  };

  const handleSkip = () => {
    localStorage.setItem(RESET_DISMISSED_KEY, new Date().toDateString());
    setIsVisible(false);
  };

  const handleSave = () => {
    const data: ResetData = {
      date: new Date().toDateString(),
      wentWell,
      improve,
      tomorrow,
    };
    localStorage.setItem(RESET_KEY, JSON.stringify(data));
    setIsVisible(false);
  };

  const steps = [
    {
      emoji: "✨",
      question: "What went well today?",
      placeholder: "A small win, a good moment...",
      value: wentWell,
      onChange: setWentWell,
    },
    {
      emoji: "🔄",
      question: "What could be better?",
      placeholder: "Something to improve tomorrow...",
      value: improve,
      onChange: setImprove,
    },
    {
      emoji: "🎯",
      question: "One thing for tomorrow?",
      placeholder: "Your top priority...",
      value: tomorrow,
      onChange: setTomorrow,
    },
  ];

  if (!isVisible) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/90 backdrop-blur-md" />
      <div className="relative w-full max-w-sm mx-4 animate-fade-in">
        <Card className="glass border-border/30 p-6 space-y-5" style={{ boxShadow: "0 0 40px hsl(var(--secondary) / 0.1)" }}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-secondary" />
              <span className="text-sm font-medium text-secondary">Daily Reset</span>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={handleSkip}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress dots */}
          <div className="flex gap-2 justify-center">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-8 bg-secondary" : i < step ? "w-4 bg-secondary/50" : "w-4 bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Question */}
          <div className="text-center space-y-2">
            <span className="text-3xl">{current.emoji}</span>
            <p className="text-lg font-medium text-foreground">{current.question}</p>
          </div>

          {/* Input */}
          <Textarea
            placeholder={current.placeholder}
            value={current.value}
            onChange={(e) => current.onChange(e.target.value)}
            className="bg-background/50 border-border/30 resize-none min-h-[60px] max-h-[120px] text-sm"
          />

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1 text-muted-foreground" onClick={handleSkip}>
              Skip
            </Button>
            <Button
              className="flex-1 gap-1"
              onClick={() => {
                if (isLast) {
                  handleSave();
                } else {
                  setStep(step + 1);
                }
              }}
            >
              {isLast ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Done
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DailyReset;
