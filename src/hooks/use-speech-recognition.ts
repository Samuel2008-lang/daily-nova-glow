import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";

interface UseSpeechRecognitionProps {
  onResult: (transcript: string) => void;
  continuous?: boolean;
  autoEnhance?: boolean;
  context?: string;
}

/**
 * Native speech recognition using @capacitor-community/speech-recognition
 */
const useNativeSpeechRecognition = (onResult: (text: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const startListening = useCallback(async (_autoEnhance: boolean = false, _context?: string) => {
    try {
      const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");

      const { available } = await SpeechRecognition.available();
      if (!available) {
        toast({ title: "Not supported", description: "Speech recognition not available on this device.", variant: "destructive" });
        return;
      }

      // Request permissions
      const perms = await SpeechRecognition.requestPermissions();
      if (perms.speechRecognition === "denied") {
        toast({ title: "Permission denied", description: "Please allow microphone access in your device settings.", variant: "destructive" });
        return;
      }

      setIsListening(true);
      toast({ title: "Listening...", description: "Speak now." });

      const result = await SpeechRecognition.start({
        language: "en-US",
        maxResults: 5,
        partialResults: false,
        popup: false,
      });

      setIsListening(false);

      const text = result.matches?.[0]?.trim();
      if (!text) {
        toast({ title: "No speech detected", description: "Please try again.", variant: "destructive" });
        return;
      }

      // Fully offline — pass raw transcript through, no cloud enhancement.
      onResult(text);
    } catch (error) {
      console.error("Native speech error:", error);
      setIsListening(false);
      setIsProcessing(false);
      toast({ title: "Error", description: "Speech recognition failed.", variant: "destructive" });
    }
  }, [onResult, toast]);

  const stopListening = useCallback(async (recognitionInstance?: any) => {
    try {
      const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
      await SpeechRecognition.stop();
    } catch {}
    setIsListening(false);
  }, []);

  return { isListening, isProcessing, isSupported: true, startListening, stopListening };
};

/**
 * Web speech recognition using Web Speech API
 */
const useWebSpeechRecognition = (onResult: (text: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupported] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  });
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const isProcessingRef = useRef(false);
  const processedRef = useRef(false);
  const fullTranscriptRef = useRef<string>("");
  const capturedIndicesRef = useRef<Set<number>>(new Set());

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
    // Fully offline — return raw Web Speech transcript, no cloud enhancement.
    try {
      onResult(text);
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
      fullTranscriptRef.current = "";
      capturedIndicesRef.current.clear();
    }
  }, [onResult, cleanup]);

  const startListening = useCallback(async (_autoEnhance: boolean = false, _context?: string) => {
    if (!isSupported) {
      toast({ title: "Not supported", description: "Speech recognition is not supported in your browser.", variant: "destructive" });
      return;
    }

    fullTranscriptRef.current = "";
    capturedIndicesRef.current.clear();
    processedRef.current = false;
    isProcessingRef.current = false;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    cleanup();

    recognition.onstart = () => {
      setIsListening(true);
      recognitionRef.current = recognition;
      lastSpeechTimeRef.current = Date.now();
      silenceTimerRef.current = window.setInterval(() => {
        if (Date.now() - lastSpeechTimeRef.current > 1400 && fullTranscriptRef.current.trim()) {
          stopAndProcess();
        }
      }, 200);
    };

    recognition.onresult = (event: any) => {
      lastSpeechTimeRef.current = Date.now();
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal && !capturedIndicesRef.current.has(i)) {
          capturedIndicesRef.current.add(i);
          const chunk = event.results[i][0].transcript.trim();
          if (chunk) fullTranscriptRef.current += (fullTranscriptRef.current ? " " : "") + chunk;
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
      if (fullTranscriptRef.current.trim() && !processedRef.current) { stopAndProcess(); return; }
      setIsListening(false);
      isProcessingRef.current = false;
      if (event.error === "no-speech") toast({ title: "No speech detected", description: "Please try again.", variant: "destructive" });
      else if (event.error === "not-allowed") toast({ title: "Microphone denied", description: "Allow microphone access.", variant: "destructive" });
      else if (event.error !== "aborted") toast({ title: "Recognition error", description: "An error occurred.", variant: "destructive" });
    };

    try {
      recognition.start();
      toast({ title: "Listening...", description: "Speak now. Stops after 1.4s of silence." });
    } catch (error) {
      console.error("Error starting recognition:", error);
      setIsListening(false);
      toast({ title: "Error", description: "Failed to start speech recognition.", variant: "destructive" });
    }
  }, [isSupported, toast, stopAndProcess, cleanup]);

  const stopListening = useCallback((recognitionInstance?: any) => {
    const inst = recognitionInstance || recognitionRef.current;
    if (inst) {
      try { inst.stop(); } catch {}
    }
    if (fullTranscriptRef.current.trim() && !processedRef.current) stopAndProcess();
  }, [stopAndProcess]);

  return { isListening, isProcessing, isSupported, startListening, stopListening };
};

/**
 * Main hook - picks native or web implementation based on platform
 */
export const useSpeechRecognition = ({ onResult }: UseSpeechRecognitionProps) => {
  if (Capacitor.isNativePlatform()) {
    return useNativeSpeechRecognition(onResult);
  }
  return useWebSpeechRecognition(onResult);
};
