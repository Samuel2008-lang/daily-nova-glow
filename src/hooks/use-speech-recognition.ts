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
  const finalTranscriptsRef = useRef<Set<string>>(new Set());

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
    recognition.interimResults = false; // Only get final results to avoid duplicates
    recognition.lang = "en-US";

    finalTranscriptsRef.current = new Set();
    retriedRef.current = false;

    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    recognition.onstart = () => {
      setIsListening(true);
      recognitionRef.current = recognition;
      lastResultAtRef.current = Date.now();
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
          const transcript = res[0].transcript.trim();
          // Only add if we haven't seen this exact transcript before
          if (transcript && !finalTranscriptsRef.current.has(transcript)) {
            finalTranscriptsRef.current.add(transcript);
          }
        }
      }
    };

    const processTranscript = async () => {
      // Join all unique transcripts
      const text = Array.from(finalTranscriptsRef.current).join(" ").trim();
      if (!text) return;

      if (autoEnhance) {
        toast({ title: "Processing...", description: "Enhancing your speech with AI..." });
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          const { data, error } = await supabase.functions.invoke('enhance-text', {
            body: { text, context }
          });
          if (!error && data?.enhanced) {
            onResult(data.enhanced);
            toast({ title: "Speech enhanced", description: "Your speech has been corrected and saved." });
            return;
          }
        } catch (e) {
          console.error("Enhancement error:", e);
        }
        onResult(text);
        toast({ title: "Speech captured", description: "Using original text." });
      } else {
        onResult(text);
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
