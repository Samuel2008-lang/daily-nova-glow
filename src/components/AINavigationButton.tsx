import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { supabase } from "@/integrations/supabase/client";

export const AINavigationButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const { isListening, startListening, stopListening } = useSpeechRecognition({
    onResult: (text) => {
      setTranscript(text);
    },
  });

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
    if (isListening) {
      await stopListening(null);
      if (transcript.trim()) {
        await processCommand(transcript);
      }
    } else {
      setTranscript("");
      await startListening(false, "navigation");
    }
  };

  return (
    <>
      <Button
        size="icon"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 md:bottom-8 right-4 h-14 w-14 rounded-full shadow-lg glow-purple z-50"
      >
        <Bot className="w-6 h-6" />
      </Button>

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
              Say commands like "open notes", "show my tasks", "go to diary", or "open habits"
            </p>

            {transcript && (
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
