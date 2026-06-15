import { useEffect, useRef, useState, useCallback } from "react";
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Sparkles } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";

type Msg = { role: string; content: string };

interface AiCallModeProps {
  initialMessages: Msg[];
  systemPrompt: string;
  accentColor: string;
  onClose: (finalMessages: Msg[]) => void;
}

type CallState = "connecting" | "idle" | "listening" | "thinking" | "speaking" | "muted";

const AiCallMode = ({ initialMessages, systemPrompt, onClose }: AiCallModeProps) => {
  const { toast } = useToast();
  const [state, setState] = useState<CallState>("connecting");
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const messagesRef = useRef<Msg[]>(initialMessages);
  const recognitionRef = useRef<any>(null);
  const endedRef = useRef(false);
  const mutedRef = useRef(false);
  const speakerRef = useRef(true);
  const resumeListeningRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const stopAll = useCallback(() => {
    try { 
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.abort(); 
      }
    } catch {}
    resumeListeningRef.current?.();
    resumeListeningRef.current = null;
    try { window.speechSynthesis?.cancel(); } catch {}
  }, []);

  const ensureMicrophonePermission = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
      const checked = await SpeechRecognition.checkPermissions();
      const result = checked.speechRecognition === "granted" ? checked : await SpeechRecognition.requestPermissions();
      if (result.speechRecognition !== "granted") {
        throw new Error("Microphone permission is not enabled for Daily Nova.");
      }
      return;
    }

    if (navigator.mediaDevices?.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    }
  }, []);

  const waitForMicTap = useCallback(() => {
    setState("idle");
    return new Promise<void>((resolve) => {
      resumeListeningRef.current = resolve;
    });
  }, []);

  const endCall = useCallback(() => {
    endedRef.current = true;
    stopAll();
    haptics.warning();
    onClose(messagesRef.current);
  }, [onClose, stopAll]);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window) || !speakerRef.current || endedRef.current) return resolve();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = 1.05;
      utter.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => /en-(US|GB)/i.test(v.lang) && /(neural|natural|wavenet|premium|enhanced|online)/i.test(v.name)) ||
        voices.find((v) => /en-(US|GB)/i.test(v.lang) && /(google|samantha|karen|serena|aria|jenny)/i.test(v.name)) ||
        voices.find((v) => /en-(US|GB)/i.test(v.lang)) ||
        voices.find((v) => /^en/i.test(v.lang));
      if (preferred) utter.voice = preferred;
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      window.speechSynthesis.speak(utter);
    });
  }, []);

  const streamReply = useCallback(async (msgs: Msg[]): Promise<string> => {
    if (!navigator.onLine) throw new Error("You're offline. AI calls need internet.");
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-stream`;
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: msgs, systemPrompt }),
    });
    if (!resp.ok || !resp.body) throw new Error("AI request failed");
    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = ""; let content = "";
    while (true) {
      if (endedRef.current) {
        reader.cancel();
        break;
      }
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const j = line.slice(6).trim();
        if (j === "[DONE]") break;
        try {
          const parsed = JSON.parse(j);
          const c = parsed.choices?.[0]?.delta?.content;
          if (c) content += c;
        } catch {}
      }
    }
    return content;
  }, [systemPrompt]);

  const listenOnce = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      if (endedRef.current) return resolve("");
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) return resolve("");
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";
      let final = "";
      rec.onresult = (e: any) => {
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) final += r[0].transcript;
        }
      };
      rec.onerror = (e: any) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          toast({ title: "Microphone denied", description: "Allow mic access to use voice call.", variant: "destructive" });
        }
        resolve("");
      };
      rec.onend = () => resolve(final.trim());
      recognitionRef.current = rec;
      try { rec.start(); } catch (err) { resolve(""); }
    });
  }, [toast]);

  useEffect(() => {
    let cancelled = false;

    const loop = async () => {
      try {
        await ensureMicrophonePermission();
      } catch (err) {
        toast({
          title: "Microphone needed",
          description: err instanceof Error ? err.message : "Allow microphone access to use voice call.",
          variant: "destructive",
        });
        endCall();
        return;
      }

      const greeting = initialMessages.length === 0
        ? "Hi. Tap the mic when you're ready to speak."
        : "I'm here. Go ahead.";
      
      setState("speaking");
      await speak(greeting);
      if (cancelled || endedRef.current) return;

      while (!cancelled && !endedRef.current) {
        try {
          if (mutedRef.current) {
            setState("muted");
            await new Promise((r) => setTimeout(r, 400));
            continue;
          }
          if (!resumeListeningRef.current) await waitForMicTap();
          if (cancelled || endedRef.current) break;
          setState("listening");
          const userText = await listenOnce();
          if (cancelled || endedRef.current) break;
          if (!userText || mutedRef.current) continue;

          haptics.light();
          const newMsgs = [...messagesRef.current, { role: "user", content: userText }];
          messagesRef.current = newMsgs;

          setState("thinking");
          const reply = await streamReply(newMsgs);
          if (cancelled || endedRef.current) break;
          if (!reply) continue;

          messagesRef.current = [...newMsgs, { role: "assistant", content: reply }];
          setState("speaking");
          await speak(reply);
          if (cancelled || endedRef.current) break;
        } catch (err) {
          console.error("Call loop error:", err);
          if (cancelled || endedRef.current) break;
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    };

    loop();
    return () => {
      cancelled = true;
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
    haptics.light();
    if (mutedRef.current) {
      try { recognitionRef.current?.abort(); } catch {}
    }
  };

  const startListeningTurn = () => {
    haptics.light();
    resumeListeningRef.current?.();
    resumeListeningRef.current = null;
  };

  const toggleSpeaker = () => {
    speakerRef.current = !speakerRef.current;
    setSpeakerOn(speakerRef.current);
    haptics.light();
    if (!speakerRef.current) {
      try { window.speechSynthesis?.cancel(); } catch {}
    }
  };

  const statusText =
    state === "connecting" ? "Connecting…" :
    state === "idle" ? "Tap mic to speak" :
    state === "listening" ? "Listening" :
    state === "thinking" ? "Thinking…" :
    state === "speaking" ? "Speaking" :
    state === "muted" ? "Muted" : "";

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative pt-16 pb-8 px-6 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{mm}:{ss}</p>
        <h2 className="mt-2 text-3xl font-semibold text-foreground">Daily Nova</h2>
        <p className="mt-1 text-sm text-muted-foreground">{statusText}</p>
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center gap-10">
        <div className="relative">
          <div className={`absolute inset-0 rounded-full bg-primary/20 blur-2xl ${state === "speaking" || state === "listening" ? "animate-pulse" : ""}`} />
          <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 border border-primary/40 flex items-center justify-center backdrop-blur">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
        </div>

        <div className="flex items-end justify-center gap-1.5 h-12">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span
              key={i}
              className={`w-1.5 rounded-full bg-primary transition-all duration-300 ${
                state === "speaking" ? "animate-wave" :
                state === "listening" ? "animate-pulse" :
                "opacity-30"
              }`}
              style={{
                height: state === "speaking" || state === "listening"
                  ? `${20 + Math.abs(Math.sin((Date.now() / 200) + i)) * 30}px`
                  : "12px",
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative pb-14 px-8">
        <div className="flex items-center justify-center gap-8">
          <button
            onClick={state === "idle" ? startListeningTurn : toggleMute}
            aria-label={state === "idle" ? "Start speaking" : muted ? "Unmute" : "Mute"}
            className={`w-14 h-14 rounded-full border flex items-center justify-center active:scale-95 transition-transform ${
              state === "idle" ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30" : "bg-muted/40 border-border/40 text-foreground"
            }`}
          >
            {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button
            onClick={endCall}
            aria-label="End call"
            className="w-20 h-20 rounded-full bg-destructive flex items-center justify-center shadow-2xl shadow-destructive/40 active:scale-95 transition-transform"
          >
            <PhoneOff className="w-8 h-8 text-destructive-foreground" />
          </button>

          <button
            onClick={toggleSpeaker}
            aria-label={speakerOn ? "Mute speaker" : "Enable speaker"}
            className="w-14 h-14 rounded-full bg-muted/40 border border-border/40 flex items-center justify-center active:scale-95 transition-transform"
          >
            {speakerOn ? <Volume2 className="w-6 h-6 text-foreground" /> : <VolumeX className="w-6 h-6 text-foreground" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiCallMode;
