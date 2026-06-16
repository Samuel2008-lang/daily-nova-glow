import { useState, useCallback, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { recordingState } from "@/lib/recording-state";

interface UseSpeechRecognitionProps {
  onResult: (transcript: string) => void;
  continuous?: boolean;
  autoEnhance?: boolean;
  context?: string;
}

/**
 * Lightweight, 100% offline text formatter.
 */
export function formatVoiceText(input: string): string {
  if (!input) return input;
  let t = input.trim();
  if (!t) return t;

  t = t.replace(/\s+/g, " ");
  t = t.replace(/\s+([,.!?;:])/g, "$1");
  t = t.replace(/([,.!?;:])(?=[^\s])/g, "$1 ");
  t = t.charAt(0).toUpperCase() + t.slice(1);
  t = t.replace(/([.!?]\s+)([a-z])/g, (_m, p1, p2) => p1 + p2.toUpperCase());
  t = t.replace(/\bi\b/g, "I");
  t = t.replace(/\bi'(m|ve|ll|d|re)\b/gi, (_m, suf) => "I'" + suf.toLowerCase());
  if (/[A-Za-z0-9]$/.test(t)) t += ".";

  return t;
}

/**
 * Native speech recognition using @capacitor-community/speech-recognition
 */
const useNativeSpeechRecognition = (onResult: (text: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const accumulatedRef = useRef<string>("");
  const listenerCleanupRef = useRef<(() => void) | null>(null);
  const stoppedRef = useRef(false);
  const finalizedRef = useRef(false);

  const finalize = useCallback(async () => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    const raw = accumulatedRef.current.trim();
    accumulatedRef.current = "";
    recordingState.set(false);
    if (raw) {
      onResult(formatVoiceText(raw));
    }
    setIsListening(false);
    setIsProcessing(false);
  }, [onResult]);

  const startListening = useCallback(async (_autoEnhance: boolean = false, _context?: string) => {
    try {
      const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");

      const { available } = await SpeechRecognition.available();
      if (!available) {
        toast({ title: "Not supported", description: "Speech recognition not available on this device.", variant: "destructive" });
        return;
      }

      const currentPerms = await SpeechRecognition.checkPermissions();
      if (currentPerms.speechRecognition !== "granted") {
        const perms = await SpeechRecognition.requestPermissions();
        if (perms.speechRecognition === "denied") {
          toast({ title: "Permission denied", description: "Please allow microphone access in your device settings.", variant: "destructive" });
          return;
        }
      }

      accumulatedRef.current = "";
      stoppedRef.current = false;
      finalizedRef.current = false;
      setIsListening(true);
      recordingState.set(true);
      toast({ title: "Listening…", description: "Tap the mic again to stop." });

      try {
        const partialListener = await SpeechRecognition.addListener("partialResults", (data: { matches?: string[] }) => {
          const text = data.matches?.[0]?.trim();
          if (text) accumulatedRef.current = text;
        });
        listenerCleanupRef.current?.();
        listenerCleanupRef.current = () => partialListener.remove();
        await SpeechRecognition.start({ language: "en-US", maxResults: 1, partialResults: true, popup: false });
      } catch (err) {
        if (!stoppedRef.current) console.error("Native speech error:", err);
      }
    } catch (error) {
      console.error("Native speech error:", error);
      setIsListening(false);
      setIsProcessing(false);
      toast({ title: "Error", description: "Speech recognition failed.", variant: "destructive" });
    }
  }, [toast, finalize]);

  const stopListening = useCallback(async () => {
    stoppedRef.current = true;
    recordingState.set(false);
    try {
      const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
      await SpeechRecognition.stop();
    } catch {}
    listenerCleanupRef.current?.();
    listenerCleanupRef.current = null;
    setTimeout(() => finalize(), 200);
  }, [finalize]);

  useEffect(() => () => {
    stoppedRef.current = true;
    recordingState.set(false);
    listenerCleanupRef.current?.();
    listenerCleanupRef.current = null;
    (async () => {
      try {
        const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
        await SpeechRecognition.stop();
      } catch {}
    })();
  }, []);

  return { isListening, isProcessing, isSupported: true, startListening, stopListening };
};

const useWebSpeechRecognition = (onResult: (text: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupported] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  });
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const stoppedByUserRef = useRef(false);
  const processedRef = useRef(false);
  const fullTranscriptRef = useRef<string>("");
  const capturedIndicesRef = useRef<Set<number>>(new Set());

  const emitAndReset = useCallback(async () => {
    if (processedRef.current) return;
    processedRef.current = true;
    const text = fullTranscriptRef.current.trim();
    fullTranscriptRef.current = "";
    capturedIndicesRef.current.clear();
    setIsListening(false);
    recordingState.set(false);
    if (!text) {
      setIsProcessing(false);
      return;
    }
    setIsProcessing(false);
    onResult(formatVoiceText(text));
  }, [onResult]);

  const startListening = useCallback(async (_autoEnhance: boolean = false, _context?: string) => {
    if (!isSupported) {
      toast({ title: "Not supported", description: "Speech recognition is not supported in your browser.", variant: "destructive" });
      return;
    }

    fullTranscriptRef.current = "";
    capturedIndicesRef.current.clear();
    processedRef.current = false;
    stoppedByUserRef.current = false;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      recordingState.set(true);
      recognitionRef.current = recognition;
    };

    recognition.onresult = (event: any) => {
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal && !capturedIndicesRef.current.has(i)) {
          capturedIndicesRef.current.add(i);
          const chunk = event.results[i][0].transcript.trim();
          if (chunk) fullTranscriptRef.current += (fullTranscriptRef.current ? " " : "") + chunk;
        }
      }
    };

    recognition.onend = () => {
      if (stoppedByUserRef.current) emitAndReset();
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        stoppedByUserRef.current = true;
        toast({ title: "Microphone denied", description: "Allow microphone access in browser settings.", variant: "destructive" });
        emitAndReset();
        return;
      }
      
      if (event.error === "no-speech" || event.error === "audio-capture" || event.error === "network") {
        return;
      }
      
      if (event.error !== "aborted") {
        console.error("Speech recognition error:", event.error);
      }
      emitAndReset();
    };

    try {
      recognition.start();
      toast({ title: "Listening…", description: "Tap the mic again when you're done." });
    } catch (error) {
      console.error("Error starting recognition:", error);
      setIsListening(false);
      toast({ title: "Error", description: "Failed to start speech recognition.", variant: "destructive" });
    }
  }, [isSupported, toast, emitAndReset]);

  const stopListening = useCallback(() => {
    stoppedByUserRef.current = true;
    recordingState.set(false);
    const inst = recognitionRef.current;
    if (inst) {
      try { inst.stop(); } catch {}
    } else {
      emitAndReset();
    }
  }, [emitAndReset]);

  useEffect(() => () => {
    stoppedByUserRef.current = true;
    recordingState.set(false);
    const inst = recognitionRef.current;
    if (inst) {
      try { inst.abort(); } catch {}
      try { inst.stop(); } catch {}
    }
  }, []);

  return { isListening, isProcessing, isSupported, startListening, stopListening };
};

export const useSpeechRecognition = ({ onResult }: UseSpeechRecognitionProps) => {
  if (Capacitor.isNativePlatform()) {
    return useNativeSpeechRecognition(onResult);
  }
  return useWebSpeechRecognition(onResult);
};
