import { useState, useEffect } from "react";
import { Plus, Search, Mic, Calendar, ArrowLeft, ArrowRight, BookOpen, X, Edit2, Share2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { storage, Note } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { format, isFuture, startOfDay, isToday } from "date-fns";
import { BannerAd } from "@/components/BannerAd";

const Notes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'closed' | 'write' | 'read'>('closed');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { toast } = useToast();

  const { isListening, isSupported, startListening } = useSpeechRecognition({
    onResult: (transcript) => {
      setNewNote((prev) => (prev ? prev + " " + transcript : transcript));
    },
  });

  useEffect(() => {
    setNotes(storage.getNotes());
  }, []);

  const dateKey = format(selectedDate, "yyyy-MM-dd");
  const notesForDate = notes.filter(note => {
    const noteDate = format(new Date(note.createdAt), "yyyy-MM-dd");
    return noteDate === dateKey;
  });
  const currentNote = notesForDate[0]?.content || "";

  const addOrUpdateNote = () => {
    if (!newNote.trim()) return;

    const existingNote = notesForDate[0];
    
    if (existingNote) {
      const updatedNotes = notes.map((note) =>
        note.id === existingNote.id ? { ...note, content: newNote, updatedAt: new Date().toISOString() } : note
      );
      setNotes(updatedNotes);
      storage.saveNotes(updatedNotes);
    } else {
      const note: Note = {
        id: Date.now().toString(),
        content: newNote,
        createdAt: startOfDay(selectedDate).toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updatedNotes = [note, ...notes];
      setNotes(updatedNotes);
      storage.saveNotes(updatedNotes);
    }

    toast({
      title: "Note saved",
      description: `Note for ${format(selectedDate, "MMMM d, yyyy")} has been saved.`,
    });
    setViewMode('closed');
    setNewNote("");
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    if (isFuture(startOfDay(date)) && !isToday(date)) {
      toast({
        title: "Cannot access future dates",
        description: "You can only view notes from today or past dates.",
        variant: "destructive",
      });
      return;
    }
    setSelectedDate(date);
    setCalendarOpen(false);
    const noteDate = format(date, "yyyy-MM-dd");
    const noteForDate = notes.find(n => format(new Date(n.createdAt), "yyyy-MM-dd") === noteDate);
    if (noteForDate) {
      setNewNote(noteForDate.content);
      setViewMode('read');
    } else {
      setNewNote("");
      setViewMode('write');
    }
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    
    if (isFuture(startOfDay(newDate)) && !isToday(newDate)) {
      toast({
        title: "Cannot access future dates",
        description: "You can only view notes from today or past dates.",
        variant: "destructive",
      });
      return;
    }
    
    handleDateSelect(newDate);
  };

  const openToday = () => {
    const today = new Date();
    setSelectedDate(today);
    const noteDate = format(today, "yyyy-MM-dd");
    const noteForDate = notes.find(n => format(new Date(n.createdAt), "yyyy-MM-dd") === noteDate);
    if (noteForDate) {
      setNewNote(noteForDate.content);
    } else {
      setNewNote("");
    }
    setViewMode('write');
  };

  const shareNote = async () => {
    const shareText = `Note - ${format(selectedDate, "MMMM d, yyyy")}\n\n${newNote}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Note - ${format(selectedDate, "MMMM d, yyyy")}`,
          text: shareText,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard(shareText);
        }
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied!", description: "Note copied to clipboard." });
    } catch {
      toast({ title: "Error", description: "Could not copy to clipboard.", variant: "destructive" });
    }
  };

  const saveToFile = () => {
    const content = `Note - ${format(selectedDate, "MMMM d, yyyy")}\n\n${newNote}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `note-${format(selectedDate, "yyyy-MM-dd")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: "Note saved to your device." });
  };

  // Read mode view
  if (viewMode === 'read') {
    return (
      <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-primary">
              Note - {format(selectedDate, "MMMM d, yyyy")}
            </h1>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={shareNote}>
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={saveToFile}>
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={() => setViewMode('write')}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button variant="ghost" onClick={() => setViewMode('closed')}>
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>
          </div>

          <Card className="glass glow p-8 min-h-[400px]">
            <div className="prose prose-invert max-w-none">
              <p className="text-foreground whitespace-pre-wrap text-lg leading-relaxed">
                {newNote || "No note for this date."}
              </p>
            </div>
          </Card>
        </div>
        <BannerAd position="bottom" />
      </div>
    );
  }

  // Write mode view
  if (viewMode === 'write') {
    return (
      <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigateDay('prev')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold text-primary">
                {format(selectedDate, "MMMM d, yyyy")}
              </h1>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigateDay('next')}
                disabled={isToday(selectedDate)}
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <Card className="glass glow p-6">
            <div className="relative">
              <Textarea
                placeholder="Write your note here..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="mb-4 min-h-[300px] bg-background/50 border-border/50 focus:border-primary pr-14 text-lg"
              />
              {isSupported && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => startListening(true, "note")}
                  disabled={isListening}
                  className={`absolute top-3 right-3 ${
                    isListening ? "animate-pulse-glow text-primary" : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  <Mic className="w-5 h-5" />
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={addOrUpdateNote} className="flex-1 glow">
                Save & Close
              </Button>
              <Button variant="outline" onClick={() => setViewMode('closed')}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
        <BannerAd position="bottom" />
      </div>
    );
  }

  // Closed mode - show date access only
  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <h1 className="text-4xl font-bold mb-8 text-primary">Notes</h1>

        {/* Quick Access */}
        <Card className="glass glow p-6">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex flex-wrap gap-3">
            <Button onClick={openToday} className="glow">
              <Plus className="w-4 h-4 mr-2" />
              Open Today
            </Button>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Select Date
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => isFuture(startOfDay(date)) && !isToday(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>
      </div>
      <BannerAd position="bottom" />
    </div>
  );
};

export default Notes;
