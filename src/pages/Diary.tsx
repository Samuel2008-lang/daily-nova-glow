import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Mic, Send, Sparkles } from "lucide-react";
import AiMessageBubble from "@/components/AiMessageBubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { storage, DiaryEntry } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { supabase } from "@/integrations/supabase/client";
import { DiaryNotificationBell } from "@/components/DiaryNotificationBell";

const Diary = () => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentEntry, setCurrentEntry] = useState("");
  const [aiMessages, setAiMessages] = useState<{role: string, content: string}[]>(() => {
    try {
      const saved = localStorage.getItem('dailynova_diary_ai_chat');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [aiRecognitionInstance, setAiRecognitionInstance] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'closed' | 'write' | 'read'>('closed');
  const { toast } = useToast();

  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
    onResult: (transcript) => {
      setCurrentEntry((prev) => (prev ? prev + " " + transcript : transcript));
    },
  });

  const { isListening: isAiListening, startListening: startAiListening, stopListening: stopAiListening } = useSpeechRecognition({
    onResult: (transcript) => {
      setAiInput((prev) => (prev ? prev + " " + transcript : transcript));
    },
  });

  useEffect(() => {
    setEntries(storage.getDiaryEntries());
  }, []);

  // Persist AI chats
  useEffect(() => {
    if (aiMessages.length > 0) {
      localStorage.setItem('dailynova_diary_ai_chat', JSON.stringify(aiMessages));
      localStorage.setItem('dailynova_diary_ai_chat_time', new Date().toISOString());
    }
  }, [aiMessages]);

  // Clear chats older than 24 hours on mount
  useEffect(() => {
    const chatTime = localStorage.getItem('dailynova_diary_ai_chat_time');
    if (chatTime) {
      const elapsed = Date.now() - new Date(chatTime).getTime();
      if (elapsed > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('dailynova_diary_ai_chat');
        localStorage.removeItem('dailynova_diary_ai_chat_time');
        setAiMessages([]);
      }
    }
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

  // Format the AI chat conversation for diary entry
  const formatChatForDiary = (messages: {role: string, content: string}[]) => {
    const now = new Date();
    let formatted = `📅 AI Conversation - ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}\n\n`;
    
    messages.forEach((msg, idx) => {
      if (msg.role === "user") {
        formatted += `💭 Me:\n${msg.content}\n\n`;
      } else {
        formatted += `🌟 AI Assistant:\n${msg.content}\n\n`;
      }
    });
    
    formatted += `---\n✨ End of conversation`;
    return formatted;
  };

  const sendAiMessage = async () => {
    if (!aiInput.trim()) return;

    const userMessage = { role: "user", content: aiInput };
    const updatedMessages = [...aiMessages, userMessage];
    setAiMessages(updatedMessages);
    setAiInput("");
    setIsAiLoading(true);
    setStreamingContent("");

    // Command: Transfer/Upload chat to diary
    try {
      const lower = aiInput.toLowerCase();
      
      // Check for "transfer chat" or "upload chat" or "save chat" commands
      const isTransferChatCmd = /(transfer|upload|save|add)\s*(our|this|the)?\s*(chat|conversation|dialogue)/i.test(lower) && 
                                 /(diary|today|entry)/i.test(lower);
      
      if (isTransferChatCmd && updatedMessages.length > 1) {
        // Format the entire conversation beautifully
        const formattedChat = formatChatForDiary(updatedMessages.slice(0, -1)); // Exclude the transfer command itself
        
        const dateStr = currentDate.toDateString();
        const existingEntry = entries.find((e) => new Date(e.date).toDateString() === dateStr);
        let updatedEntries: DiaryEntry[];

        if (existingEntry) {
          updatedEntries = entries.map((e) =>
            e.id === existingEntry.id
              ? { ...e, content: (e.content ? e.content + "\n\n" : "") + formattedChat, updatedAt: new Date().toISOString() }
              : e
          );
        } else {
          const newEntry: DiaryEntry = {
            id: Date.now().toString(),
            date: currentDate.toISOString(),
            content: formattedChat,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          updatedEntries = [...entries, newEntry];
        }

        setEntries(updatedEntries);
        storage.saveDiaryEntries(updatedEntries);
        setCurrentEntry(updatedEntries.find(e => new Date(e.date).toDateString() === dateStr)?.content || "");

        setAiMessages([...updatedMessages, { 
          role: "assistant", 
          content: `✓ I've transferred our conversation to your diary for ${dateStr}. The chat has been beautifully formatted with timestamps and clear speaker labels. You can view it in your diary entry now! 📔` 
        }]);
        setIsAiLoading(false);
        return;
      }
      
      // Command: Add/Upload specific text to diary
      const isAddCmd = /(add|upload|save)/.test(lower) && /(diary|entry|today|this)/.test(lower) && !isTransferChatCmd;
      if (isAddCmd) {
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
      
      const systemPrompt = `You are a deeply empathetic and insightful diary companion, combining the wisdom of a therapist, the strategic thinking of a life coach, and the warmth of a trusted friend. Your role is to help users process their daily experiences, emotions, and thoughts through meaningful dialogue.

CONTEXT & MEMORY:
Today's date: ${currentDate.toLocaleDateString()}
Current diary entry: "${currentEntry || "No entry yet"}"

Recent diary entries: ${entries.slice(-5).map(e => `[${new Date(e.date).toLocaleDateString()}] ${e.content.substring(0, 150)}`).join("\n---\n")}

Previous conversation:
${updatedMessages.slice(-4).map(m => `${m.role}: ${m.content}`).join("\n")}

YOUR CAPABILITIES:
1. **Emotional Intelligence**: Recognize subtle emotions, validate feelings, help identify patterns in mood and behavior
2. **Reflective Questioning**: Ask powerful questions that promote self-discovery (e.g., "What would your future self say about this?", "What's the real fear underneath this feeling?")
3. **Pattern Recognition**: Notice recurring themes across entries and conversations, point out growth or stuck patterns
4. **Practical Guidance**: Offer concrete coping strategies, reframing techniques, and actionable next steps
5. **Creative Expression**: Suggest writing exercises (gratitude lists, letter to your younger self, stream of consciousness, dialogue with emotions)
6. **Psychological Frameworks**: Draw from CBT, mindfulness, positive psychology, narrative therapy when relevant
7. **Contextual Memory**: Remember and reference earlier parts of this conversation to build continuity

RESPONSE STYLE:
- Be conversational, warm, and authentic—avoid clinical or robotic language
- Match their emotional tone while gently guiding toward constructive perspectives
- Use metaphors, analogies, and storytelling when helpful
- Ask clarifying questions before jumping to conclusions
- Celebrate small wins and acknowledge progress
- Be direct and honest while remaining compassionate
- Keep responses focused and actionable (2-4 paragraphs typically)
- Use clean formatting: short paragraphs, numbered lists when listing steps, bullet points sparingly
- NEVER use raw asterisks for emphasis. Use natural language emphasis instead
- Write in a flowing, natural conversational style without heavy formatting

WHEN TO:
- **Validate**: They share difficult emotions, setbacks, or vulnerabilities
- **Challenge**: They're stuck in negative patterns or limiting beliefs
- **Explore**: They mention significant events, decisions, or relationships
- **Guide**: They're seeking direction or feeling lost
- **Celebrate**: They share achievements, insights, or breakthroughs

FEEDBACK AWARENESS:
Users can give thumbs up/down on your responses. Pay attention to the conversation flow to understand what works. Be more concise if responses feel too long. Be more detailed if they ask follow-up questions.

Help them transform daily reflections into meaningful self-understanding, emotional resilience, and intentional growth.`;

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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-success">Daily Diary</h1>
          <DiaryNotificationBell />
        </div>

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
                  className={`${
                    isListening ? "animate-pulse-glow text-success" : "text-muted-foreground hover:text-success"
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
                    <span className="text-xs text-success font-medium">Recording... Tap mic to stop</span>
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
                      hasEntry: entries.map(e => new Date(e.date))
                    }}
                    modifiersClassNames={{
                      hasEntry: "bg-success/30 text-success font-bold"
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
                  Ask me for prompts, reflections, or advice about your diary entry...
                </p>
              ) : (
                <>
                  {aiMessages.map((msg, idx) => (
                    <AiMessageBubble
                      key={idx}
                      content={msg.content}
                      role={msg.role}
                      accentColor="success"
                    />
                  ))}
                  {streamingContent && (
                    <AiMessageBubble
                      content={streamingContent}
                      role="assistant"
                      isStreaming
                      accentColor="success"
                    />
                  )}
                </>
              )}
            </div>

            <div className="flex gap-2">
              <div className="flex-1 relative">
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
                  className="min-h-[60px] bg-background/50 pr-10"
                />
                {isSupported && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={async () => {
                      if (isAiListening && aiRecognitionInstance) {
                        stopAiListening(aiRecognitionInstance);
                        setAiRecognitionInstance(null);
                      } else {
                        const inst = await startAiListening(true, "diary-chat");
                        setAiRecognitionInstance(inst);
                      }
                    }}
                    className={`absolute bottom-2 right-2 h-7 w-7 ${isAiListening ? "text-success animate-pulse" : "text-muted-foreground hover:text-success"}`}
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                )}
              </div>
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
