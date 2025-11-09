import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Mic, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { storage, DiaryEntry } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { supabase } from "@/integrations/supabase/client";

const Diary = () => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentEntry, setCurrentEntry] = useState("");
  const [aiMessages, setAiMessages] = useState<{role: string, content: string}[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const { toast } = useToast();

  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
    onResult: (transcript) => {
      setCurrentEntry((prev) => (prev ? prev + " " + transcript : transcript));
    },
  });

  useEffect(() => {
    setEntries(storage.getDiaryEntries());
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

    let updatedEntries: DiaryEntry[];

    if (existingEntry) {
      updatedEntries = entries.map((e) =>
        e.id === existingEntry.id
          ? { ...e, content: currentEntry, updatedAt: new Date().toISOString() }
          : e
      );
    } else {
      const newEntry: DiaryEntry = {
        id: Date.now().toString(),
        date: currentDate.toISOString(),
        content: currentEntry,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedEntries = [...entries, newEntry];
    }

    setEntries(updatedEntries);
    storage.saveDiaryEntries(updatedEntries);

    toast({
      title: "Entry saved",
      description: "Your diary entry has been saved.",
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

  const handleVoiceClick = async () => {
    if (isListening && recognitionInstance) {
      stopListening(recognitionInstance);
      setRecognitionInstance(null);
    } else {
      const instance = await startListening(true, "diary");
      setRecognitionInstance(instance);
    }
  };

  const sendAiMessage = async () => {
    if (!aiInput.trim()) return;

    const userMessage = { role: "user", content: aiInput };
    const updatedMessages = [...aiMessages, userMessage];
    setAiMessages(updatedMessages);
    setAiInput("");
    setIsAiLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('enhance-text', {
        body: { 
          text: `Context: The user is writing in their daily diary for ${currentDate.toLocaleDateString()}. Today's entry: ${currentEntry || "No entry yet"}. User asks: ${aiInput}`,
          context: "diary advice"
        }
      });

      if (error) throw error;

      const aiResponse = { role: "assistant", content: data?.enhanced || "I'm here to help with your diary." };
      setAiMessages([...updatedMessages, aiResponse]);
    } catch (error) {
      console.error("AI error:", error);
      toast({
        title: "AI Error",
        description: "Could not get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const isToday = currentDate.toDateString() === new Date().toDateString();

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <h1 className="text-4xl font-bold mb-8 text-success">Daily Diary</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">;
        {/* Date Navigation */}

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

          <div className="relative">
            <Textarea
              placeholder="What's on your mind today? Write your thoughts, experiences, or reflections..."
              value={currentEntry}
              onChange={(e) => setCurrentEntry(e.target.value)}
              className="min-h-[300px] bg-background/50 border-border/50 focus:border-success resize-none pr-14"
            />
            {isSupported && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleVoiceClick}
                className={`absolute top-3 right-3 ${
                  isListening ? "animate-pulse-glow text-success" : "text-muted-foreground hover:text-success"
                }`}
              >
                <Mic className="w-5 h-5" />
              </Button>
            )}
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                {currentEntry.length} characters
              </span>
              {isListening && (
                <div className="flex items-center gap-2 px-3 py-1 bg-success/20 rounded-lg animate-pulse-glow">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                  <span className="text-xs text-success font-medium">Recording... Tap mic to stop</span>
                </div>
              )}
            </div>
            <Button onClick={saveEntry} disabled={!currentEntry.trim()} className="glow">
              Save Entry
            </Button>
          </div>
        </Card>

          {/* Entry Stats */}
          <Card className="glass p-6">
            <h3 className="text-lg font-semibold mb-4 text-success">Diary Stats</h3>
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

          {/* AI Chat Assistant */}
          <Card className="glass glow p-6 flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-success flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI Assistant
            </h2>

            <div className="flex-1 space-y-3 mb-4 overflow-y-auto max-h-[400px]">
              {aiMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Ask me for prompts, reflections, or advice about your diary entry...
                </p>
              ) : (
                aiMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg text-sm ${
                      msg.role === "user"
                        ? "bg-success/20 ml-8"
                        : "bg-background/50 mr-8"
                    }`}
                  >
                    {msg.content}
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <Textarea
                placeholder="Ask for diary prompts or advice..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendAiMessage();
                  }
                }}
                className="min-h-[60px] bg-background/50"
              />
              <Button
                onClick={sendAiMessage}
                disabled={!aiInput.trim() || isAiLoading}
                size="icon"
                className="shrink-0 glow"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Diary;
