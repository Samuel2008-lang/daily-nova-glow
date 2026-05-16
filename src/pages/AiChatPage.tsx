import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Send, PlusCircle, History, Sparkles } from "lucide-react";
import AiMessageBubble from "@/components/AiMessageBubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { storage, DiaryEntry, JournalEntry } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { haptics } from "@/lib/haptics";
import {
  loadAiChatSessions,
  saveAiChatSessions,
  upsertAiChatSession,
  type AiChatSession,
} from "@/lib/ai-chat-sessions";

interface AiChatPageProps {
  mode: "diary" | "journal";
}

const CONFIG = {
  diary: {
    title: "Diary AI Assistant",
    back: "/diary",
    sessionsKey: "dailynova_diary_ai_sessions",
    activeKey: "dailynova_diary_active_ai_chat",
    legacyKey: "dailynova_diary_ai_chat",
    accent: "success",
    glow: "glow",
    placeholder: "Ask for diary prompts, reflections, or advice...",
    targetWord: "diary",
  },
  journal: {
    title: "Journal AI Assistant",
    back: "/journal",
    sessionsKey: "dailynova_journal_ai_sessions",
    activeKey: "dailynova_journal_active_ai_chat",
    legacyKey: "dailynova_journal_ai_chat",
    accent: "secondary",
    glow: "glow-purple",
    placeholder: "Ask for journaling advice or creative prompts...",
    targetWord: "journal",
  },
} as const;

const AiChatPage = ({ mode }: AiChatPageProps) => {
  const cfg = CONFIG[mode];
  const navigate = useNavigate();
  const { toast } = useToast();

  const [aiSessions, setAiSessions] = useState<AiChatSession[]>(() =>
    loadAiChatSessions(cfg.sessionsKey, cfg.legacyKey),
  );
  const [activeId, setActiveId] = useState(() => {
    const stored = localStorage.getItem(cfg.activeKey);
    const sessions = loadAiChatSessions(cfg.sessionsKey, cfg.legacyKey);
    return stored || sessions[0]?.id || Date.now().toString();
  });
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(() => {
    const sessions = loadAiChatSessions(cfg.sessionsKey, cfg.legacyKey);
    const active = localStorage.getItem(cfg.activeKey);
    return sessions.find((s) => s.id === active)?.messages || sessions[0]?.messages || [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
    onResult: (t) => setInput((p) => (p ? p + " " + t : t)),
  });

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  // Persist sessions
  useEffect(() => {
    if (messages.length > 0) {
      setAiSessions((prev) => {
        const updated = upsertAiChatSession(prev, activeId, messages);
        saveAiChatSessions(cfg.sessionsKey, updated);
        localStorage.setItem(cfg.activeKey, activeId);
        return updated;
      });
    }
  }, [messages, activeId, cfg.sessionsKey, cfg.activeKey]);

  const startNew = () => {
    haptics.light();
    const id = Date.now().toString();
    setActiveId(id);
    setMessages([]);
    localStorage.setItem(cfg.activeKey, id);
    stickRef.current = true;
  };

  const openSession = (s: AiChatSession) => {
    haptics.light();
    setActiveId(s.id);
    setMessages(s.messages);
    localStorage.setItem(cfg.activeKey, s.id);
    setSheetOpen(false);
    stickRef.current = true;
  };

  // Format chat for entry
  const formatChat = (msgs: { role: string; content: string }[]) => {
    const now = new Date();
    const emoji = mode === "diary" ? "📅" : "📓";
    let out = `${emoji} AI Conversation - ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}\n\n`;
    msgs.forEach((m) => {
      out += m.role === "user" ? `💭 Me:\n${m.content}\n\n` : `🌟 AI Assistant:\n${m.content}\n\n`;
    });
    out += `---\n✨ End of conversation`;
    return out;
  };

  const appendToTodaysEntry = (content: string) => {
    const today = new Date();
    const dateStr = today.toDateString();
    if (mode === "diary") {
      const entries = storage.getDiaryEntries();
      const existing = entries.find((e) => new Date(e.date).toDateString() === dateStr);
      let updated: DiaryEntry[];
      if (existing) {
        updated = entries.map((e) =>
          e.id === existing.id
            ? { ...e, content: (e.content ? e.content + "\n\n" : "") + content, updatedAt: new Date().toISOString() }
            : e,
        );
      } else {
        updated = [
          ...entries,
          {
            id: Date.now().toString(),
            date: today.toISOString(),
            content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      }
      storage.saveDiaryEntries(updated);
    } else {
      const entries = storage.getJournalEntries();
      const existing = entries.find((e) => new Date(e.createdAt).toDateString() === dateStr);
      let updated: JournalEntry[];
      if (existing) {
        updated = entries.map((e) =>
          e.id === existing.id
            ? { ...e, content: (e.content ? e.content + "\n\n" : "") + content, updatedAt: new Date().toISOString() }
            : e,
        );
      } else {
        updated = [
          ...entries,
          {
            id: Date.now().toString(),
            content,
            createdAt: today.toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      }
      storage.saveJournalEntries(updated);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    const updated = [...messages, userMsg];
    setMessages(updated);
    const inputText = input;
    setInput("");
    stickRef.current = true;
    setIsLoading(true);
    setStreaming("");

    // Transfer/save chat command
    try {
      const lower = inputText.toLowerCase();
      const isTransfer =
        /(transfer|upload|save|add|copy|move)\b[\s\S]{0,40}\b(chat|conversation|dialogue|message|messages|reply|replies|exchange)/i.test(
          lower,
        ) && new RegExp(`(${cfg.targetWord}|today|entry|here)`, "i").test(lower);

      if (isTransfer && updated.length > 1) {
        const history = updated.slice(0, -1);
        let slice = history;
        const lastN = lower.match(/last\s+(\d+)\s+(message|reply|exchange)/);
        if (lastN) {
          const n = Math.min(parseInt(lastN[1], 10) || history.length, history.length);
          slice = history.slice(-n);
        }
        if (/(this|your|the)\s+(last|previous)\s+(reply|response|message)/i.test(lower)) {
          const lastA = [...history].reverse().find((m) => m.role === "assistant");
          if (lastA) slice = [lastA];
        }
        const formatted = formatChat(slice);
        appendToTodaysEntry(formatted);
        setMessages([
          ...updated,
          {
            role: "assistant",
            content: `✓ Transferred ${slice.length} message${slice.length === 1 ? "" : "s"} to your ${cfg.targetWord} for today.`,
          },
        ]);
        setIsLoading(false);
        return;
      }
    } catch (e) {
      console.error("Command handling error:", e);
    }

    // Stream AI response
    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-stream`;
      const recentEntries =
        mode === "diary"
          ? storage.getDiaryEntries().slice(-5).map((e) => `[${new Date(e.date).toLocaleDateString()}] ${e.content.substring(0, 150)}`).join("\n---\n")
          : storage.getJournalEntries().slice(-5).map((e) => `[${new Date(e.createdAt).toLocaleDateString()}] ${e.content.substring(0, 150)}`).join("\n---\n");

      const systemPrompt =
        mode === "diary"
          ? `You are a deeply empathetic and insightful diary companion combining therapist warmth, life-coach strategy, and a trusted friend's authenticity. Help the user process daily experiences, emotions and thoughts.

Recent diary entries:
${recentEntries}

Be conversational, warm, and authentic. Use clean formatting, short paragraphs. Never use raw asterisks for emphasis. Keep responses focused (2-4 paragraphs).`
          : `You are an expert journaling coach and creative writing mentor. Help the user unlock self-understanding through intentional writing.

Recent journal entries:
${recentEntries}

Be inspiring and thought-provoking. Use clean formatting. Never use raw asterisks for emphasis.`;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: updated, systemPrompt }),
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
      let buf = "";
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const chunk = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (chunk) {
              content += chunk;
              setStreaming(content);
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
      setMessages([...updated, { role: "assistant", content }]);
      setStreaming("");
    } catch (error) {
      console.error("AI error:", error);
      toast({
        title: "AI Error",
        description: error instanceof Error ? error.message : "Could not get AI response.",
        variant: "destructive",
      });
      setMessages(updated);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(cfg.back)} aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Sparkles className={`w-5 h-5 text-${cfg.accent}`} />
          <h1 className={`text-base font-semibold text-${cfg.accent} truncate`}>{cfg.title}</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={startNew}>
            <PlusCircle className="w-4 h-4 mr-1" /> New
          </Button>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="ghost">
                <History className="w-4 h-4 mr-1" /> Past
                {aiSessions.length > 0 && (
                  <span className="ml-1 text-[10px] opacity-70">({aiSessions.length})</span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] sm:w-[400px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Past Chats</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2">
                {aiSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No past chats yet.</p>
                ) : (
                  aiSessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => openSession(s)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        s.id === activeId
                          ? `border-${cfg.accent}/50 bg-${cfg.accent}/10`
                          : "border-border/30 hover:bg-muted/50"
                      }`}
                    >
                      <p className="text-sm font-medium truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.messages.length} messages</p>
                    </button>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            Start a new conversation. 🔒 Don't share private credentials or sensitive info.
          </p>
        ) : (
          <>
            {messages.map((m, i) => (
              <AiMessageBubble key={i} content={m.content} role={m.role} accentColor={cfg.accent} />
            ))}
            {streaming && <AiMessageBubble content={streaming} role="assistant" isStreaming accentColor={cfg.accent} />}
          </>
        )}
      </div>

      {/* Composer */}
      <div
        className="flex gap-2 px-3 pt-3 pb-4 border-t border-border/30 bg-background/95 backdrop-blur-sm shrink-0"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex-1 relative">
          <Textarea
            placeholder={cfg.placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            className="min-h-[56px] max-h-[140px] bg-background/50 pr-10 resize-none"
          />
          {isSupported && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => (isListening ? stopListening() : startListening(true, `${mode}-chat`))}
              className={`absolute bottom-2 right-2 h-7 w-7 ${
                isListening ? `text-${cfg.accent} animate-pulse` : `text-muted-foreground hover:text-${cfg.accent}`
              }`}
            >
              <Mic className="w-4 h-4" />
            </Button>
          )}
        </div>
        <Button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          size="icon"
          className={`shrink-0 ${cfg.glow}`}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default AiChatPage;
