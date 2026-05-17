import { useEffect, useRef, useState, useCallback } from "react";
import { PhoneOff, Mic, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";

type Msg = { role: string; content: string };

interface AiCallModeProps {
  initialMessages: Msg[];
  systemPrompt: string;
  accentColor: string;
  onClose: (finalMessages: Msg[]) => void;
}

type CallState = "idle" | "listening" | "thinking" | "speaking";

/**
 * Full-screen, hands-free voice call with the AI.
 * Loop: listen → transcribe → stream AI reply → speak it → listen again.
 * Uses Web Speech API (STT) + speechSynthesis (TTS). No paid backend.
 */
const AiCallMode = ({ initialMessages, systemPrompt, accentColor, onClose }: AiCallModeProps) => {
  const { toast } = useToast();
  const [state, setState] = useState<CallState>("idle");
  const [partial, setPartial] = useState("");
  const [lastReply, setLastReply] = useState("");
  const messagesRef = useRef<Msg[]>(initialMessages);
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const endedRef = useRef(false);

  const stopAll = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
  }, []);

  const endCall = useCallback(() => {
    endedRef.current = true;
    stopAll();
    haptics.warning();
    onClose(messagesRef.current);
  }, [onClose, stopAll]);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) return resolve();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) => /en-(US|GB)/i.test(v.lang) && /female|samantha|google/i.test(v.name))
        || voices.find((v) => /en/i.test(v.lang));
      if (preferred) utter.voice = preferred;
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      utteranceRef.current = utter;
      window.speechSynthesis.speak(utter);
    });
  }, []);

  const streamReply = useCallback(async (msgs: Msg[]): Promise<string> => {
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
    let buf = "";
    let content = "";
    while (true) {
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
    return new Promise((resolve, reject) => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) return reject(new Error("Speech recognition not supported"));
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";
      let final = "";
      rec.onresult = (e: any) => {
        let interim = "";
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) final += r[0].transcript;
          else interim += r[0].transcript;
        }
        setPartial(final + interim);
      };
      rec.onerror = (e: any) => {
        if (e.error === "no-speech" || e.error === "aborted") resolve("");
        else reject(new Error(e.error));
      };
      rec.onend = () => {
        setPartial("");
        resolve(final.trim());
      };
      recognitionRef.current = rec;
      try { rec.start(); } catch (err) { reject(err as Error); }
    });
  }, []);

  // Main conversation loop
  useEffect(() => {
    let cancelled = false;

    const greet = async () => {
      const greeting = initialMessages.length === 0
        ? "Hi! I'm listening — what's on your mind?"
        : "I'm here. Go ahead.";
      setState("speaking");
      setLastReply(greeting);
      await speak(greeting);
      if (cancelled || endedRef.current) return;
      loop();
    };

    const loop = async () => {
      while (!cancelled && !endedRef.current) {
        try {
          setState("listening");
          setPartial("");
          const userText = await listenOnce();
          if (cancelled || endedRef.current) return;
          if (!userText) continue;

          haptics.light();
          const newMsgs = [...messagesRef.current, { role: "user", content: userText }];
          messagesRef.current = newMsgs;

          setState("thinking");
          const reply = await streamReply(newMsgs);
          if (cancelled || endedRef.current) return;
          if (!reply) continue;

          messagesRef.current = [...newMsgs, { role: "assistant", content: reply }];
          setLastReply(reply);
          setState("speaking");
          await speak(reply);
        } catch (err) {
          console.error("Call loop error:", err);
          toast({
            title: "Voice error",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          });
          // brief pause then retry listening
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    };

    greet();
    return () => {
      cancelled = true;
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orbScale =
    state === "listening" ? "scale-110 animate-pulse" :
    state === "speaking" ? "scale-125" :
    state === "thinking" ? "scale-100 animate-pulse" : "scale-100";

  const stateLabel =
    state === "listening" ? "Listening…" :
    state === "thinking" ? "Thinking…" :
    state === "speaking" ? "Speaking…" : "Connecting…";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-between bg-gradient-to-b from-background via-background to-primary/10 px-6 py-10">
      <div className="text-center pt-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">AI Call</p>
        <h2 className={`text-2xl font-bold text-${accentColor}`}>Daily Nova</h2>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-primary via-secondary to-accent blur-2xl opacity-60 transition-transform duration-500 ${orbScale}`} />
          <div className={`relative w-40 h-40 rounded-full bg-gradient-to-br from-primary via-secondary to-accent shadow-2xl transition-transform duration-500 ${orbScale} flex items-center justify-center`}>
            {state === "listening" && <Mic className="w-12 h-12 text-white drop-shadow-lg" />}
            {state === "speaking" && <Volume2 className="w-12 h-12 text-white drop-shadow-lg animate-pulse" />}
            {state === "thinking" && <div className="w-8 h-8 border-4 border-white/40 border-t-white rounded-full animate-spin" />}
          </div>
        </div>

        <p className={`text-sm font-medium text-${accentColor}`}>{stateLabel}</p>

        {partial && (
          <div className="max-w-md text-center px-4">
            <p className="text-xs text-muted-foreground uppercase mb-1">You</p>
            <p className="text-base text-foreground">{partial}</p>
          </div>
        )}

        {state === "speaking" && lastReply && (
          <div className="max-w-md text-center px-4 max-h-32 overflow-y-auto">
            <p className="text-xs text-muted-foreground uppercase mb-1">Assistant</p>
            <p className="text-sm text-foreground/90">{lastReply}</p>
          </div>
        )}
      </div>

      <Button
        onClick={endCall}
        size="lg"
        variant="destructive"
        className="rounded-full h-16 w-16 p-0 shadow-2xl"
        aria-label="End call"
      >
        <PhoneOff className="w-7 h-7" />
      </Button>
    </div>
  );
};

export default AiCallMode;
