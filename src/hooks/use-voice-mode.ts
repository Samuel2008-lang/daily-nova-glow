import { useState, useCallback, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseVoiceModeProps {
  onCommand: (command: string) => void;
  wakeWord?: string;
}

export const useVoiceMode = ({ onCommand, wakeWord = "nova" }: UseVoiceModeProps) => {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isActiveRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = "en-US";
        recognitionInstance.maxAlternatives = 3;

        recognitionInstance.onresult = (event: any) => {
          // Get the latest result
          const result = event.results[event.results.length - 1];
          if (!result.isFinal) return;
          
          const raw = result[0].transcript.toLowerCase().trim();
          console.log("Voice mode heard:", raw);
          
          // Normalize: remove punctuation, collapse spaces
          const normalized = raw
            .replace(/[^\w\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          
          // Dedupe consecutive words
          const tokens = normalized.split(" ").filter(Boolean);
          const deduped = tokens.filter((w, i, arr) => i === 0 || w !== arr[i - 1]).join(" ");
          
          console.log("Normalized:", deduped);

          // Wake word patterns to check
          const wakePatterns = [
            "hey nova",
            "hey no va", 
            "a nova",
            "hey know va",
            "henova",
            "hey novo",
            "nova"
          ];

          let command = "";
          for (const pattern of wakePatterns) {
            const patternIndex = deduped.indexOf(pattern);
            if (patternIndex !== -1) {
              command = deduped.slice(patternIndex + pattern.length).trim();
              break;
            }
          }

          // Also try regex for flexible matching
          if (!command) {
            const flexMatch = deduped.match(/(?:hey\s*)?no+v+a+\s+(.+)/i);
            if (flexMatch) {
              command = flexMatch[1].trim();
            }
          }

          if (command) {
            console.log("Wake word detected! Command:", command);
            setIsListening(true);
            onCommand(command);
            setTimeout(() => setIsListening(false), 1500);
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
          } else if (event.error === "no-speech") {
            // Ignore no-speech errors, just restart
            console.log("No speech detected, continuing...");
          }
        };

        recognitionInstance.onend = () => {
          console.log("Recognition ended, isActive:", isActiveRef.current);
          if (isActiveRef.current) {
            setTimeout(() => {
              if (isActiveRef.current && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                  console.log("Recognition restarted");
                } catch (e: any) {
                  if (!e.message?.includes('already started')) {
                    console.error("Error restarting recognition:", e);
                  }
                }
              }
            }, 100);
          }
        };

        recognitionInstance.onstart = () => {
          console.log("Recognition started");
        };

        recognitionRef.current = recognitionInstance;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [onCommand, toast, wakeWord]);

  const startVoiceMode = useCallback(async () => {
    if (!recognitionRef.current) {
      toast({
        title: "Not supported",
        description: "Voice recognition is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if (isActiveRef.current) {
        console.log("Voice mode already active");
        return;
      }

      try {
        recognitionRef.current.start();
        setIsActive(true);
        console.log("Voice mode started");
        toast({
          title: "Voice mode activated",
          description: `Say "Hey Nova" followed by your command.`,
        });
      } catch (e: any) {
        if (e.message?.includes('already started')) {
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
  }, [toast]);

  const stopVoiceMode = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsActive(false);
      console.log("Voice mode stopped");
      toast({
        title: "Voice mode deactivated",
        description: "Voice commands are now off.",
      });
    }
  }, [toast]);

  return {
    isActive,
    isListening,
    startVoiceMode,
    stopVoiceMode,
  };
};
