import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseSpeechRecognitionProps {
  onResult: (transcript: string) => void;
  continuous?: boolean;
}

export const useSpeechRecognition = ({
  onResult,
  continuous = false,
}: UseSpeechRecognitionProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  const startListening = useCallback(() => {
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

    recognition.continuous = continuous;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      
      toast({
        title: "Speech captured",
        description: "Your speech has been converted to text.",
      });
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      
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
      } else {
        toast({
          title: "Recognition error",
          description: "An error occurred during speech recognition.",
          variant: "destructive",
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (error) {
      console.error("Error starting recognition:", error);
      setIsListening(false);
      toast({
        title: "Error",
        description: "Failed to start speech recognition.",
        variant: "destructive",
      });
    }
  }, [isSupported, continuous, onResult, toast]);

  return {
    isListening,
    isSupported,
    startListening,
  };
};
