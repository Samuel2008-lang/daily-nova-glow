import { useState, useRef, useEffect } from "react";
import { Plus, X, FileText, CheckSquare, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { storage } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type EntryType = "note" | "task" | "journal";

const TYPE_CONFIG: Record<EntryType, { icon: typeof FileText; label: string; color: string }> = {
  note: { icon: FileText, label: "Note", color: "text-primary" },
  task: { icon: CheckSquare, label: "Task", color: "text-secondary" },
  journal: { icon: BookMarked, label: "Journal", color: "text-accent" },
};

function detectType(text: string): EntryType {
  const lower = text.toLowerCase().trim();
  
  // Task patterns: action verbs, deadlines, todo-like
  const taskPatterns = [
    /^(buy|get|call|email|send|fix|do|finish|complete|submit|schedule|remind|pick up|set up|make|clean|pay|book|cancel|return|check)/,
    /\b(by|before|deadline|due|tomorrow|today|tonight|asap|urgent)\b/,
    /\b(need to|have to|must|should|gotta|gonna|will)\b/,
    /^[-•]\s/,
  ];
  
  // Journal patterns: reflective, emotional, longer
  const journalPatterns = [
    /\b(feel|felt|feeling|grateful|thankful|reflect|thought|realized|learned|wonder|hope|wish|dream)\b/,
    /\b(today was|i think|i feel|i realized|i learned|looking back|in retrospect)\b/,
    /[.!?].*[.!?]/, // Multiple sentences
  ];
  
  const taskScore = taskPatterns.filter(p => p.test(lower)).length;
  const journalScore = journalPatterns.filter(p => p.test(lower)).length;
  
  if (taskScore > journalScore) return "task";
  if (journalScore > 0 && text.length > 60) return "journal";
  return "note";
}

const QuickCapture = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [selectedType, setSelectedType] = useState<EntryType>("note");
  const [autoDetected, setAutoDetected] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (autoDetected && text.trim()) {
      setSelectedType(detectType(text));
    }
  }, [text, autoDetected]);

  const handleTypeSelect = (type: EntryType) => {
    setSelectedType(type);
    setAutoDetected(false);
  };

  const handleSave = () => {
    if (!text.trim()) return;

    const now = new Date().toISOString();

    switch (selectedType) {
      case "note": {
        const notes = storage.getNotes();
        const firstLine = text.split("\n")[0].slice(0, 50);
        notes.push({
          id: Date.now().toString(),
          topic: firstLine,
          content: text,
          createdAt: now,
          updatedAt: now,
        });
        storage.saveNotes(notes);
        break;
      }
      case "task": {
        const tasks = storage.getTasks();
        tasks.push({
          id: Date.now().toString(),
          title: text.trim(),
          completed: false,
          createdAt: now,
        });
        storage.saveTasks(tasks);
        break;
      }
      case "journal": {
        const entries = storage.getJournalEntries();
        entries.push({
          id: Date.now().toString(),
          content: text,
          createdAt: now,
          updatedAt: now,
        });
        storage.saveJournalEntries(entries);
        break;
      }
    }

    const config = TYPE_CONFIG[selectedType];
    toast({
      title: `${config.label} saved!`,
      description: `Your ${config.label.toLowerCase()} has been captured.`,
    });

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
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Quick Capture</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Text input */}
          <Textarea
            ref={textareaRef}
            placeholder="Type anything... I'll figure out what it is"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="bg-background/50 border-border/30 resize-none min-h-[80px] max-h-[200px] text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
            }}
          />

          {/* Type selector */}
          <div className="flex items-center gap-2">
            {(Object.entries(TYPE_CONFIG) as [EntryType, typeof TYPE_CONFIG.note][]).map(([type, config]) => {
              const Icon = config.icon;
              const isActive = selectedType === type;
              return (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? `bg-muted ${config.color} ring-1 ring-current`
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {config.label}
                </button>
              );
            })}
            {autoDetected && text.trim() && (
              <span className="text-[10px] text-muted-foreground ml-auto">auto-detected</span>
            )}
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={!text.trim()}
            className="w-full"
          >
            Save as {TYPE_CONFIG[selectedType].label}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuickCapture;
