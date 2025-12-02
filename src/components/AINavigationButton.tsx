import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useVoiceMode } from "@/hooks/use-voice-mode";
import { supabase } from "@/integrations/supabase/client";
import { Draggable } from "@/components/Draggable";
import { WakeWordIndicator } from "@/components/WakeWordIndicator";

export const AINavigationButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  const [lastCommand, setLastCommand] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const resumeWakeAfterManual = useRef(false);

  const cleanCommand = (raw: string) => {
    const wake = ["hey nova", "hey no va", "a nova", "hey know va"];
    let t = raw.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
    t = t.split(" ").filter((w, i, arr) => i === 0 || w !== arr[i - 1]).join(" ");
    for (const w of wake) {
      if (t.startsWith(w + " ")) t = t.slice(w.length).trim();
      else if (t === w) t = "";
    }
    return t;
  };

  const { isListening, startListening, stopListening } = useSpeechRecognition({
    onResult: (text) => {
      setTranscript(text);
    },
  });

  const { isActive: isVoiceModeActive, isListening: isWakeListening, startVoiceMode, stopVoiceMode } = useVoiceMode({
    onCommand: async (command) => {
      setLastCommand(command);
      await processCommand(command);
      setTimeout(() => setLastCommand(""), 3000);
    },
    wakeWord: "hey nova",
  });

  useEffect(() => {
    setIsWakeWordActive(isVoiceModeActive);
  }, [isVoiceModeActive]);

  useEffect(() => {
    // Auto-activate wake phrase listening on mount
    startVoiceMode().catch(() => {});
  }, []);

  const processCommand = async (command: string) => {
    const cleaned = cleanCommand(command);
    if (!cleaned) return;
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('navigate-command', {
        body: { command: cleaned }
      });

      if (error) throw error;

      const route = data?.route;
      if (route) {
        navigate(route);
        setIsOpen(false);
        toast({
          title: "Navigation successful",
          description: `Opening ${data.page}...`,
        });
      }
    } catch (error) {
      console.error("Navigation error:", error);
      toast({
        title: "Navigation Error",
        description: "Could not understand the command. Try saying 'open notes' or 'open diary'.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setTranscript("");
      if (resumeWakeAfterManual.current) {
        try { await startVoiceMode(); } catch {}
        resumeWakeAfterManual.current = false;
      }
    }
  };

  const handleVoiceClick = async () => {
    if (isListening && recognitionInstance) {
      await stopListening(recognitionInstance);
      setRecognitionInstance(null);
      const cmd = cleanCommand(transcript);
      if (cmd) {
        await processCommand(cmd);
      }
    } else {
      setTranscript("");
      if (isWakeWordActive) {
        stopVoiceMode();
        resumeWakeAfterManual.current = true;
      }
      const instance = await startListening(false, "navigation");
      setRecognitionInstance(instance);
    }
  };

  const toggleWakeWord = async () => {
    if (isWakeWordActive) {
      stopVoiceMode();
    } else {
      await startVoiceMode();
    }
  };

  return (
    <>
      {/* Wake Word Status Indicator */}
      <WakeWordIndicator 
        isActive={isWakeWordActive} 
        isListening={isWakeListening}
        lastCommand={lastCommand}
      />

      <Draggable storageKey="ai-fab-position" defaultRight="1rem" defaultBottom="5rem">
        <Button
          size="icon"
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg glow-purple cursor-pointer"
        >
          <Bot className="w-6 h-6" />
        </Button>
      </Draggable>

      <Draggable storageKey="mic-fab-position" defaultRight="1rem" defaultBottom="10.5rem">
        <Button
          size="icon"
          variant={isWakeWordActive ? "default" : "outline"}
          onClick={toggleWakeWord}
          className={`h-12 w-12 rounded-full shadow-lg cursor-pointer transition-all ${
            isWakeWordActive 
              ? "bg-primary animate-pulse ring-4 ring-primary/30" 
              : "bg-background hover:bg-muted"
          }`}
        >
          {isWakeWordActive ? (
            <Mic className="w-5 h-5 text-primary-foreground" />
          ) : (
            <MicOff className="w-5 h-5 text-muted-foreground" />
          )}
        </Button>
      </Draggable>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Bot className="w-6 h-6 text-secondary" />
              AI Navigation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Type or say commands like "open notes", "show my tasks", "go to diary", or "open habits"
            </p>
            
            {isWakeWordActive && (
              <div className="flex items-center gap-2 px-3 py-2 bg-secondary/20 rounded-lg">
                <div className="relative">
                  <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-2 h-2 bg-secondary rounded-full animate-ping" />
                </div>
                <span className="text-xs text-secondary font-medium">Wake word active — Say "hey nova" + command</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Input
                placeholder="Type a command (e.g., open journal)"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (transcript.trim()) processCommand(transcript);
                  }
                }}
              />
              <Button
                variant="default"
                onClick={() => transcript.trim() && processCommand(transcript)}
                disabled={isProcessing || !transcript.trim()}>
                Go
              </Button>
            </div>

            {transcript && isListening && (
              <div className="p-4 bg-background/50 rounded-lg">
                <p className="text-sm font-medium">You said:</p>
                <p className="text-foreground">{cleanCommand(transcript)}</p>
              </div>
            )}

            <Button
              onClick={handleVoiceClick}
              disabled={isProcessing}
              className={`w-full h-20 text-lg ${isListening ? "animate-pulse-glow" : ""}`}
              variant={isListening ? "default" : "outline"}
            >
              <Mic className="w-6 h-6 mr-2" />
              {isListening ? "Tap to process command" : isProcessing ? "Processing..." : "Start speaking"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
