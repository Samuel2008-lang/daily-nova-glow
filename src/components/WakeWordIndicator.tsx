import { Mic } from "lucide-react";

interface WakeWordIndicatorProps {
  isActive: boolean;
  isListening: boolean;
  lastCommand?: string;
}

export const WakeWordIndicator = ({ isActive, isListening, lastCommand }: WakeWordIndicatorProps) => {
  if (!isActive) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 animate-fade-in">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-background/90 border border-primary/50 shadow-lg backdrop-blur-sm ${isListening ? "animate-pulse" : ""}`}>
        <div className={`relative flex items-center justify-center`}>
          <Mic className={`w-4 h-4 ${isListening ? "text-primary" : "text-muted-foreground"}`} />
          {isActive && (
            <>
              <span className="absolute w-6 h-6 rounded-full bg-primary/30 animate-ping" />
              <span className="absolute w-4 h-4 rounded-full bg-primary/50 animate-pulse" />
            </>
          )}
        </div>
        <span className="text-sm font-medium text-foreground">
          {isListening ? "Listening..." : "Hey Nova ready"}
        </span>
      </div>
      
      {lastCommand && (
        <div className="px-3 py-1 rounded-lg bg-secondary/20 text-secondary text-xs animate-fade-in">
          Heard: "{lastCommand}"
        </div>
      )}
    </div>
  );
};
