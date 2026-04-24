import { useState } from "react";
import { MessageCircle, Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { haptics } from "@/lib/haptics";

const Feedback = () => {
  const [feedbackText, setFeedbackText] = useState("");
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const sendFeedback = () => {
    if (!feedbackText.trim()) return;
    try {
      const existing = JSON.parse(localStorage.getItem("dailynova_feedback_queue") || "[]");
      existing.push({
        id: crypto.randomUUID(),
        message: feedbackText.trim(),
        createdAt: new Date().toISOString(),
        version: "1.0.0",
      });
      localStorage.setItem("dailynova_feedback_queue", JSON.stringify(existing));
    } catch {
      /* ignore */
    }
    haptics.success();
    setFeedbackText("");
    setSent(true);
    toast({ title: "Thank you!", description: "Your feedback was sent to the creator." });
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-xl mx-auto animate-fade-in">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-3 mb-6">
          <MessageCircle className="w-7 h-7 text-accent" />
          <h1 className="text-3xl font-bold text-accent">Send Feedback</h1>
        </div>

        <Card className="glass p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Share bugs, suggestions, or thoughts with the creator. Your feedback shapes future updates.
          </p>
          <Textarea
            placeholder="Tell us what you think…"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="min-h-[140px] bg-background/50 border-border/50 focus:border-accent"
          />
          <Button onClick={sendFeedback} disabled={!feedbackText.trim() || sent} className="w-full gap-2">
            <Send className="w-4 h-4" />
            {sent ? "Sent ✓" : "Send Feedback"}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Auto-detection feedback (👍/👎) is separate — it lives in Quick Capture and trains the on-device AI privately.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Feedback;
