import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { storage, JournalEntry } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

const Journal = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentEntry, setCurrentEntry] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    setEntries(storage.getJournalEntries());
  }, []);

  useEffect(() => {
    const dateStr = currentDate.toDateString();
    const entry = entries.find((e) => new Date(e.date).toDateString() === dateStr);
    setCurrentEntry(entry?.content || "");
  }, [currentDate, entries]);

  const saveEntry = () => {
    if (!currentEntry.trim()) return;

    const dateStr = currentDate.toDateString();
    const existingEntry = entries.find((e) => new Date(e.date).toDateString() === dateStr);

    let updatedEntries: JournalEntry[];

    if (existingEntry) {
      updatedEntries = entries.map((e) =>
        e.id === existingEntry.id
          ? { ...e, content: currentEntry, updatedAt: new Date().toISOString() }
          : e
      );
    } else {
      const newEntry: JournalEntry = {
        id: Date.now().toString(),
        date: currentDate.toISOString(),
        content: currentEntry,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedEntries = [...entries, newEntry];
    }

    setEntries(updatedEntries);
    storage.saveJournalEntries(updatedEntries);

    toast({
      title: "Entry saved",
      description: "Your journal entry has been saved.",
    });
  };

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = currentDate.toDateString() === new Date().toDateString();

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <h1 className="text-4xl font-bold mb-8 text-success">Daily Journal</h1>

        {/* Date Navigation */}
        <Card className="glass glow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousDay}
              className="hover:text-success"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <div className="text-center">
              <div className="flex items-center gap-2 justify-center mb-1">
                <CalendarIcon className="w-4 h-4 text-success" />
                <h2 className="text-2xl font-bold text-success">
                  {currentDate.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h2>
              </div>
              {!isToday && (
                <Button variant="link" onClick={goToToday} className="text-xs text-success">
                  Go to today
                </Button>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextDay}
              className="hover:text-success"
              disabled={isToday}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <Textarea
            placeholder="What's on your mind today? Write your thoughts, experiences, or reflections..."
            value={currentEntry}
            onChange={(e) => setCurrentEntry(e.target.value)}
            className="min-h-[300px] bg-background/50 border-border/50 focus:border-success resize-none"
          />

          <div className="flex justify-between items-center mt-4">
            <span className="text-xs text-muted-foreground">
              {currentEntry.length} characters
            </span>
            <Button onClick={saveEntry} disabled={!currentEntry.trim()} className="glow">
              Save Entry
            </Button>
          </div>
        </Card>

        {/* Entry Stats */}
        <Card className="glass p-6">
          <h3 className="text-lg font-semibold mb-4 text-success">Journal Stats</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-success">{entries.length}</p>
              <p className="text-sm text-muted-foreground">Total Entries</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-success">
                {entries.reduce((acc, e) => acc + e.content.split(" ").length, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Words Written</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Journal;
