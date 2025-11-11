import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useVoiceMode } from "@/hooks/use-voice-mode";
import { supabase } from "@/integrations/supabase/client";

export const AINavigationButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const { isListening, startListening, stopListening } = useSpeechRecognition({
    onResult: (text) => {
      setTranscript(text);
    },
  });

  const { isActive: isVoiceModeActive, startVoiceMode, stopVoiceMode } = useVoiceMode({
    onCommand: async (command) => {
      await processCommand(command);
    },
    wakeWord: "hey nova"
  });

  useEffect(() => {
    setIsWakeWordActive(isVoiceModeActive);
  }, [isVoiceModeActive]);

  const processCommand = async (command: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('navigate-command', {
        body: { command }
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
    }
  };

  const handleVoiceClick = async () => {
    if (isListening && recognitionInstance) {
      await stopListening(recognitionInstance);
      setRecognitionInstance(null);
      if (transcript.trim()) {
        await processCommand(transcript);
      }
    } else {
      setTranscript("");
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
      <div className="fixed bottom-20 md:bottom-8 right-4 z-50 flex flex-col gap-2 items-end">
        <Button
          size="icon"
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg glow-purple"
        >
          <Bot className="w-6 h-6" />
        </Button>
        
        <Button
          size="icon"
          variant={isWakeWordActive ? "default" : "outline"}
          onClick={toggleWakeWord}
          className={`h-10 w-10 rounded-full shadow-lg ${isWakeWordActive ? "animate-pulse-glow" : ""}`}
        >
          {isWakeWordActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </Button>
      </div>

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
              <div className="flex items-center gap-2 px-3 py-2 bg-secondary/20 rounded-lg animate-pulse-glow">
                <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                <span className="text-xs text-secondary font-medium">Wake word active - Say "hey nova" + command</span>
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
                disabled={isProcessing || !transcript.trim()}
              >
                Go
              </Button>
            </div>

            {transcript && isListening && (
              <div className="p-4 bg-background/50 rounded-lg">
                <p className="text-sm font-medium">You said:</p>
                <p className="text-foreground">{transcript}</p>
              </div>
            )}

            <Button
              onClick={handleVoiceClick}
              disabled={isProcessing}
              className={`w-full h-20 text-lg ${
                isListening ? "animate-pulse-glow" : ""
              }`}
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
