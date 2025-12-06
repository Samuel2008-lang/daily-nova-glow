import { useState, useEffect } from "react";
import { MessageSquare, Mic, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { storage, JournalEntry } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { supabase } from "@/integrations/supabase/client";

const Journal = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentEntry, setCurrentEntry] = useState("");
  const [aiMessages, setAiMessages] = useState<{role: string, content: string}[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'closed' | 'write' | 'read'>('closed');
  const { toast } = useToast();

  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
    onResult: (transcript) => {
      setCurrentEntry((prev) => (prev ? prev + " " + transcript : transcript));
    },
  });

  useEffect(() => {
    setEntries(storage.getJournalEntries());
  }, []);

  useEffect(() => {
    const dateStr = currentDate.toDateString();
    const entry = entries.find((e) => new Date(e.createdAt).toDateString() === dateStr);
    setCurrentEntry(entry?.content || "");
  }, [currentDate, entries]);

  const saveEntry = () => {
    if (!currentEntry.trim()) return;

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

  const handleVoiceClick = async () => {
    if (isListening && recognitionInstance) {
      stopListening(recognitionInstance);
      setRecognitionInstance(null);
    } else {
      const instance = await startListening(true, "journal");
      setRecognitionInstance(instance);
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
    setIsAiLoading(true);
    setStreamingContent("");

    // Command: Transfer/Upload chat to journal
    try {
      const lower = aiInput.toLowerCase();
      
      // Check for "transfer chat" or "upload chat" or "save chat" commands
      const isTransferChatCmd = /(transfer|upload|save|add)\s*(our|this|the)?\s*(chat|conversation|dialogue)/i.test(lower) && 
                                 /(journal|today|entry)/i.test(lower);
      
      if (isTransferChatCmd && updatedMessages.length > 1) {
        // Format the entire conversation beautifully
        const formattedChat = formatChatForJournal(updatedMessages.slice(0, -1)); // Exclude the transfer command itself
        
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
          content: `✓ I've transferred our conversation to your journal for ${dateStr}. The chat has been beautifully formatted with timestamps and clear speaker labels. You can view it in your journal entry now! 📓` 
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

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <h1 className="text-4xl font-bold mb-8 text-secondary">Journal</h1>

        <div className="grid gap-6 md:grid-cols-2">
          {viewMode === 'write' && (
            <Card className="glass glow-purple p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-secondary flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Write Entry
                </h2>
              </div>

              {/* Date Navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getTime() - 86400000))}>
                  <span className="sr-only">Previous day</span>‹
                </Button>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-secondary">
                    {currentDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </h3>
                  {currentDate.toDateString() !== new Date().toDateString() && (
                    <Button variant="link" onClick={() => setCurrentDate(new Date())} className="text-xs text-secondary">
                      Go to today
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentDate(new Date(currentDate.getTime() + 86400000))}
                  disabled={currentDate.toDateString() === new Date().toDateString()}
                >
                  <span className="sr-only">Next day</span>›
                </Button>
              </div>

              <div className="relative mb-4">
                <Textarea
                  placeholder="What's on your mind? Write freely..."
                  value={currentEntry}
                  onChange={(e) => setCurrentEntry(e.target.value)}
                  className="min-h-[300px] bg-background/50 border-border/50 focus:border-secondary resize-none pr-14"
                />
                {isSupported && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleVoiceClick}
                    className={`${
                      isListening ? "animate-pulse-glow text-secondary" : "text-muted-foreground hover:text-secondary"
                    } absolute top-3 right-3`}
                  >
                    <Mic className="w-5 h-5" />
                  </Button>
                )}
              </div>

              {isListening && (
                <div className="flex items-center gap-2 px-3 py-2 bg-secondary/20 rounded-lg animate-pulse-glow mb-4">
                  <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                  <span className="text-xs text-secondary font-medium">Recording... Tap mic to stop</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <Button onClick={saveEntry} disabled={!currentEntry.trim()} className="glow-purple">
                  Save Entry
                </Button>
                <Button variant="outline" onClick={() => { saveEntry(); setViewMode('closed'); }}>
                  Save & Close
                </Button>
              </div>

            </Card>
          )}

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

          {/* AI Chat Assistant */}
          <Card className="glass glow-purple p-6 flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-secondary flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI Assistant
            </h2>

            <div className="flex-1 space-y-3 mb-4 overflow-y-auto max-h-[400px]">
              {aiMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Ask me for advice, prompts, or reflections on your journal entries...
                </p>
              ) : (
                <>
                  {aiMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg text-sm ${
                        msg.role === "user"
                          ? "bg-secondary/20 ml-8"
                          : "bg-background/50 mr-8"
                      }`}
                    >
                      {msg.content}
                    </div>
                  ))}
                  {streamingContent && (
                    <div className="p-3 rounded-lg text-sm bg-background/50 mr-8 animate-pulse-glow">
                      {streamingContent}
                      <span className="inline-block w-1 h-4 bg-secondary ml-1 animate-pulse" />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-2">
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
                className="min-h-[60px] bg-background/50"
              />
              <Button
                onClick={sendAiMessage}
                disabled={!aiInput.trim() || isAiLoading}
                size="icon"
                className="shrink-0 glow-purple"
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

export default Journal;
