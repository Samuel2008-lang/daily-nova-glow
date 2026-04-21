import { useState, useRef, useEffect } from "react";
import { Plus, X, FileText, CheckSquare, BookMarked, BookOpen, Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { storage } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useOfflineAI } from "@/hooks/use-offline-ai";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { recordCorrection, suggestFromLearning, type EntryType } from "@/lib/ai-learning";

const TYPE_CONFIG: Record<EntryType, { icon: typeof FileText; label: string; color: string }> = {
  note: { icon: FileText, label: "Note", color: "text-primary" },
  task: { icon: CheckSquare, label: "Task", color: "text-secondary" },
  diary: { icon: BookOpen, label: "Diary", color: "text-orange-400" },
  journal: { icon: BookMarked, label: "Journal", color: "text-accent" },
};

function detectTypeRegex(text: string): EntryType {
  const lower = text.toLowerCase().trim();
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
  const taskScore = taskPatterns.filter((p) => p.test(lower)).length;
  const diaryScore = diaryPatterns.filter((p) => p.test(lower)).length;
  const journalScore = journalPatterns.filter((p) => p.test(lower)).length;
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
  const [aiDetecting, setAiDetecting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const { toast } = useToast();
  const { processText, hasBuiltInAI, isNative } = useOfflineAI();

  const handleSpeechResult = (transcript: string) => {
    setText((prev) => (prev ? `${prev} ${transcript}` : transcript).trim());
    setAutoDetected(true);
  };
  const speech = useSpeechRecognition({ onResult: handleSpeechResult });

  useEffect(() => {
    if (isOpen && textareaRef.current) textareaRef.current.focus();
  }, [isOpen]);

  // Smart detection: learned weights → regex → optional AI refinement.
  useEffect(() => {
    if (!autoDetected || !text.trim()) return;

    // 1. Regex baseline
    let pick: EntryType = detectTypeRegex(text);

    // 2. Learned bias from past corrections (offline, on-device)
    const learned = suggestFromLearning(text);
    if (learned) pick = learned;

    setSelectedType(pick);
    setPredictedType(pick);

    // 3. Optional offline AI refinement
    if ((hasBuiltInAI || isNative) && text.length > 10) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setAiDetecting(true);
        try {
          const result = await processText(
            `Classify this text as exactly one of: "note", "task", "diary", "journal". Reply with only the single word.\n\nText: "${text}"`,
            { task: "organize" }
          );
          const cleaned = result.toLowerCase().trim();
          if (cleaned === "note" || cleaned === "task" || cleaned === "diary" || cleaned === "journal") {
            // Only override if no strong learned signal
            if (!learned) {
              setSelectedType(cleaned);
              setPredictedType(cleaned);
            }
          }
        } catch {
          // Regex/learned fallback already applied
        } finally {
          setAiDetecting(false);
        }
      }, 800);
    }

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [text, autoDetected, hasBuiltInAI, isNative, processText]);

  const handleTypeSelect = (type: EntryType) => {
    setSelectedType(type);
    setAutoDetected(false);
  };

  const handleSave = () => {
    if (!text.trim()) return;
    // Record correction for offline learning if user changed the prediction
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
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.4)" }}
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

          <div className="flex items-center gap-2">
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
            {autoDetected && text.trim() && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                {aiDetecting ? "AI detecting..." : "auto-detected"}
              </span>
            )}
          </div>

          <Button onClick={handleSave} disabled={!text.trim()} className="w-full">
            Save as {TYPE_CONFIG[selectedType].label}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuickCapture;
