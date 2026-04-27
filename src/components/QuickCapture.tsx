import { useState, useRef, useEffect } from "react";
import { Plus, X, FileText, CheckSquare, BookMarked, BookOpen, Target, Mic, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { storage } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { recordCorrection, suggestFromLearning, type EntryType } from "@/lib/ai-learning";
import { haptics } from "@/lib/haptics";

const TYPE_CONFIG: Record<EntryType, { icon: typeof FileText; label: string; color: string }> = {
  note: { icon: FileText, label: "Note", color: "text-primary" },
  task: { icon: CheckSquare, label: "Task", color: "text-secondary" },
  habit: { icon: Target, label: "Habit", color: "text-accent" },
  diary: { icon: BookOpen, label: "Diary", color: "text-orange-400" },
  journal: { icon: BookMarked, label: "Journal", color: "text-accent" },
};

function detectTypeRegex(text: string): EntryType {
  const lower = text.toLowerCase().trim();
  const explicitPatterns: Array<[EntryType, RegExp]> = [
    ["note", /\b(save|add|write|capture)\s+(this\s+)?(as\s+)?(a\s+)?note\b/],
    ["task", /\b(save|add|write|capture|set)\s+(this\s+)?(as\s+)?(a\s+)?task\b/],
    ["habit", /\b(save|add|write|capture|set)\s+(this\s+)?(as\s+)?(a\s+)?habit\b/],
    ["diary", /\b(save|add|write|capture)\s+(this\s+)?(as\s+)?(a\s+)?diary\b/],
    ["journal", /\b(save|add|write|capture)\s+(this\s+)?(as\s+)?(a\s+)?journal\b/],
  ];
  const explicit = explicitPatterns.find(([, pattern]) => pattern.test(lower));
  if (explicit) return explicit[0];
  const habitPatterns = [
    /\b(every day|daily|each day|each morning|each night|every morning|every night|habit|routine)\b/,
    /\b(meditate|exercise|workout|read|drink water|stretch|practice|journal daily)\b/,
  ];
  const taskPatterns = [
    /^(buy|get|call|email|send|fix|do|finish|complete|submit|schedule|remind|pick up|set up|make|clean|pay|book|cancel|return|check)/,
    /\b(by|before|deadline|due|tomorrow|today|tonight|asap|urgent)\b/,
    /\b(need to|have to|must|should|gotta|gonna|will)\b/,
    /^[-•]\s/,
  ];
  const diaryPatterns = [
    /\b(dear diary|today i|this morning|this evening|woke up|went to|came home|had lunch|had dinner)\b/,
    /\b(my day|what happened|i did|i went|i met|i saw|i ate)\b/,
  ];
  const journalPatterns = [
    /\b(feel|felt|feeling|grateful|thankful|reflect|thought|realized|learned|wonder|hope|wish|dream)\b/,
    /\b(today was|i think|i feel|i realized|i learned|looking back|in retrospect)\b/,
    /[.!?].*[.!?]/,
  ];
  const habitScore = habitPatterns.filter((p) => p.test(lower)).length;
  const taskScore = taskPatterns.filter((p) => p.test(lower)).length;
  const diaryScore = diaryPatterns.filter((p) => p.test(lower)).length;
  const journalScore = journalPatterns.filter((p) => p.test(lower)).length;
  if (habitScore > taskScore && habitScore > 0) return "habit";
  if (taskScore > journalScore && taskScore > diaryScore) return "task";
  if (diaryScore > 0 && text.length > 40) return "diary";
  if (journalScore > 0 && text.length > 60) return "journal";
  return "note";
}

const QuickCapture = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [selectedType, setSelectedType] = useState<EntryType>("note");
  const [predictedType, setPredictedType] = useState<EntryType>("note");
  const [autoDetected, setAutoDetected] = useState(true);
  const [feedbackGiven, setFeedbackGiven] = useState<"up" | "down" | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const handleSpeechResult = (transcript: string) => {
    setText((prev) => (prev ? `${prev} ${transcript}` : transcript).trim());
    setAutoDetected(true);
  };
  const speech = useSpeechRecognition({ onResult: handleSpeechResult });

  useEffect(() => {
    if (isOpen && textareaRef.current) textareaRef.current.focus();
  }, [isOpen]);

  // Reset feedback whenever the prediction changes
  useEffect(() => { setFeedbackGiven(null); }, [predictedType, text]);

  // Smart detection: 100% offline (regex + learned weights). No cloud calls — keeps it free, fast and rate-limit-proof.
  useEffect(() => {
    if (!autoDetected || !text.trim()) return;
    let pick: EntryType = detectTypeRegex(text);
    const learned = suggestFromLearning(text);
    if (learned) pick = learned;
    setSelectedType(pick);
    setPredictedType(pick);
  }, [text, autoDetected]);

  const handleTypeSelect = (type: EntryType) => {
    haptics.light();
    // Manual selection that differs from prediction is itself a learning signal
    if (type !== predictedType && text.trim()) {
      recordCorrection(text, predictedType, type);
      setPredictedType(type);
    }
    setSelectedType(type);
    setAutoDetected(false);
  };

  const giveFeedback = (kind: "up" | "down") => {
    haptics.light();
    setFeedbackGiven(kind);
    toast({
      title: kind === "up" ? "Thanks! 👍" : "Got it 👎",
      description:
        kind === "up"
          ? "The AI will keep doing this."
          : "The AI will adjust. Pick the right type below to teach it faster.",
    });
  };

  const handleSave = () => {
    if (!text.trim()) return;
    // Fire haptic immediately so the user feels the action even if storage is slow
    haptics.success();
    if (predictedType && predictedType !== selectedType) {
      recordCorrection(text, predictedType, selectedType);
    }
    const now = new Date().toISOString();

    switch (selectedType) {
      case "note": {
        const notes = storage.getNotes();
        notes.push({ id: Date.now().toString(), topic: text.split("\n")[0].slice(0, 50), content: text, createdAt: now, updatedAt: now });
        storage.saveNotes(notes);
        break;
      }
      case "task": {
        const tasks = storage.getTasks();
        tasks.push({ id: Date.now().toString(), title: text.trim(), completed: false, createdAt: now });
        storage.saveTasks(tasks);
        break;
      }
      case "habit": {
        const habits = storage.getHabits();
        habits.push({
          id: Date.now().toString(),
          name: text.trim().slice(0, 80),
          completedDates: [],
          streak: 0,
          createdAt: now,
        });
        storage.saveHabits(habits);
        break;
      }
      case "diary": {
        const diaryEntries = storage.getDiaryEntries();
        diaryEntries.push({ id: Date.now().toString(), content: text, date: now, createdAt: now, updatedAt: now });
        storage.saveDiaryEntries(diaryEntries);
        break;
      }
      case "journal": {
        const entries = storage.getJournalEntries();
        entries.push({ id: Date.now().toString(), content: text, createdAt: now, updatedAt: now });
        storage.saveJournalEntries(entries);
        break;
      }
    }

    toast({ title: `${TYPE_CONFIG[selectedType].label} saved!`, description: `Your ${TYPE_CONFIG[selectedType].label.toLowerCase()} has been captured.` });
    setText("");
    setAutoDetected(true);
    setSelectedType("note");
    setFeedbackGiven(null);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => { haptics.light(); setIsOpen(true); }}
        className="fixed right-4 md:right-8 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        style={{
          boxShadow: "0 0 20px hsl(var(--primary) / 0.4)",
          // Sit just above the bottom nav with safe-area awareness; lower on desktop
          bottom: "calc(5rem + env(safe-area-inset-bottom))",
        }}
        aria-label="Quick capture"
      >
        <Plus className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      <div className="relative w-full max-w-md mx-4 mb-4 md:mb-0 animate-fade-in">
        <div className="glass border border-border/50 rounded-2xl p-4 space-y-3" style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.15)" }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Quick Capture</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder={speech.isListening ? "Listening..." : "Type or tap mic to speak..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="bg-background/50 border-border/30 resize-none min-h-[80px] max-h-[200px] text-sm pr-12"
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave(); }}
            />
            {speech.isSupported && (
              <Button
                type="button"
                size="icon"
                variant={speech.isListening ? "default" : "ghost"}
                className={`absolute bottom-2 right-2 h-8 w-8 rounded-full ${speech.isListening ? "bg-primary text-primary-foreground animate-pulse" : ""}`}
                onClick={() => (speech.isListening ? speech.stopListening() : speech.startListening(true, "general"))}
                disabled={speech.isProcessing}
                aria-label={speech.isListening ? "Stop recording" : "Start voice input"}
              >
                {speech.isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(Object.entries(TYPE_CONFIG) as [EntryType, typeof TYPE_CONFIG.note][]).map(([type, config]) => {
              const Icon = config.icon;
              const isActive = selectedType === type;
              return (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive ? `bg-muted ${config.color} ring-1 ring-current` : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {config.label}
                </button>
              );
            })}
          </div>

          {/* AI feedback row — separate from app-level feedback; teaches the auto-detector */}
          {autoDetected && text.trim() && (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/20 pt-2">
              <span>{`Auto-detected: ${TYPE_CONFIG[predictedType].label}`}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => giveFeedback("up")}
                  disabled={!!feedbackGiven}
                  className={`h-7 w-7 rounded-full flex items-center justify-center transition-colors ${
                    feedbackGiven === "up" ? "bg-success/20 text-success" : "hover:bg-muted text-muted-foreground"
                  }`}
                  aria-label="Auto-detection was correct"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => giveFeedback("down")}
                  disabled={!!feedbackGiven}
                  className={`h-7 w-7 rounded-full flex items-center justify-center transition-colors ${
                    feedbackGiven === "down" ? "bg-destructive/20 text-destructive" : "hover:bg-muted text-muted-foreground"
                  }`}
                  aria-label="Auto-detection was wrong"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <Button onClick={handleSave} disabled={!text.trim()} className="w-full">
            Save as {TYPE_CONFIG[selectedType].label}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuickCapture;
