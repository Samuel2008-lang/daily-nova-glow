import { useState, useCallback, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { recordingState } from "@/lib/recording-state";
import { formatVoiceText } from "@/lib/speech-format";
import { applySpeechCorrections, extractCorrections, recordSpeechCorrection } from "@/lib/speech-corrections";

export { formatVoiceText } from "@/lib/speech-format";

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
  const accumulatedRef = useRef<string>("");
  const emittedRef = useRef<string[]>([]);
  const listenerCleanupRef = useRef<(() => void) | null>(null);
  const stopFallbackRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);
  const finalizedRef = useRef(false);

  // Compare what the mic produced with what the user finally saved, so the
  // personal corrections dictionary learns their own names, slang and spelling.
  const learnCorrections = useCallback(async (finalText: string) => {
    const segments = emittedRef.current;
    emittedRef.current = [];
    for (const segment of segments) {
      for (const fix of extractCorrections(segment, finalText)) {
        await recordSpeechCorrection(fix.heard, fix.corrected);
      }
    }
  }, []);

  const finalize = useCallback(async () => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    if (stopFallbackRef.current) {
      window.clearTimeout(stopFallbackRef.current);
      stopFallbackRef.current = null;
    }
    const raw = accumulatedRef.current.trim();
    accumulatedRef.current = "";
    recordingState.set(false);
    if (raw) {
      const formatted = formatVoiceText(raw);
      const corrected = await applySpeechCorrections(formatted);
      emittedRef.current.push(corrected);
      onResult(corrected);
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
      emittedRef.current = [];
      stoppedRef.current = false;
      finalizedRef.current = false;
      if (stopFallbackRef.current) window.clearTimeout(stopFallbackRef.current);
      setIsListening(true);
      setIsProcessing(false);
      recordingState.set(true);
      toast({ title: "Listening…", description: "Tap the mic again to stop." });

      try {
        const partialListener = await SpeechRecognition.addListener("partialResults", (data: { matches?: string[] }) => {
          const text = data.matches?.[0]?.trim();
          if (text) accumulatedRef.current = text;
        });
        const stateListener = await SpeechRecognition.addListener("listeningState", (data: { status?: "started" | "stopped" }) => {
          if (data.status === "stopped" && stoppedRef.current) finalize();
        });
        listenerCleanupRef.current?.();
        listenerCleanupRef.current = () => {
          partialListener.remove();
          stateListener.remove();
        };
        await SpeechRecognition.start({ language: "en-US", maxResults: 1, partialResults: true, popup: false });
      } catch (err) {
        if (!stoppedRef.current) console.error("Native speech error:", err);
      }
    } catch (error) {
      console.error("Native speech error:", error);
      setIsListening(false);
      setIsProcessing(false);
      recordingState.set(false);
      toast({ title: "Error", description: "Speech recognition failed.", variant: "destructive" });
    }
  }, [toast, finalize]);

  const stopListening = useCallback(async () => {
    if (finalizedRef.current) return;
    stoppedRef.current = true;
    recordingState.set(false);
    setIsListening(false);
    setIsProcessing(true);
    if (stopFallbackRef.current) window.clearTimeout(stopFallbackRef.current);
    stopFallbackRef.current = window.setTimeout(() => finalize(), 900);
    try {
      const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
      await SpeechRecognition.stop();
    } catch {}
    window.setTimeout(() => {
      listenerCleanupRef.current?.();
      listenerCleanupRef.current = null;
      finalize();
    }, 120);
  }, [finalize]);

  useEffect(() => () => {
    stoppedRef.current = true;
    recordingState.set(false);
    if (stopFallbackRef.current) window.clearTimeout(stopFallbackRef.current);
    listenerCleanupRef.current?.();
    listenerCleanupRef.current = null;
    (async () => {
      try {
        const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
        await SpeechRecognition.stop();
      } catch {}
    })();
  }, []);

  return { isListening, isProcessing, isSupported: true, startListening, stopListening, learnCorrections };
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
  const stopFallbackRef = useRef<number | null>(null);
  const fullTranscriptRef = useRef<string>("");
  const latestInterimRef = useRef<string>("");
  const capturedIndicesRef = useRef<Set<number>>(new Set());
  const emittedRef = useRef<string[]>([]);

  // Compare what the mic produced with what the user finally saved, so the
  // personal corrections dictionary learns their own names, slang and spelling.
  const learnCorrections = useCallback(async (finalText: string) => {
    const segments = emittedRef.current;
    emittedRef.current = [];
    for (const segment of segments) {
      for (const fix of extractCorrections(segment, finalText)) {
        await recordSpeechCorrection(fix.heard, fix.corrected);
      }
    }
  }, []);

  const emitAndReset = useCallback(async () => {
    if (processedRef.current) return;
    processedRef.current = true;
    if (stopFallbackRef.current) {
      window.clearTimeout(stopFallbackRef.current);
      stopFallbackRef.current = null;
    }
    const text = (fullTranscriptRef.current.trim() || latestInterimRef.current.trim());
    fullTranscriptRef.current = "";
    latestInterimRef.current = "";
    capturedIndicesRef.current.clear();
    setIsListening(false);
    recordingState.set(false);
    if (!text) {
      setIsProcessing(false);
      return;
    }
    setIsProcessing(false);
    const finalText = await applySpeechCorrections(formatVoiceText(text));
    emittedRef.current.push(finalText);
    onResult(finalText);
  }, [onResult]);

  const startListening = useCallback(async (_autoEnhance: boolean = false, _context?: string) => {
    if (!isSupported) {
      toast({ title: "Not supported", description: "Speech recognition is not supported in your browser.", variant: "destructive" });
      return;
    }

    fullTranscriptRef.current = "";
    latestInterimRef.current = "";
    capturedIndicesRef.current.clear();
    emittedRef.current = [];
    processedRef.current = false;
    stoppedByUserRef.current = false;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      recordingState.set(true);
      recognitionRef.current = recognition;
    };

    recognition.onresult = (event: any) => {
      for (let i = 0; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript.trim();
        if (event.results[i].isFinal && !capturedIndicesRef.current.has(i)) {
          capturedIndicesRef.current.add(i);
          if (chunk) fullTranscriptRef.current += (fullTranscriptRef.current ? " " : "") + chunk;
        } else if (!event.results[i].isFinal && chunk) {
          // Keep the latest interim text so a fast Stop tap still produces transcription.
          latestInterimRef.current = chunk;
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
        if (stoppedByUserRef.current) emitAndReset();
        return;
      }
      
      if (event.error !== "aborted") {
        console.error("Speech recognition error:", event.error);
      }
      emitAndReset();
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      toast({ title: "Listening…", description: "Tap the mic again when you're done." });
    } catch (error) {
      console.error("Error starting recognition:", error);
      setIsListening(false);
      toast({ title: "Error", description: "Failed to start speech recognition.", variant: "destructive" });
    }
  }, [isSupported, toast, emitAndReset]);

  const stopListening = useCallback(() => {
    if (processedRef.current) return;
    stoppedByUserRef.current = true;
    recordingState.set(false);
    setIsListening(false);
    setIsProcessing(true);
    const inst = recognitionRef.current;
    if (inst) {
      try { inst.stop(); } catch {}
      // Hard fallback: if onend never fires (happens in some Android WebViews),
      // force-finalize after 600ms so the mic toggle is never stuck on "Listening…".
      if (stopFallbackRef.current) window.clearTimeout(stopFallbackRef.current);
      stopFallbackRef.current = window.setTimeout(() => {
        try { inst.abort(); } catch {}
        emitAndReset();
      }, 900);
    } else {
      emitAndReset();
    }
  }, [emitAndReset]);

  useEffect(() => () => {
    stoppedByUserRef.current = true;
    recordingState.set(false);
    if (stopFallbackRef.current) window.clearTimeout(stopFallbackRef.current);
    const inst = recognitionRef.current;
    if (inst) {
      try { inst.abort(); } catch {}
      try { inst.stop(); } catch {}
    }
  }, []);

  return { isListening, isProcessing, isSupported, startListening, stopListening, learnCorrections };
};

export const useSpeechRecognition = ({ onResult }: UseSpeechRecognitionProps) => {
  if (Capacitor.isNativePlatform()) {
    return useNativeSpeechRecognition(onResult);
  }
  return useWebSpeechRecognition(onResult);
};
