import { useState, useEffect, useMemo } from "react";
import { Plus, Mic, Calendar, ArrowLeft, ArrowRight, BookOpen, X, Edit2, Share2, Download, Search } from "lucide-react";
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
import NoteItem from "@/components/NoteItem";
import { BannerAd } from "@/components/BannerAd";
import { haptics } from "@/lib/haptics";

const Notes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteTopic, setNoteTopic] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'closed' | 'write' | 'read'>('closed');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [emptyDatePromptOpen, setEmptyDatePromptOpen] = useState(false);
  const { toast } = useToast();

  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
    onResult: (transcript) => {
      setNoteContent((prev) => (prev ? prev + " " + transcript : transcript));
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

  // Get dates that have notes for calendar highlighting
  const datesWithNotes = new Set(
    notes.map(note => format(new Date(note.createdAt), "yyyy-MM-dd"))
  );

  const saveNote = () => {
    if (!noteContent.trim()) return;
    haptics.success();

    const topic = noteTopic.trim() || `Note - ${format(selectedDate, "MMM d, yyyy")}`;
    
    if (selectedNote) {
      // Update existing note
      const updatedNotes = notes.map((note) =>
        note.id === selectedNote.id 
          ? { ...note, topic, content: noteContent, updatedAt: new Date().toISOString() } 
          : note
      );
      setNotes(updatedNotes);
      storage.saveNotes(updatedNotes);
    } else {
      // Create new note
      // If writing for "today", stamp with the real current time so the timeline
      // buckets it into the correct phase (Morning/Afternoon/Evening).
      // For past dates, anchor at noon so it falls into "Afternoon" of that day
      // rather than midnight (which would otherwise read as Morning).
      const createdAt = isToday(selectedDate)
        ? new Date().toISOString()
        : (() => { const d = new Date(selectedDate); d.setHours(12, 0, 0, 0); return d.toISOString(); })();
      const note: Note = {
        id: Date.now().toString(),
        topic,
        content: noteContent,
        createdAt,
        updatedAt: new Date().toISOString(),
      };
      const updatedNotes = [note, ...notes];
      setNotes(updatedNotes);
      storage.saveNotes(updatedNotes);
    }

    toast({
      title: "Note saved",
      description: `"${topic}" has been saved.`,
    });
    setViewMode('closed');
    setNoteTopic("");
    setNoteContent("");
    setSelectedNote(null);
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

    const dKey = format(date, "yyyy-MM-dd");
    const dateNotes = notes.filter(n => format(new Date(n.createdAt), "yyyy-MM-dd") === dKey);

    if (dateNotes.length === 1) {
      viewNote(dateNotes[0]);
    } else if (dateNotes.length === 0) {
      // Mirror Diary behaviour — offer to write or close
      if (isToday(date)) {
        setNoteTopic("");
        setNoteContent("");
        setSelectedNote(null);
        setViewMode('write');
      } else {
        setEmptyDatePromptOpen(true);
      }
    }
    // If multiple notes, just show the list filtered by date
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
    
    setSelectedDate(newDate);
  };

  const openToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setNoteTopic("");
    setNoteContent("");
    setSelectedNote(null);
    setViewMode('write');
  };

  const viewNote = (note: Note) => {
    setSelectedNote(note);
    setNoteTopic(note.topic);
    setNoteContent(note.content);
    setViewMode('read');
  };

  const editNote = () => {
    setViewMode('write');
  };

  const deleteNote = (noteId: string) => {
    const updatedNotes = notes.filter(n => n.id !== noteId);
    setNotes(updatedNotes);
    storage.saveNotes(updatedNotes);
    haptics.warning();
    toast({ title: "Note deleted", description: "Your note has been removed." });
    if (selectedNote?.id === noteId) {
      setViewMode('closed');
      setSelectedNote(null);
    }
  };

  const shareNote = async () => {
    const shareText = `${noteTopic}\n\n${noteContent}\n\n— Note from DailyNova`;
    
    try {
      const isNativePlatform = typeof (window as any).Capacitor !== "undefined" && (window as any).Capacitor.isNativePlatform();
      
      if (isNativePlatform) {
        const { Share } = await import("@capacitor/share");
        await Share.share({ title: noteTopic, text: shareText });
      } else if (navigator.share) {
        await navigator.share({ title: noteTopic, text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast({ title: "Copied!", description: "Note copied to clipboard for sharing." });
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast({ title: "Share failed", description: "Could not share note.", variant: "destructive" });
      }
    }
  };

  const saveToFile = () => {
    const content = `${noteTopic}\n\nDate: ${format(selectedDate, "MMMM d, yyyy")}\n\n${noteContent}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${noteTopic.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${format(selectedDate, "yyyy-MM-dd")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: "Note saved to your device." });
  };

  // Read mode view
  if (viewMode === 'read' && selectedNote) {
    return (
      <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-primary truncate flex-1 mr-4">
              {noteTopic}
            </h1>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="icon" onClick={shareNote}>
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={saveToFile}>
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={editNote}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button variant="ghost" onClick={() => { setViewMode('closed'); setSelectedNote(null); }}>
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>
          </div>

          <Card className="glass glow p-8 min-h-[400px]">
            <p className="text-xs text-muted-foreground mb-4">
              {format(new Date(selectedNote.createdAt), "MMMM d, yyyy")}
            </p>
            <div className="prose prose-invert max-w-none">
              <p className="text-foreground whitespace-pre-wrap text-lg leading-relaxed">
                {noteContent || "No content."}
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Write mode view — full-screen immersive editor with bottom-anchored actions
  if (viewMode === 'write') {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-background animate-fade-in">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigateDay('prev')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-base font-semibold text-primary">
              {format(selectedDate, "MMM d, yyyy")}
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
          {isSupported && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => (isListening ? stopListening() : startListening(true, "note"))}
              className={isListening ? "animate-pulse-glow text-primary" : "text-muted-foreground hover:text-primary"}
              aria-label="Voice input"
            >
              <Mic className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Editor — fills available space */}
        <div className="flex-1 flex flex-col px-4 pt-4 pb-2 overflow-hidden">
          <Input
            placeholder="Note topic..."
            value={noteTopic}
            onChange={(e) => setNoteTopic(e.target.value)}
            className="mb-3 bg-transparent border-0 border-b border-border/30 rounded-none px-0 text-xl font-semibold focus-visible:ring-0 focus-visible:border-primary"
          />
          <Textarea
            placeholder="Start writing..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            className="flex-1 resize-none bg-transparent border-0 px-0 text-base leading-relaxed focus-visible:ring-0"
          />
          {isListening && (
            <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-primary/10 rounded-lg shrink-0">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-xs text-primary font-medium">Listening… Tap mic to stop</span>
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        <div
          className="flex gap-2 px-4 pt-3 pb-6 border-t border-border/30 bg-background/95 backdrop-blur-sm shrink-0"
          style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        >
          <Button
            variant="outline"
            onClick={() => { setViewMode('closed'); setSelectedNote(null); setNoteTopic(""); setNoteContent(""); }}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button onClick={saveNote} className="flex-1 glow" disabled={!noteContent.trim()}>
            Save Note
          </Button>
        </div>
      </div>
    );
  }

  // Closed mode - show date access and notes list
  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <h1 className="text-4xl font-bold mb-8 text-primary">Notes</h1>

        {/* Quick Access */}
        <Card className="glass glow p-6 mb-6">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex flex-wrap gap-3">
            <Button onClick={openToday} className="glow">
              <Plus className="w-4 h-4 mr-2" />
              New Note
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
                  modifiers={{
                    hasNote: (date) => datesWithNotes.has(format(date, "yyyy-MM-dd"))
                  }}
                  modifiersStyles={{
                    hasNote: { 
                      backgroundColor: 'hsl(var(--primary) / 0.2)',
                      borderRadius: '50%'
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* Search */}
        {notes.length > 0 && (
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search your notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50 border-border/50 focus:border-primary"
            />
          </div>
        )}

        {/* Notes List (with optional search filter) */}
        {(() => {
          const q = searchQuery.trim().toLowerCase();
          const filtered = q
            ? notes.filter(
                (n) =>
                  n.topic.toLowerCase().includes(q) ||
                  n.content.toLowerCase().includes(q)
              )
            : notes;
          if (notes.length === 0) {
            return (
              <Card className="glass p-8 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No notes yet. Create your first note!</p>
              </Card>
            );
          }
          if (filtered.length === 0) {
            return (
              <Card className="glass p-6 text-center">
                <p className="text-sm text-muted-foreground">No notes match "{searchQuery}".</p>
              </Card>
            );
          }
          return (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-muted-foreground mb-4">
                {q ? `Results (${filtered.length})` : `Your Notes (${notes.length})`}
              </h2>
              {filtered.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  onView={() => viewNote(note)}
                  onDelete={() => deleteNote(note.id)}
                />
              ))}
            </div>
          );
        })()}
      </div>

      {/* Empty-date prompt — mirrors Diary behavior */}
      {emptyDatePromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setEmptyDatePromptOpen(false)} />
          <Card className="relative glass glow p-6 max-w-sm w-full text-center">
            <h3 className="text-lg font-semibold text-primary mb-2">No entry yet</h3>
            <p className="text-sm text-muted-foreground mb-5">
              You don't have a note for {format(selectedDate, "MMMM d, yyyy")}.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEmptyDatePromptOpen(false)}>
                Close
              </Button>
              <Button
                className="flex-1 glow"
                onClick={() => {
                  setNoteTopic("");
                  setNoteContent("");
                  setSelectedNote(null);
                  setEmptyDatePromptOpen(false);
                  setViewMode('write');
                }}
              >
                Write
              </Button>
            </div>
          </Card>
        </div>
      )}

      <BannerAd position="bottom" />
    </div>
  );
};

export default Notes;