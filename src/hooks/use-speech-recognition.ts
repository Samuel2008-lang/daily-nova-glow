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
}: UseSpeechRecognitionProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const isProcessingRef = useRef(false);
  const processedRef = useRef(false);
  // Store the full transcript built from all final results
  const fullTranscriptRef = useRef<string>("");
  // Track which result indices we've already captured
  const capturedIndicesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopAndProcess = useCallback(async () => {
    if (isProcessingRef.current || processedRef.current) return;
    isProcessingRef.current = true;
    processedRef.current = true;

    cleanup();

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    const text = fullTranscriptRef.current.trim();
    if (!text) {
      setIsListening(false);
      setIsProcessing(false);
      isProcessingRef.current = false;
      return;
    }

    setIsListening(false);
    setIsProcessing(true);

    // Try AI enhancement, fall back to raw text
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("enhance-text", {
        body: { text, context: "general" },
      });

      if (!error && data?.enhanced) {
        onResult(data.enhanced);
      } else {
        onResult(text);
      }
    } catch {
      // AI unavailable — deliver raw text
      onResult(text);
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
      fullTranscriptRef.current = "";
      capturedIndicesRef.current.clear();
    }
  }, [onResult, cleanup]);

  const startListening = useCallback(
    async (_autoEnhance: boolean = false, _context?: string) => {
      if (!isSupported) {
        toast({
          title: "Not supported",
          description: "Speech recognition is not supported in your browser.",
          variant: "destructive",
        });
        return;
      }

      // Reset
      fullTranscriptRef.current = "";
      capturedIndicesRef.current.clear();
      processedRef.current = false;
      isProcessingRef.current = false;

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = false; // KEY: only get final results — no duplicates
      recognition.lang = "en-US";

      cleanup();

      recognition.onstart = () => {
        setIsListening(true);
        recognitionRef.current = recognition;
        lastSpeechTimeRef.current = Date.now();

        silenceTimerRef.current = window.setInterval(() => {
          const silence = Date.now() - lastSpeechTimeRef.current;
          if (silence > 1400 && fullTranscriptRef.current.trim()) {
            stopAndProcess();
          }
        }, 200);
      };

      recognition.onresult = (event: any) => {
        lastSpeechTimeRef.current = Date.now();

        // Build transcript from ALL final results, but skip already-captured indices
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal && !capturedIndicesRef.current.has(i)) {
            capturedIndicesRef.current.add(i);
            const chunk = event.results[i][0].transcript.trim();
            if (chunk) {
              fullTranscriptRef.current += (fullTranscriptRef.current ? " " : "") + chunk;
            }
          }
        }
      };

      recognition.onend = () => {
        if (!processedRef.current && fullTranscriptRef.current.trim()) {
          stopAndProcess();
        } else {
          setIsListening(false);
          cleanup();
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        cleanup();

        if (fullTranscriptRef.current.trim() && !processedRef.current) {
          stopAndProcess();
          return;
        }

        setIsListening(false);
        isProcessingRef.current = false;

        if (event.error === "no-speech") {
          toast({ title: "No speech detected", description: "Please try again.", variant: "destructive" });
        } else if (event.error === "not-allowed") {
          toast({ title: "Microphone denied", description: "Allow microphone access.", variant: "destructive" });
        } else if (event.error !== "aborted") {
          toast({ title: "Recognition error", description: "An error occurred.", variant: "destructive" });
        }
      };

      try {
        recognition.start();
        toast({ title: "Listening...", description: "Speak now. Stops after 1.4s of silence." });
        return recognition;
      } catch (error) {
        console.error("Error starting recognition:", error);
        setIsListening(false);
        toast({ title: "Error", description: "Failed to start speech recognition.", variant: "destructive" });
      }
    },
    [isSupported, toast, stopAndProcess, cleanup]
  );

  const stopListening = useCallback(
    (recognitionInstance?: any) => {
      const inst = recognitionInstance || recognitionRef.current;
      if (inst) {
        try { inst.stop(); } catch {}
      }
      if (fullTranscriptRef.current.trim() && !processedRef.current) {
        stopAndProcess();
      }
    },
    [stopAndProcess]
  );

  return { isListening, isProcessing, isSupported, startListening, stopListening };
};
