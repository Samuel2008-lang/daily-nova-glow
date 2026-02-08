import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

interface AiMessageBubbleProps {
  content: string;
  role: "user" | "assistant" | string;
  isStreaming?: boolean;
  accentColor?: string;
}

const AiMessageBubble = ({ content, role, isStreaming, accentColor = "primary" }: AiMessageBubbleProps) => {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const handleFeedback = (type: "up" | "down") => {
    setFeedback(type === feedback ? null : type);
    // Store feedback in localStorage for learning
    const feedbackLog = JSON.parse(localStorage.getItem("dailynova_ai_feedback") || "[]");
    feedbackLog.push({
      type,
      content: content.substring(0, 200),
      timestamp: new Date().toISOString(),
    });
    // Keep last 100 feedback entries
    if (feedbackLog.length > 100) feedbackLog.shift();
    localStorage.setItem("dailynova_ai_feedback", JSON.stringify(feedbackLog));
  };

  if (role === "user") {
    return (
      <div className={`p-3 rounded-lg text-sm bg-${accentColor}/20 ml-8 select-text`}>
        {content}
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg text-sm bg-background/50 mr-8 select-text ${isStreaming ? "animate-pulse-glow" : ""}`}>
      <div className="prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ol]:mb-2 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
      {isStreaming && (
        <span className={`inline-block w-1 h-4 bg-${accentColor} ml-1 animate-pulse`} />
      )}
      {!isStreaming && content && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/30">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleFeedback("up")}
            className={`h-6 w-6 ${feedback === "up" ? `text-${accentColor}` : "text-muted-foreground/50 hover:text-muted-foreground"}`}
          >
            <ThumbsUp className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleFeedback("down")}
            className={`h-6 w-6 ${feedback === "down" ? "text-destructive" : "text-muted-foreground/50 hover:text-muted-foreground"}`}
          >
            <ThumbsDown className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default AiMessageBubble;

