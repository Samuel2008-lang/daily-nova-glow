import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseSpeechRecognitionProps {
  onResult: (transcript: string) => void;
  continuous?: boolean;
  autoEnhance?: boolean;
  context?: string;
}

export const useSpeechRecognition = ({
  onResult,
  continuous = false,
}: UseSpeechRecognitionProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  const startListening = useCallback(async (autoEnhance: boolean = false, context?: string) => {
    if (!isSupported) {
      toast({
        title: "Not supported",
        description: "Speech recognition is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    let fullTranscript = "";
    
    recognition.onresult = async (event: any) => {
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          fullTranscript += event.results[i][0].transcript + " ";
        }
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      
      if (fullTranscript.trim() && autoEnhance) {
        toast({
          title: "Processing...",
          description: "Enhancing your speech with AI...",
        });

        (async () => {
          try {
            const { supabase } = await import("@/integrations/supabase/client");
            const { data, error } = await supabase.functions.invoke('enhance-text', {
              body: { text: fullTranscript.trim(), context }
            });

            if (!error && data?.enhanced) {
              onResult(data.enhanced);
              toast({
                title: "Speech enhanced",
                description: "Your speech has been corrected and saved.",
              });
            } else {
              onResult(fullTranscript.trim());
              toast({
                title: "Speech captured",
                description: "Could not enhance. Using original text.",
              });
            }
          } catch (error) {
            console.error("Enhancement error:", error);
            onResult(fullTranscript.trim());
            toast({
              title: "Speech captured",
              description: "Enhancement failed. Using original text.",
            });
          }
        })();
      } else if (fullTranscript.trim()) {
        onResult(fullTranscript.trim());
        toast({
          title: "Speech captured",
          description: "Your speech has been converted to text.",
        });
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      
      if (event.error === "no-speech") {
        toast({
          title: "No speech detected",
          description: "Please try again and speak clearly.",
          variant: "destructive",
        });
      } else if (event.error === "not-allowed") {
        toast({
          title: "Microphone access denied",
          description: "Please allow microphone access to use voice input.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Recognition error",
          description: "An error occurred during speech recognition.",
          variant: "destructive",
        });
      }
    };

    try {
      recognition.start();
      return recognition;
    } catch (error) {
      console.error("Error starting recognition:", error);
      setIsListening(false);
      toast({
        title: "Error",
        description: "Failed to start speech recognition.",
        variant: "destructive",
      });
    }
  }, [isSupported, continuous, onResult, toast]);

  const stopListening = useCallback((recognitionInstance: any) => {
    if (recognitionInstance) {
      recognitionInstance.stop();
    }
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
  };
};
