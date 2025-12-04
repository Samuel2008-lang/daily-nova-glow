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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const audioBufferRef = useRef<string[]>([]);
  const retriedRef = useRef(false);

  // Silence threshold in milliseconds (1.4 seconds as requested)
  const SILENCE_THRESHOLD = 1400;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  const processAndEnhanceText = async (text: string, context?: string) => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke('enhance-text', {
        body: { text, context }
      });
      
      if (!error && data?.enhanced) {
        onResult(data.enhanced);
        toast({ title: "Speech captured", description: "Your speech has been enhanced and saved." });
      } else {
        onResult(text);
        toast({ title: "Speech captured", description: "Using original text." });
      }
    } catch (e) {
      console.error("Enhancement error:", e);
      onResult(text);
      toast({ title: "Speech captured", description: "Using original text." });
    } finally {
      setIsProcessing(false);
    }
  };

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
    recognition.interimResults = true;
    recognition.lang = "en-US";

    audioBufferRef.current = [];
    retriedRef.current = false;
    lastSpeechTimeRef.current = Date.now();

    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    recognition.onstart = () => {
      setIsListening(true);
      recognitionRef.current = recognition;
      lastSpeechTimeRef.current = Date.now();
      
      // VAD-style silence detection
      silenceTimerRef.current = window.setInterval(() => {
        const timeSinceLastSpeech = Date.now() - lastSpeechTimeRef.current;
        
        // If silence exceeds threshold, stop and process
        if (timeSinceLastSpeech > SILENCE_THRESHOLD && audioBufferRef.current.length > 0) {
          try {
            recognition.stop();
          } catch {}
        }
      }, 200);
    };

    recognition.onresult = (event: any) => {
      // Update last speech time on any result
      lastSpeechTimeRef.current = Date.now();
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          const transcript = res[0].transcript.trim();
          if (transcript) {
            // Add to buffer instead of immediately processing
            audioBufferRef.current.push(transcript);
          }
        }
      }
    };

    recognition.onend = async () => {
      setIsListening(false);
      
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      recognitionRef.current = null;
      
      // Process the full audio buffer
      const fullText = audioBufferRef.current.join(" ").trim();
      audioBufferRef.current = [];
      
      if (fullText) {
        if (autoEnhance) {
          await processAndEnhanceText(fullText, context);
        } else {
          onResult(fullText);
          toast({ title: "Speech captured", description: "Your speech has been converted to text." });
        }
      }
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
      } else if (event.error !== "aborted") {
        toast({
          title: "Recognition error",
          description: "An error occurred during speech recognition.",
          variant: "destructive",
        });
      }
    };

    try {
      recognition.start();
      toast({ title: "Listening...", description: "Speak now. Recording will stop after 1.4s of silence." });
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
    isProcessing,
    isSupported,
    startListening,
    stopListening,
  };
};
