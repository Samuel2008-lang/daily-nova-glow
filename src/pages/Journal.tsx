import { useState, useEffect, useRef } from "react";
import { MessageSquare, Mic, Send, Sparkles, ChevronDown, ChevronUp, PlusCircle, History } from "lucide-react";
import AiMessageBubble from "@/components/AiMessageBubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { storage, JournalEntry } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { supabase } from "@/integrations/supabase/client";
import { JournalNotificationBell } from "@/components/JournalNotificationBell";
import { haptics } from "@/lib/haptics";
import { loadAiChatSessions, saveAiChatSessions, upsertAiChatSession, type AiChatSession } from "@/lib/ai-chat-sessions";

const JOURNAL_AI_SESSIONS_KEY = "dailynova_journal_ai_sessions";
const JOURNAL_AI_ACTIVE_KEY = "dailynova_journal_active_ai_chat";
const JOURNAL_AI_LEGACY_KEY = "dailynova_journal_ai_chat";

const Journal = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentEntry, setCurrentEntry] = useState("");
  const [aiSessions, setAiSessions] = useState<AiChatSession[]>(() => loadAiChatSessions(JOURNAL_AI_SESSIONS_KEY, JOURNAL_AI_LEGACY_KEY));
  const [activeAiSessionId, setActiveAiSessionId] = useState(() => localStorage.getItem(JOURNAL_AI_ACTIVE_KEY) || loadAiChatSessions(JOURNAL_AI_SESSIONS_KEY, JOURNAL_AI_LEGACY_KEY)[0]?.id || Date.now().toString());
  const [aiMessages, setAiMessages] = useState<{role: string, content: string}[]>(() => {
    try {
      const sessions = loadAiChatSessions(JOURNAL_AI_SESSIONS_KEY, JOURNAL_AI_LEGACY_KEY);
      const active = localStorage.getItem(JOURNAL_AI_ACTIVE_KEY);
      return sessions.find((session) => session.id === active)?.messages || sessions[0]?.messages || [];
    } catch { return []; }
  });
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [aiRecognitionInstance, setAiRecognitionInstance] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'closed' | 'write' | 'read'>('closed');
  const [aiOpen, setAiOpen] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const { toast } = useToast();

  const handleChatScroll = () => {
    const el = chatScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 40;
  };

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [aiMessages, streamingContent, aiOpen]);

  const ensureStick = () => { stickToBottomRef.current = true; };

  const startNewAiChat = () => {
    haptics.light();
    const id = Date.now().toString();
    setActiveAiSessionId(id);
    setAiMessages([]);
    localStorage.setItem(JOURNAL_AI_ACTIVE_KEY, id);
  };

  const openAiChatSession = (session: AiChatSession) => {
    haptics.light();
    setActiveAiSessionId(session.id);
    setAiMessages(session.messages);
    localStorage.setItem(JOURNAL_AI_ACTIVE_KEY, session.id);
    ensureStick();
  };

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
    setEntries(storage.getJournalEntries());
  }, []);

  // Persist AI chats with ChatGPT-style saved sessions
  useEffect(() => {
    if (aiMessages.length > 0) {
      setAiSessions((prev) => {
        const updated = upsertAiChatSession(prev, activeAiSessionId, aiMessages);
        saveAiChatSessions(JOURNAL_AI_SESSIONS_KEY, updated);
        localStorage.setItem(JOURNAL_AI_ACTIVE_KEY, activeAiSessionId);
        return updated;
      });
    }
  }, [aiMessages, activeAiSessionId]);

  // Clear chats older than 24 hours on mount
  useEffect(() => {
    const chatTime = localStorage.getItem('dailynova_journal_ai_chat_time');
    if (chatTime) {
      const elapsed = Date.now() - new Date(chatTime).getTime();
      if (elapsed > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('dailynova_journal_ai_chat');
        localStorage.removeItem('dailynova_journal_ai_chat_time');
        setAiMessages([]);
      }
    }
  }, []);

  useEffect(() => {
    const dateStr = currentDate.toDateString();
    const entry = entries.find((e) => new Date(e.createdAt).toDateString() === dateStr);
    setCurrentEntry(entry?.content || "");
  }, [currentDate, entries]);

  const saveEntry = () => {
    if (!currentEntry.trim()) return;
    haptics.success();

    const dateStr = currentDate.toDateString();
    const existingEntry = entries.find((e) => new Date(e.createdAt).toDateString() === dateStr);

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
        content: currentEntry,
        createdAt: currentDate.toISOString(),
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

  const handleVoiceClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(true, "journal");
    }
  };

  // Format the AI chat conversation for journal entry
  const formatChatForJournal = (messages: {role: string, content: string}[]) => {
    const now = new Date();
    let formatted = `📓 AI Conversation - ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}\n\n`;
    
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
    ensureStick();
    setIsAiLoading(true);
    setStreamingContent("");

    // Command: Transfer/Upload chat to journal — supports "this chat", "last N", "from X to Y", "last reply"
    try {
      const lower = aiInput.toLowerCase();

      const isTransferChatCmd =
        /(transfer|upload|save|add|copy|move)\b[\s\S]{0,40}\b(chat|conversation|dialogue|message|messages|reply|replies|exchange)/i.test(lower) &&
        /(journal|today|entry|here)/i.test(lower);

      if (isTransferChatCmd && updatedMessages.length > 1) {
        const history = updatedMessages.slice(0, -1);
        let slice = history;

        const lastN = lower.match(/last\s+(\d+)\s+(message|reply|exchange)/);
        if (lastN) {
          const n = Math.min(parseInt(lastN[1], 10) || history.length, history.length);
          slice = history.slice(-n);
        }

        const range = aiInput.match(/from\s+"([^"]+)"\s+to\s+"([^"]+)"/i);
        if (range) {
          const [, fromText, toText] = range;
          const fromIdx = history.findIndex((m) => m.content.toLowerCase().includes(fromText.toLowerCase()));
          const toIdx = history.findIndex((m) => m.content.toLowerCase().includes(toText.toLowerCase()));
          if (fromIdx !== -1 && toIdx !== -1) {
            const [a, b] = [fromIdx, toIdx].sort((x, y) => x - y);
            slice = history.slice(a, b + 1);
          }
        }

        if (/(this|your|the)\s+(last|previous)\s+(reply|response|message)/i.test(lower)) {
          const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
          if (lastAssistant) slice = [lastAssistant];
        }

        const formattedChat = formatChatForJournal(slice);

        const dateStr = currentDate.toDateString();
        const existingEntry = entries.find((e) => new Date(e.createdAt).toDateString() === dateStr);
        let updatedEntries: JournalEntry[];

        if (existingEntry) {
          updatedEntries = entries.map((e) =>
            e.id === existingEntry.id
              ? { ...e, content: (e.content ? e.content + "\n\n" : "") + formattedChat, updatedAt: new Date().toISOString() }
              : e
          );
        } else {
          const newEntry: JournalEntry = {
            id: Date.now().toString(),
            content: formattedChat,
            createdAt: currentDate.toISOString(),
            updatedAt: new Date().toISOString(),
          };
          updatedEntries = [...entries, newEntry];
        }

        setEntries(updatedEntries);
        storage.saveJournalEntries(updatedEntries);
        setCurrentEntry(updatedEntries.find(e => new Date(e.createdAt).toDateString() === dateStr)?.content || "");

        setAiMessages([...updatedMessages, {
          role: "assistant",
          content: `✓ Transferred ${slice.length} message${slice.length === 1 ? "" : "s"} to your journal for ${dateStr}. 📓`
        }]);
        setIsAiLoading(false);
        return;
      }
      
      // Command: Add/Upload specific text to journal
      const isAddCmd = /(add|upload|save)/.test(lower) && /(journal|entry|this)/.test(lower) && !isTransferChatCmd;
      if (isAddCmd) {
        const quoted = aiInput.match(/"([\s\S]*?)"/g);
        let contentToAdd = quoted
          ? quoted.map(q => q.replace(/^"|"$/g, "")).join("\n\n").trim()
          : aiInput
              .replace(/\b(add|upload|save)\b/gi, "")
              .replace(/\b(to|into|my|the|journal|entry|this)\b/gi, "")
              .trim();
        if (!contentToAdd || contentToAdd.length < 20) {
          contentToAdd = aiInput.trim();
        }

        const dateStr = currentDate.toDateString();
        const existingEntry = entries.find((e) => new Date(e.createdAt).toDateString() === dateStr);
        let updatedEntries: JournalEntry[];

        if (existingEntry) {
          updatedEntries = entries.map((e) =>
            e.id === existingEntry.id
              ? { ...e, content: (e.content ? e.content + "\n\n" : "") + contentToAdd, updatedAt: new Date().toISOString() }
              : e
          );
        } else {
          const newEntry: JournalEntry = {
            id: Date.now().toString(),
            content: contentToAdd,
            createdAt: currentDate.toISOString(),
            updatedAt: new Date().toISOString(),
          };
          updatedEntries = [...entries, newEntry];
        }

        setEntries(updatedEntries);
        storage.saveJournalEntries(updatedEntries);
        setCurrentEntry(updatedEntries.find(e => new Date(e.createdAt).toDateString() === dateStr)?.content || "");

        setAiMessages([...updatedMessages, { role: "assistant", content: `✓ Added to your journal for ${dateStr}.` }]);
        setIsAiLoading(false);
        return;
      }
    } catch (e) {
      console.error("Journal command handling error:", e);
    }

    // Streaming AI response
    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-stream`;
      
      const systemPrompt = `You are an expert journaling coach and creative writing mentor, specializing in helping people unlock deeper self-understanding through intentional, creative writing practices. You combine expertise in narrative therapy, creative writing techniques, and psychological frameworks to guide meaningful self-exploration.

CONTEXT & MEMORY:
Recent journal entries: ${entries.slice(-5).map(e => `[${new Date(e.createdAt).toLocaleDateString()}] ${e.content.substring(0, 150)}`).join("\n---\n")}

Current entry in progress: "${currentEntry || "Just starting..."}"

Previous conversation:
${updatedMessages.slice(-4).map(m => `${m.role}: ${m.content}`).join("\n")}

YOUR EXPERTISE:
1. **Creative Prompts**: Generate powerful, unique journaling prompts that spark deep introspection
   - Perspective shifts: "Write from your 80-year-old self looking back", "What would someone who loves you say about this situation?"
   - Sensory exploration: "Describe this feeling as a place you're walking through"
   - Dialogues: "Have a conversation between your fear and your courage"
   
2. **Writing Techniques**: Teach concrete methods to deepen their practice
   - Stream of consciousness, unsent letters, list-making, metaphor exploration
   - Morning pages, gratitude spirals, dream analysis, timeline mapping
   
3. **Pattern Recognition**: Identify recurring themes, character arcs, emotional patterns across entries
   - "I notice you often mention feeling 'stuck' when discussing work—let's explore that"
   
4. **Psychological Frameworks**: Apply relevant concepts when helpful
   - Cognitive restructuring, narrative identity, values clarification, parts work
   
5. **Writer's Block Solutions**: Offer targeted questions and exercises to overcome blocks
   - "What's the one thing you're avoiding writing about right now?"
   - "Write the worst possible version of what you're trying to say, then flip it"
   
6. **Actionable Insights**: Help translate reflections into real-world wisdom
   - "What's one small experiment you could try this week based on this realization?"

RESPONSE APPROACH:
- Be inspiring and thought-provoking while remaining grounded and practical
- Ask provocative questions that encourage vulnerability and authentic expression
- Reference their previous entries and our conversation to show continuity
- Suggest specific exercises tailored to what they're working through
- Celebrate their insights and breakthroughs
- Be direct and focused—give them clear next steps
- Match their creative energy while gently pushing them deeper
- Use clean formatting: short paragraphs, numbered lists when listing steps
- NEVER use raw asterisks for emphasis. Use natural language emphasis instead
- Write in a flowing, natural conversational style without heavy formatting

FEEDBACK AWARENESS:
Users can give thumbs up/down on your responses. Adapt your style based on conversation cues.

TONE: Wise mentor meets enthusiastic writing coach—encouraging, insightful, creative, and focused on transformation through writing.

Help them use journaling as a tool for profound self-discovery, creative expression, and intentional personal evolution.`;

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

  // Reader view mode
  if (viewMode === 'read') {
    const entry = entries.find((e) => new Date(e.createdAt).toDateString() === currentDate.toDateString());
    return (
      <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <Card className="glass glow-purple p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-5 h-5 text-secondary" />
                  <h2 className="text-2xl font-bold text-secondary">
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

  // Full-screen immersive write mode
  if (viewMode === 'write') {
    const isToday = currentDate.toDateString() === new Date().toDateString();
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-background animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentDate(new Date(currentDate.getTime() - 86400000))}
              className="hover:text-secondary"
            >
              <span className="sr-only">Previous day</span>‹
            </Button>
            <h1 className="text-base font-semibold text-secondary">
              {currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentDate(new Date(currentDate.getTime() + 86400000))}
              disabled={isToday}
              className="hover:text-secondary"
            >
              <span className="sr-only">Next day</span>›
            </Button>
          </div>
          {isSupported && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleVoiceClick}
              className={isListening ? "animate-pulse-glow text-secondary" : "text-muted-foreground hover:text-secondary"}
              aria-label="Voice input"
            >
              <Mic className="w-5 h-5" />
            </Button>
          )}
        </div>

        <div className="flex-1 flex flex-col px-4 pt-4 pb-2 overflow-hidden">
          <Textarea
            placeholder="What's on your mind? Write freely..."
            value={currentEntry}
            onChange={(e) => setCurrentEntry(e.target.value)}
            className="flex-1 resize-none bg-transparent border-0 px-0 text-base leading-relaxed focus-visible:ring-0"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 shrink-0">
            <span>{currentEntry.length} characters</span>
            {isListening && (
              <div className="flex items-center gap-2 px-2 py-1 bg-secondary/10 rounded">
                <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                <span className="text-secondary font-medium">Recording…</span>
              </div>
            )}
          </div>
        </div>

        <div
          className="flex gap-2 px-4 pt-3 pb-6 border-t border-border/30 bg-background/95 backdrop-blur-sm shrink-0"
          style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        >
          <Button variant="outline" onClick={() => setViewMode('closed')} className="flex-1">
            Cancel
          </Button>
          <Button onClick={() => { saveEntry(); setViewMode('closed'); }} disabled={!currentEntry.trim()} className="flex-1 glow-purple">
            Save Entry
          </Button>
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

          {/* Quick Access */}
          <Card className="glass p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Quick Access</h3>
            <div className="flex flex-col gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <MessageSquare className="w-4 h-4 mr-2" />
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
                      hasEntry: entries.map(e => new Date(e.createdAt))
                    }}
                    modifiersClassNames={{
                      hasEntry: "bg-secondary/30 text-secondary font-bold"
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

          {/* AI Chat Assistant — Collapsible */}
          <Card className="glass glow-purple p-4 flex flex-col">
            <button
              onClick={() => setAiOpen(!aiOpen)}
              className="flex items-center justify-between w-full"
            >
              <h2 className="text-lg font-semibold text-secondary flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI Assistant
                {aiMessages.length > 0 && (
                  <span className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">{aiMessages.length}</span>
                )}
              </h2>
              {aiOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </button>

            {aiOpen && (
              <>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={startNewAiChat} className="flex-1">
                    <PlusCircle className="w-4 h-4 mr-1" /> New chat
                  </Button>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button size="sm" variant="ghost" className="flex-1">
                        <History className="w-4 h-4 mr-1" /> Past chats
                        {aiSessions.length > 0 && <span className="ml-1 text-[10px] opacity-70">({aiSessions.length})</span>}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[85vw] sm:w-[400px] overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>Past Chats</SheetTitle>
                      </SheetHeader>
                      <div className="mt-4 space-y-2">
                        {aiSessions.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">No past chats yet.</p>
                        ) : aiSessions.map((session) => (
                          <button
                            key={session.id}
                            onClick={() => openAiChatSession(session)}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                              session.id === activeAiSessionId
                                ? "border-secondary/50 bg-secondary/10"
                                : "border-border/30 hover:bg-muted/50"
                            }`}
                          >
                            <p className="text-sm font-medium truncate">{session.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{session.messages.length} messages</p>
                          </button>
                        ))}
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
                <div ref={chatScrollRef} onScroll={handleChatScroll} className="flex-1 space-y-3 mt-4 mb-4 overflow-y-auto max-h-[400px]">
                  {aiMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Ask me for advice, prompts, or reflections. 🔒 Please don't share private credentials, passwords, or sensitive personal info.
                    </p>
                  ) : (
                    <>
                      {aiMessages.map((msg, idx) => (
                        <AiMessageBubble
                          key={idx}
                          content={msg.content}
                          role={msg.role}
                          accentColor="secondary"
                        />
                      ))}
                      {streamingContent && (
                        <AiMessageBubble
                          content={streamingContent}
                          role="assistant"
                          isStreaming
                          accentColor="secondary"
                        />
                      )}
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Textarea
                      placeholder="Ask for journaling advice..."
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
                        onClick={() => {
                          if (isAiListening) {
                            stopAiListening();
                          } else {
                            startAiListening(true, "journal-chat");
                          }
                        }}
                        className={`absolute bottom-2 right-2 h-7 w-7 ${isAiListening ? "text-secondary animate-pulse" : "text-muted-foreground hover:text-secondary"}`}
                      >
                        <Mic className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <Button
                    onClick={sendAiMessage}
                    disabled={!aiInput.trim() || isAiLoading}
                    size="icon"
                    className="shrink-0 glow-purple"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Journal;
