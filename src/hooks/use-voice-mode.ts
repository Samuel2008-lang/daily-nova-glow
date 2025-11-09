import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseVoiceModeProps {
  onCommand: (command: string) => void;
  wakeWord?: string;
}

export const useVoiceMode = ({ onCommand, wakeWord = "nova" }: UseVoiceModeProps) => {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = "en-US";

        recognitionInstance.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
          console.log("Heard:", transcript);

          if (transcript.includes(wakeWord)) {
            const command = transcript.replace(wakeWord, "").trim();
            if (command) {
              setIsListening(true);
              onCommand(command);
              setTimeout(() => setIsListening(false), 2000);
            }
          }
        };

        recognitionInstance.onerror = (event: any) => {
          console.error("Voice recognition error:", event.error);
          if (event.error === "not-allowed") {
            setIsActive(false);
            toast({
              title: "Microphone access denied",
              description: "Please allow microphone access to use voice mode.",
              variant: "destructive",
            });
          }
        };

        recognitionInstance.onend = () => {
          if (isActive) {
            try {
              recognitionInstance.start();
            } catch (e) {
              console.error("Error restarting recognition:", e);
            }
          }
        };

        setRecognition(recognitionInstance);
      }
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  const startVoiceMode = useCallback(async () => {
    if (!recognition) {
      toast({
        title: "Not supported",
        description: "Voice recognition is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      recognition.start();
      setIsActive(true);
      toast({
        title: "Voice mode activated",
        description: `Say "${wakeWord}" followed by your command.`,
      });
    } catch (error) {
      console.error("Error starting voice mode:", error);
      toast({
        title: "Failed to start voice mode",
        description: "Please check microphone permissions.",
        variant: "destructive",
      });
    }
  }, [recognition, toast, wakeWord]);

  const stopVoiceMode = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsActive(false);
      toast({
        title: "Voice mode deactivated",
        description: "Voice commands are now off.",
      });
    }
  }, [recognition, toast]);

  return {
    isActive,
    isListening,
    startVoiceMode,
    stopVoiceMode,
  };
};
