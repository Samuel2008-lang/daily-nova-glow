import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Mic, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { storage, DiaryEntry } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { format } from "date-fns";

const Diary = () => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentEntry, setCurrentEntry] = useState("");
  const [aiMessages, setAiMessages] = useState<{role: string, content: string}[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'closed' | 'write' | 'read'>('closed');
  const { toast } = useToast();

  const { isListening, isProcessing, isSupported, startListening, stopListening } = useSpeechRecognition({
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

  // Get dates that have entries for calendar highlighting
  const datesWithEntries = new Set(
    entries.map(entry => format(new Date(entry.date), "yyyy-MM-dd"))
  );

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
    setStreamingContent("");

    // Command: Add/Upload text to today's diary entry
    try {
      const lower = aiInput.toLowerCase();
      const isAddCmd = /(add|upload|save)/.test(lower) && /(diary|entry|today|this)/.test(lower);
      if (isAddCmd || aiInput.length > 400) {
        const quoted = aiInput.match(/"([\s\S]*?)"/g);
        let contentToAdd = quoted
          ? quoted.map(q => q.replace(/^"|"$/g, "")).join("\n\n").trim()
          : aiInput
              .replace(/\b(add|upload|save)\b/gi, "")
              .replace(/\b(to|into|my|the|diary|journal|entry|today|this)\b/gi, "")
              .trim();
        if (!contentToAdd || contentToAdd.length < 20) {
          contentToAdd = aiInput.trim();
        }

        const dateStr = currentDate.toDateString();
        const existingEntry = entries.find((e) => new Date(e.date).toDateString() === dateStr);
        let updatedEntries: DiaryEntry[];

        if (existingEntry) {
          updatedEntries = entries.map((e) =>
            e.id === existingEntry.id
              ? { ...e, content: (e.content ? e.content + "\n\n" : "") + contentToAdd, updatedAt: new Date().toISOString() }
              : e
          );
        } else {
          const newEntry: DiaryEntry = {
            id: Date.now().toString(),
            date: currentDate.toISOString(),
            content: contentToAdd,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          updatedEntries = [...entries, newEntry];
        }

        setEntries(updatedEntries);
        storage.saveDiaryEntries(updatedEntries);
        setCurrentEntry(updatedEntries.find(e => new Date(e.date).toDateString() === dateStr)?.content || "");

        setAiMessages([...updatedMessages, { role: "assistant", content: `✓ Added to your diary for ${dateStr}.` }]);
        setIsAiLoading(false);
        return;
      }
    } catch (e) {
      console.error("Diary command handling error:", e);
    }

    // Streaming AI response
    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-stream`;
      
      const systemPrompt = `You are a deeply caring, spiritually wise companion who combines the wisdom of a compassionate counselor, faith-based mentor, and supportive friend. Your role is to provide emotional support, spiritual encouragement, prayers, and practical guidance based on the user's diary entries and conversations.

CONTEXT & MEMORY:
Today's date: ${currentDate.toLocaleDateString()}
Current diary entry: "${currentEntry || "No entry yet"}"

Recent diary entries: ${entries.slice(-5).map(e => `[${new Date(e.date).toLocaleDateString()}] ${e.content.substring(0, 200)}`).join("\n---\n")}

Previous conversation:
${updatedMessages.slice(-4).map(m => `${m.role}: ${m.content}`).join("\n")}

YOUR SPIRITUAL & EMOTIONAL CAPABILITIES:
1. **Deep Empathy**: Listen with compassion, validate feelings, acknowledge struggles without judgment
2. **Spiritual Guidance**: Share relevant Bible scriptures, prayers, and faith-based encouragement when appropriate
3. **Prayerful Support**: Offer heartfelt prayers for their specific situations and concerns
4. **Encouragement**: Speak life, hope, and strength into their circumstances
5. **Wisdom & Counsel**: Provide godly wisdom for difficult decisions and situations
6. **Pattern Recognition**: Notice recurring struggles or themes and address them with care
7. **Practical Steps**: Suggest actionable ways to overcome challenges, grow spiritually, and find peace
8. **Hope & Healing**: Remind them of God's love, promises, and faithfulness

WHEN USER ASKS TO VIEW/READ THEIR DIARY:
- Read through their recent entries thoughtfully
- Identify key emotions, struggles, and themes
- Provide personalized encouragement based on what you've read
- Offer relevant scriptures and prayers specific to their situation

RESPONSE STYLE:
- Be warm, gentle, and authentically caring
- Use encouraging, life-giving language
- Include relevant Bible verses when appropriate (cite the reference)
- Offer prayers that are personal and specific to their needs
- Balance spiritual wisdom with practical guidance
- Be direct yet compassionate when addressing difficult topics
- Always point toward hope and God's goodness

EXAMPLES OF PRAYERS TO OFFER:
"Lord, I pray for [user] who is facing [specific situation]. Grant them Your peace that surpasses understanding, wisdom to navigate this challenge, and the strength to trust in Your perfect plan. Amen."

EXAMPLES OF ENCOURAGEMENT:
"I can see you're going through a difficult season, but remember - weeping may endure for a night, but joy comes in the morning (Psalm 30:5). You are not alone in this."

Help them feel heard, loved, supported, and encouraged in their faith journey.`;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: updatedMessages,
          systemPrompt 
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429 || resp.status === 402) {
          const errData = await resp.json();
          throw new Error(errData.error || "Rate limit or credits exhausted");
        }
        throw new Error("Failed to start stream");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setStreamingContent(assistantContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setAiMessages([...updatedMessages, { role: "assistant", content: assistantContent }]);
      setStreamingContent("");
    } catch (error) {
      console.error("AI error:", error);
      toast({
        title: "AI Error",
        description: error instanceof Error ? error.message : "Could not get AI response.",
        variant: "destructive",
      });
      setAiMessages(updatedMessages);
    } finally {
      setIsAiLoading(false);
    }
  };

  const isToday = currentDate.toDateString() === new Date().toDateString();

  // Reader view mode
  if (viewMode === 'read') {
    const entry = entries.find((e) => new Date(e.date).toDateString() === currentDate.toDateString());
    return (
      <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <Card className="glass glow p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CalendarIcon className="w-5 h-5 text-success" />
                  <h2 className="text-2xl font-bold text-success">
                    {currentDate.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </h2>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setViewMode('write')} variant="outline">
                  Edit
                </Button>
                <Button onClick={() => setViewMode('closed')} variant="secondary">
                  Close
                </Button>
              </div>
            </div>
            <div className="prose prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-foreground">{entry?.content || "No entry for this date."}</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <h1 className="text-4xl font-bold mb-8 text-success">Daily Diary</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
        {viewMode === 'write' && (
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
                  disabled={isProcessing}
                  className={`${
                    isListening ? "animate-pulse-glow text-success" : 
                    isProcessing ? "text-success" :
                    "text-muted-foreground hover:text-success"
                  } absolute top-3 right-3`}
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
                    <span className="text-xs text-success font-medium">Listening...</span>
                  </div>
                )}
                {isProcessing && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-success/20 rounded-lg">
                    <div className="w-2 h-2 bg-success rounded-full animate-spin" />
                    <span className="text-xs text-success font-medium">Processing...</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={saveEntry} disabled={!currentEntry.trim()} className="glow">
                  Save Entry
                </Button>
                <Button variant="outline" onClick={() => { saveEntry(); setViewMode('closed'); }}>
                  Save & Close
                </Button>
              </div>
            </div>
          </Card>
        )}

          {/* Entry Stats */}
          <Card className="glass p-6">
            <h3 className="text-lg font-semibold mb-4 text-success">Diary Stats</h3>
            <div className="text-center">
              <p className="text-3xl font-bold text-success">{entries.length}</p>
              <p className="text-sm text-muted-foreground">Total Entries</p>
            </div>
          </Card>

          {/* Quick Access */}
          <Card className="glass p-6">
            <h3 className="text-lg font-semibold text-success mb-4">Quick Access</h3>
            <div className="flex flex-col gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Select date
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={currentDate}
                    onSelect={(d: Date | undefined) => {
                      if (!d) return;
                      if (d > new Date()) return;
                      setCurrentDate(d);
                      setViewMode('read');
                    }}
                    disabled={(date) => date > new Date()}
                    modifiers={{
                      hasEntry: (date) => datesWithEntries.has(format(date, "yyyy-MM-dd"))
                    }}
                    modifiersStyles={{
                      hasEntry: { 
                        backgroundColor: "hsl(var(--success) / 0.3)",
                        fontWeight: "bold"
                      }
                    }}
                    className="p-3 pointer-events-auto"
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button variant="secondary" className="w-full" onClick={() => { setCurrentDate(new Date()); setViewMode('write'); }}>
                Open today
              </Button>
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
                  I'm here to encourage you, pray for you, and help you through whatever you're facing. Ask me to "view my diary" for personalized support, or share what's on your heart...
                </p>
              ) : (
                <>
                  {aiMessages.map((msg, idx) => (
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
                  ))}
                  {streamingContent && (
                    <div className="p-3 rounded-lg text-sm bg-background/50 mr-8 animate-pulse-glow">
                      {streamingContent}
                      <span className="inline-block w-2 h-4 bg-success ml-1 animate-pulse" />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Textarea
                placeholder="Share what's on your heart, ask for prayer, or say 'view my diary'..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                className="min-h-[60px] bg-background/50 border-border/50 focus:border-success resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendAiMessage();
                  }
                }}
              />
              <Button
                size="icon"
                onClick={sendAiMessage}
                disabled={isAiLoading || !aiInput.trim()}
                className="glow self-end"
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
