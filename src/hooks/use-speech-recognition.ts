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
  const audioBufferRef = useRef<string>("");
  const isProcessingRef = useRef(false);
  const processedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  const stopAndProcess = useCallback(async () => {
    // Prevent double processing
    if (isProcessingRef.current || processedRef.current) return;
    isProcessingRef.current = true;
    processedRef.current = true;
    
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    const text = audioBufferRef.current.trim();
    if (!text) {
      setIsListening(false);
      setIsProcessing(false);
      isProcessingRef.current = false;
      return;
    }

    setIsListening(false);
    setIsProcessing(true);

    // Enhance the text with AI
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke('enhance-text', {
        body: { text, context: "general" }
      });
      
      if (!error && data?.enhanced) {
        onResult(data.enhanced);
        toast({ title: "Speech captured", description: "Your speech has been enhanced and added." });
      } else {
        onResult(text);
        toast({ title: "Speech captured", description: "Your speech has been converted to text." });
      }
    } catch (e) {
      console.error("Enhancement error:", e);
      onResult(text);
      toast({ title: "Speech captured", description: "Your speech has been converted to text." });
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
      audioBufferRef.current = "";
    }
  }, [onResult, toast]);

  const startListening = useCallback(async (autoEnhance: boolean = false, context?: string) => {
    if (!isSupported) {
      toast({
        title: "Not supported",
        description: "Speech recognition is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }

    // Reset state
    audioBufferRef.current = "";
    processedRef.current = false;
    isProcessingRef.current = false;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    recognition.onstart = () => {
      setIsListening(true);
      recognitionRef.current = recognition;
      lastSpeechTimeRef.current = Date.now();
      
      // Start silence detection - check every 200ms
      silenceTimerRef.current = window.setInterval(() => {
        const silenceDuration = Date.now() - lastSpeechTimeRef.current;
        // 1.4 seconds of silence triggers processing
        if (silenceDuration > 1400 && audioBufferRef.current.trim()) {
          stopAndProcess();
        }
      }, 200);
    };

    recognition.onresult = (event: any) => {
      lastSpeechTimeRef.current = Date.now();
      
      let finalTranscript = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript.trim();
          // Deduplicate: skip if this exact phrase was already added
          if (transcript && !audioBufferRef.current.trim().endsWith(transcript)) {
            finalTranscript += transcript + " ";
          }
        }
      }
      
      // Only add unique final transcripts to the buffer
      if (finalTranscript.trim()) {
        audioBufferRef.current += finalTranscript;
      }
    };

    recognition.onend = () => {
      // Only process if we haven't already
      if (!processedRef.current && audioBufferRef.current.trim()) {
        stopAndProcess();
      } else {
        setIsListening(false);
        if (silenceTimerRef.current) {
          clearInterval(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      // If we have some text, still try to process it
      if (audioBufferRef.current.trim() && !processedRef.current) {
        stopAndProcess();
        return;
      }

      setIsListening(false);
      isProcessingRef.current = false;

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
  }, [isSupported, toast, stopAndProcess]);

  const stopListening = useCallback((recognitionInstance?: any) => {
    const inst = recognitionInstance || recognitionRef.current;
    if (inst) {
      try { 
        inst.stop(); 
      } catch {}
    }
    // Force process if we have content
    if (audioBufferRef.current.trim() && !processedRef.current) {
      stopAndProcess();
    }
  }, [stopAndProcess]);

  return {
    isListening,
    isProcessing,
    isSupported,
    startListening,
    stopListening,
  };
};