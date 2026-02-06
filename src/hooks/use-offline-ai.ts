/**
 * Offline AI Hook - Prepared for native app conversion
 * 
 * This hook provides an abstraction layer for offline AI capabilities.
 * In web builds, it falls back to the cloud AI (enhance-text edge function).
 * In native builds, it will use on-device models (ONNX Runtime, llama.cpp, or ggml).
 * 
 * Supported offline models (for native builds):
 * - Gemini Nano (via Chrome's built-in AI / Android AI Core)
 * - GPT4All (via llama.cpp bindings)
 * - ONNX Runtime Mobile (quantized models)
 * - ggml-based models (TinyLlama, Phi-2, etc.)
 * 
 * To activate in native builds:
 * 1. Install @anthropic-ai/tokenizer or similar for token counting
 * 2. Add Capacitor plugin for on-device inference
 * 3. Download quantized models via Wi-Fi (managed by ModelDownloader)
 */

import { useState, useCallback } from "react";

// Check if running in Capacitor native environment
const isNative = () => {
  return typeof (window as any).Capacitor !== "undefined" && (window as any).Capacitor.isNativePlatform();
};

// Check if Chrome's built-in AI (Gemini Nano) is available
const hasBuiltInAI = () => {
  return typeof (window as any).ai !== "undefined";
};

interface OfflineAIOptions {
  task: "enhance" | "organize" | "summarize" | "chat";
  context?: string;
}

export const useOfflineAI = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelStatus, setModelStatus] = useState<"not-loaded" | "loading" | "ready" | "unavailable">("not-loaded");

  /**
   * Process text using the best available AI model.
   * Priority: On-device model > Chrome Built-in AI > Cloud AI fallback
   */
  const processText = useCallback(async (text: string, options: OfflineAIOptions): Promise<string> => {
    if (!text.trim()) return text;
    setIsProcessing(true);

    try {
      // Priority 1: Native on-device model (Capacitor plugin)
      if (isNative()) {
        try {
          // This will be activated when Capacitor plugin for local inference is added
          // Example: const result = await LocalLLM.generate({ prompt: text, task: options.task });
          // For now, fall through to next option
          console.log("Native AI: Would use on-device model here");
        } catch (e) {
          console.log("Native AI fallback:", e);
        }
      }

      // Priority 2: Chrome Built-in AI (Gemini Nano) - works in Chrome 127+
      if (hasBuiltInAI()) {
        try {
          const ai = (window as any).ai;
          if (ai.languageModel) {
            const session = await ai.languageModel.create({
              systemPrompt: getSystemPrompt(options),
            });
            const result = await session.prompt(text);
            session.destroy();
            return result;
          }
        } catch (e) {
          console.log("Built-in AI fallback:", e);
        }
      }

      // Priority 3: Cloud AI fallback (enhance-text edge function)
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("enhance-text", {
        body: { text, context: options.context || options.task },
      });

      if (!error && data?.enhanced) {
        return data.enhanced;
      }

      return text;
    } catch (e) {
      console.error("AI processing error:", e);
      return text;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    processText,
    isProcessing,
    modelStatus,
    isNative: isNative(),
    hasBuiltInAI: hasBuiltInAI(),
  };
};

function getSystemPrompt(options: OfflineAIOptions): string {
  switch (options.task) {
    case "enhance":
      return `You are a speech-to-text transcription enhancer. Your ONLY job is to:
1. PRESERVE the user's exact words and meaning - DO NOT change what they said
2. Fix only obvious spelling mistakes from speech recognition
3. Add proper punctuation (periods, commas, question marks)
4. Fix capitalization at the start of sentences
5. Remove word repetitions caused by speech recognition errors
CRITICAL: NEVER change the user's vocabulary or word choice. NEVER add words they didn't say. Keep their natural speaking style.
Return ONLY the cleaned transcription, nothing else.`;
    case "organize":
      return `You are a text organizer. Structure the text with proper paragraphs, spacing, and formatting while preserving every word the user wrote. Do not change their words, only organize the layout.`;
    case "summarize":
      return `Summarize the following text concisely while preserving key points.`;
    case "chat":
      return `You are a helpful, empathetic AI assistant. Be conversational and warm.`;
    default:
      return `You are a helpful assistant.`;
  }
}
