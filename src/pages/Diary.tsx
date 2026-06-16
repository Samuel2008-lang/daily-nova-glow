import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { storage, DiaryEntry } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { DiaryNotificationBell } from "@/components/DiaryNotificationBell";
import { haptics } from "@/lib/haptics";

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

const Diary = () => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentEntry, setCurrentEntry] = useState("");
  const [viewMode, setViewMode] = useState<"closed" | "write" | "read">("closed");
  const { toast } = useToast();

  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
    onResult: (transcript) => setCurrentEntry((prev) => (prev ? `${prev} ${transcript}` : transcript)),
  });

  useEffect(() => setEntries(storage.getDiaryEntries()), []);

  useEffect(() => {
    const entry = entries.find((e) => sameDay(new Date(e.date), currentDate));
    setCurrentEntry(entry?.content || "");
  }, [currentDate, entries]);

  const saveEntry = () => {
    if (!currentEntry.trim()) return;
    haptics.success();
    const existing = entries.find((e) => sameDay(new Date(e.date), currentDate));
    const now = new Date().toISOString();
    const updated = existing
      ? entries.map((e) => e.id === existing.id ? { ...e, content: currentEntry, updatedAt: now } : e)
      : [...entries, { id: Date.now().toString(), date: currentDate.toISOString(), content: currentEntry, createdAt: now, updatedAt: now }];
    setEntries(updated);
    storage.saveDiaryEntries(updated);
    toast({ title: "Entry saved", description: "Your diary entry has been saved." });
  };

  const moveDay = (days: number) => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
  const isToday = sameDay(currentDate, new Date());
  const handleVoiceClick = () => (isListening ? stopListening() : startListening(true, "diary"));

  if (viewMode === "read") {
    const entry = entries.find((e) => sameDay(new Date(e.date), currentDate));
    return (
      <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <Card className="glass glow p-6">
            <div className="flex items-center justify-between mb-6 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <CalendarIcon className="w-5 h-5 text-success shrink-0" />
                <h2 className="text-2xl font-bold text-success truncate">{currentDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</h2>
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
            <Button variant="ghost" size="icon" onClick={() => moveDay(-1)} className="hover:text-success"><ChevronLeft className="w-5 h-5" /></Button>
            <h1 className="text-base font-semibold text-success">{currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</h1>
            <Button variant="ghost" size="icon" onClick={() => moveDay(1)} disabled={isToday} className="hover:text-success"><ChevronRight className="w-5 h-5" /></Button>
          </div>
          {isSupported && (
            <Button size="icon" variant="ghost" onClick={handleVoiceClick} className={isListening ? "animate-pulse-glow text-success" : "text-muted-foreground hover:text-success"} aria-label="Voice input">
              <Mic className="w-5 h-5" />
            </Button>
          )}
        </div>
        <div className="flex-1 flex flex-col px-4 pt-4 pb-2 overflow-hidden">
          <Textarea placeholder="What's on your mind today?" value={currentEntry} onChange={(e) => setCurrentEntry(e.target.value)} className="flex-1 resize-none bg-transparent border-0 px-0 text-base leading-relaxed" />
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 shrink-0">
            <span>{currentEntry.length} characters</span>
            {isListening && <span className="text-success font-medium">Recording… tap mic to stop</span>}
          </div>
        </div>
        <div className="flex gap-2 px-4 pt-3 pb-6 border-t border-border/30 bg-background/95 backdrop-blur-sm shrink-0" style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
          <Button variant="outline" onClick={() => setViewMode("closed")} className="flex-1">Cancel</Button>
          <Button onClick={() => { saveEntry(); setViewMode("closed"); }} disabled={!currentEntry.trim()} className="flex-1 glow">Save Entry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-success">Daily Diary</h1>
          <DiaryNotificationBell />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="glass p-6">
            <h3 className="text-lg font-semibold mb-4 text-success">Diary Stats</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div><p className="text-3xl font-bold text-success">{entries.length}</p><p className="text-sm text-muted-foreground">Total Entries</p></div>
              <div><p className="text-3xl font-bold text-success">{entries.reduce((acc, e) => acc + e.content.split(/\s+/).filter(Boolean).length, 0)}</p><p className="text-sm text-muted-foreground">Words Written</p></div>
            </div>
          </Card>
          <Card className="glass p-6">
            <h3 className="text-lg font-semibold text-success mb-4">Quick Access</h3>
            <div className="flex flex-col gap-3">
              <Popover>
                <PopoverTrigger asChild><Button variant="outline" className="w-full"><CalendarIcon className="w-4 h-4 mr-2" />Select date</Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={currentDate} onSelect={(d) => { if (!d || d > new Date()) return; setCurrentDate(d); setViewMode("read"); }} disabled={(date) => date > new Date()} modifiers={{ hasEntry: entries.map((e) => new Date(e.date)) }} modifiersClassNames={{ hasEntry: "bg-success/30 text-success font-bold" }} className="p-3 pointer-events-auto" initialFocus />
                </PopoverContent>
              </Popover>
              <Button variant="secondary" className="w-full" onClick={() => { setCurrentDate(new Date()); setViewMode("write"); }}>Open today</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Diary;