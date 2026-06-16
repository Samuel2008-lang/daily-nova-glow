import { useEffect, useState } from "react";
import { MessageSquare, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { storage, JournalEntry } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { JournalNotificationBell } from "@/components/JournalNotificationBell";
import { haptics } from "@/lib/haptics";

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

const Journal = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentEntry, setCurrentEntry] = useState("");
  const [viewMode, setViewMode] = useState<"closed" | "write" | "read">("closed");
  const { toast } = useToast();

  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
    onResult: (transcript) => setCurrentEntry((prev) => (prev ? `${prev} ${transcript}` : transcript)),
  });

  useEffect(() => setEntries(storage.getJournalEntries()), []);

  useEffect(() => {
    const entry = entries.find((e) => sameDay(new Date(e.createdAt), currentDate));
    setCurrentEntry(entry?.content || "");
  }, [currentDate, entries]);

  const saveEntry = () => {
    if (!currentEntry.trim()) return;
    haptics.success();
    const existing = entries.find((e) => sameDay(new Date(e.createdAt), currentDate));
    const now = new Date().toISOString();
    const updated = existing
      ? entries.map((e) => e.id === existing.id ? { ...e, content: currentEntry, updatedAt: now } : e)
      : [...entries, { id: Date.now().toString(), content: currentEntry, createdAt: currentDate.toISOString(), updatedAt: now }];
    setEntries(updated);
    storage.saveJournalEntries(updated);
    toast({ title: "Entry saved", description: "Your journal entry has been saved." });
  };

  const isToday = sameDay(currentDate, new Date());
  const moveDay = (days: number) => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
  const handleVoiceClick = () => (isListening ? stopListening() : startListening(true, "journal"));

  if (viewMode === "read") {
    const entry = entries.find((e) => sameDay(new Date(e.createdAt), currentDate));
    return (
      <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <Card className="glass glow-purple p-6">
            <div className="flex items-center justify-between mb-6 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquare className="w-5 h-5 text-secondary shrink-0" />
                <h2 className="text-2xl font-bold text-secondary truncate">{currentDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</h2>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button onClick={() => setViewMode("write")} variant="outline">Edit</Button>
                <Button onClick={() => setViewMode("closed")} variant="secondary">Close</Button>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-foreground">{entry?.content || "No entry for this date."}</p>
          </Card>
        </div>
      </div>
    );
  }

  if (viewMode === "write") {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-background animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => moveDay(-1)} className="hover:text-secondary"><span className="sr-only">Previous day</span>‹</Button>
            <h1 className="text-base font-semibold text-secondary">{currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</h1>
            <Button variant="ghost" size="icon" onClick={() => moveDay(1)} disabled={isToday} className="hover:text-secondary"><span className="sr-only">Next day</span>›</Button>
          </div>
          {isSupported && (
            <Button size="icon" variant="ghost" onClick={handleVoiceClick} className={isListening ? "animate-pulse-glow text-secondary" : "text-muted-foreground hover:text-secondary"} aria-label="Voice input">
              <Mic className="w-5 h-5" />
            </Button>
          )}
        </div>
        <div className="flex-1 flex flex-col px-4 pt-4 pb-2 overflow-hidden">
          <Textarea placeholder="What's on your mind? Write freely..." value={currentEntry} onChange={(e) => setCurrentEntry(e.target.value)} className="flex-1 resize-none bg-transparent border-0 px-0 text-base leading-relaxed" />
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 shrink-0">
            <span>{currentEntry.length} characters</span>
            {isListening && <span className="text-secondary font-medium">Recording… tap mic to stop</span>}
          </div>
        </div>
        <div className="flex gap-2 px-4 pt-3 pb-6 border-t border-border/30 bg-background/95 backdrop-blur-sm shrink-0" style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
          <Button variant="outline" onClick={() => setViewMode("closed")} className="flex-1">Cancel</Button>
          <Button onClick={() => { saveEntry(); setViewMode("closed"); }} disabled={!currentEntry.trim()} className="flex-1 glow-purple">Save Entry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-secondary">Journal</h1>
          <JournalNotificationBell />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="glass p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Quick Access</h3>
            <div className="flex flex-col gap-3">
              <Popover>
                <PopoverTrigger asChild><Button variant="outline" className="w-full"><MessageSquare className="w-4 h-4 mr-2" />Select date</Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={currentDate} onSelect={(d) => { if (!d || d > new Date()) return; setCurrentDate(d); setViewMode("read"); }} disabled={(date) => date > new Date()} modifiers={{ hasEntry: entries.map((e) => new Date(e.createdAt)) }} modifiersClassNames={{ hasEntry: "bg-secondary/30 text-secondary font-bold" }} className="p-3 pointer-events-auto" initialFocus />
                </PopoverContent>
              </Popover>
              <Button variant="secondary" className="w-full" onClick={() => { setCurrentDate(new Date()); setViewMode("write"); }}>Open today</Button>
            </div>
          </Card>
          <Card className="glass p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Journal Stats</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div><p className="text-3xl font-bold text-secondary">{entries.length}</p><p className="text-sm text-muted-foreground">Total Entries</p></div>
              <div><p className="text-3xl font-bold text-secondary">{entries.reduce((acc, e) => acc + e.content.split(/\s+/).filter(Boolean).length, 0)}</p><p className="text-sm text-muted-foreground">Words Written</p></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Journal;