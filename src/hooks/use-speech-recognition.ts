import { useState, useEffect, useCallback, useRef } from "react";
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
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const lastResultAtRef = useRef<number>(0);
  const retriedRef = useRef(false);

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

    // Configure recognition
    recognition.continuous = true;
    recognition.interimResults = true; // capture interim to keep alive on long pauses
    recognition.lang = "en-US";

    let fullTranscript = "";
    retriedRef.current = false;

    // Reset any previous timers
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    recognition.onstart = () => {
      setIsListening(true);
      recognitionRef.current = recognition;
      lastResultAtRef.current = Date.now();
      // Auto-stop after 15s of silence to prevent premature processing on short pauses
      silenceTimerRef.current = window.setInterval(() => {
        const idle = Date.now() - lastResultAtRef.current;
        if (idle > 15000 && recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {}
        }
      }, 1000);
    };

    recognition.onresult = (event: any) => {
      lastResultAtRef.current = Date.now();
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          fullTranscript += res[0].transcript + " ";
        }
      }
    };

    const processTranscript = async () => {
      const text = fullTranscript.trim();
      if (!text) return;

      // Clean up duplicates like "hey hey hey" or repeated words from final chunks
      const cleaned = text
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter((w, i, arr) => i === 0 || w !== arr[i - 1])
        .join(" ");

      if (autoEnhance) {
        toast({ title: "Processing...", description: "Enhancing your speech with AI..." });
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          const { data, error } = await supabase.functions.invoke('enhance-text', {
            body: { text: cleaned, context }
          });
          if (!error && data?.enhanced) {
            onResult(data.enhanced);
            toast({ title: "Speech enhanced", description: "Your speech has been corrected and saved." });
            return;
          }
        } catch (e) {
          console.error("Enhancement error:", e);
        }
        onResult(cleaned);
        toast({ title: "Speech captured", description: "Using original text." });
      } else {
        onResult(cleaned);
        toast({ title: "Speech captured", description: "Your speech has been converted to text." });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      recognitionRef.current = null;
      processTranscript();
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

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
      } else if (event.error === "network" && !retriedRef.current) {
        // Attempt one auto-retry for transient network errors
        retriedRef.current = true;
        try {
          recognition.stop();
          setTimeout(() => {
            try { recognition.start(); } catch {}
          }, 600);
          return;
        } catch {}
        toast({
          title: "Network error",
          description: "Network issue with speech service. Check connection and try again.",
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
      toast({ title: "Error", description: "Failed to start speech recognition.", variant: "destructive" });
    }
  }, [isSupported, onResult, toast]);

  const stopListening = useCallback((recognitionInstance?: any) => {
    const inst = recognitionInstance || recognitionRef.current;
    if (inst) {
      try { inst.stop(); } catch {}
    }
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
  };
};
