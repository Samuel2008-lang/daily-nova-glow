import { useState, useEffect } from "react";
import { MessageSquare, Mic, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { storage, JournalEntry } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { supabase } from "@/integrations/supabase/client";

const Journal = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
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
    setEntries(storage.getJournalEntries());
  }, []);

  const saveEntry = () => {
    if (!currentEntry.trim()) return;

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      content: currentEntry,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedEntries = [...entries, newEntry];
    setEntries(updatedEntries);
    storage.saveJournalEntries(updatedEntries);
    setCurrentEntry("");

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

  const sendAiMessage = async () => {
    if (!aiInput.trim()) return;

    const userMessage = { role: "user", content: aiInput };
    const updatedMessages = [...aiMessages, userMessage];
    setAiMessages(updatedMessages);
    setAiInput("");
    setIsAiLoading(true);

    // Command: Add/Upload text to journal
    try {
      const lower = aiInput.toLowerCase();
      const isAddCmd = /(add|upload|save)/.test(lower) && /(journal|entry|this)/.test(lower);
      if (isAddCmd || aiInput.length > 400) {
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

        const newEntry: JournalEntry = {
          id: Date.now().toString(),
          content: contentToAdd,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const updated = [...entries, newEntry];
        setEntries(updated);
        storage.saveJournalEntries(updated);
        setCurrentEntry("");

        setAiMessages([...updatedMessages, { role: "assistant", content: "Added to your journal." }]);
        return;
      }
    } catch (e) {
      console.error("Journal command handling error:", e);
    }

    try {
      const { data, error } = await supabase.functions.invoke('enhance-text', {
        body: { 
          text: `You are an expert journaling coach and creative writing mentor. The user is working on their free-form journal.

Recent journal entries: ${entries.slice(-5).map(e => e.content.substring(0, 150)).join("\n---\n")}

Current entry they're working on: "${currentEntry || "Just starting..."}"

The user asks: "${aiInput}"

Provide sophisticated, creative responses that:
- Offer powerful journaling prompts that spark deep introspection
- Help them explore their thoughts through different perspectives (future self, observer, etc.)
- Suggest creative writing techniques to express themselves better
- Identify recurring themes and help them explore those deeper
- Recommend specific journaling frameworks (gratitude, stream of consciousness, letter writing, etc.)
- Help them overcome writer's block with targeted questions
- Encourage vulnerability and authentic self-expression
- Suggest ways to turn their reflections into actionable insights
- Be decisive and focused with clear next steps

Be inspiring, thought-provoking, and help them unlock deeper layers of self-understanding through their writing.`,
          context: "journal mentoring"
        }
      });

      if (error) throw error;

      const aiResponse = { role: "assistant", content: data?.enhanced || "I'm here to guide your journaling journey." };
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

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <h1 className="text-4xl font-bold mb-8 text-secondary">Journal</h1>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Journal Entry */}
          <Card className="glass glow-purple p-6">
            <h2 className="text-xl font-semibold mb-4 text-secondary flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Write Entry
            </h2>
            
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
                  className={`absolute top-3 right-3 ${
                    isListening ? "animate-pulse-glow text-secondary" : "text-muted-foreground hover:text-secondary"
                  }`}
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

            <Button onClick={saveEntry} disabled={!currentEntry.trim()} className="w-full glow-purple">
              Save Entry
            </Button>

            <div className="mt-6 pt-6 border-t border-border/50">
              <p className="text-sm text-muted-foreground mb-2">Recent Entries: {entries.length}</p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {entries.slice(-3).reverse().map((entry) => (
                  <div key={entry.id} className="text-xs p-3 bg-background/30 rounded-lg">
                    <p className="text-muted-foreground mb-1">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </p>
                    <p className="line-clamp-2">{entry.content}</p>
                  </div>
                ))}
              </div>
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
                aiMessages.map((msg, idx) => (
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
                ))
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
