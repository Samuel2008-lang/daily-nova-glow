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
          const raw = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
          // Normalize text: remove punctuation, collapse spaces, dedupe consecutive words
          const normalized = raw
            .replace(/[^\w\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          const tokens = normalized.split(" ").filter(Boolean);
          const deduped = tokens.filter((w, i, arr) => i === 0 || w !== arr[i - 1]).join(" ");

          // Build tolerant wake phrase matcher: allow repeated first token (e.g., "hey hey")
          const wake = wakeWord.toLowerCase().replace(/[^\w\s]/g, " ").trim();
          const wakeParts = wake.split(" ").filter(Boolean);
          let matchIndex = -1;
          let afterIndex = -1;

          if (wakeParts.length === 1) {
            const idx = deduped.indexOf(wakeParts[0]);
            if (idx !== -1) {
              matchIndex = idx;
              afterIndex = idx + wakeParts[0].length;
            }
          } else {
            // Example: hey (hey)* nova (handles repeated "hey")
            const first = wakeParts[0];
            const rest = wakeParts.slice(1).join("\\s+");
            const rx = new RegExp(`\\b${first}(?:\\s+${first})*\\s+${rest}\\b`);
            const m = deduped.match(rx);
            if (m && m.index !== undefined) {
              matchIndex = m.index;
              afterIndex = m.index + m[0].length;
            }
          }

          if (matchIndex !== -1) {
            const command = deduped.slice(afterIndex).trim();
            if (command) {
              setIsListening(true);
              onCommand(command);
              // brief cooldown visual only
              setTimeout(() => setIsListening(false), 1200);
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
      try {
        recognition.start();
        setIsActive(true);
        toast({
          title: "Voice mode activated",
          description: `Say "${wakeWord}" followed by your command.`,
        });
      } catch (e: any) {
        if (e.message?.includes('already started')) {
          // Already running, just mark as active
          setIsActive(true);
        } else {
          throw e;
        }
      }
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
