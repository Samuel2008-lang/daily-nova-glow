import { useState } from "react";
import { MessageCircle, Send, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { haptics } from "@/lib/haptics";

const FEEDBACK_QUEUE_KEY = "dailynova_feedback_queue";

interface FeedbackItem {
  id: string;
  text: string;
  createdAt: string;
}

const Feedback = () => {
  const [feedbackText, setFeedbackText] = useState("");
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const sendFeedback = () => {
    const text = feedbackText.trim();
    if (!text) return;
    haptics.success();

    // Save to local feedback queue — fully offline, no app navigation, no mailto.
    try {
      const raw = localStorage.getItem(FEEDBACK_QUEUE_KEY);
      const queue: FeedbackItem[] = raw ? JSON.parse(raw) : [];
      queue.unshift({
        id: Date.now().toString(),
        text,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem(FEEDBACK_QUEUE_KEY, JSON.stringify(queue.slice(0, 100)));
    } catch (err) {
      console.error("Failed to save feedback:", err);
    }

    setSent(true);
    setFeedbackText("");
    toast({ title: "Thanks for your feedback!", description: "Saved — you can review it in Settings." });
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
          <Textarea
            placeholder="Tell us what you think…"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="min-h-[140px] bg-background/50 border-border/50 focus:border-accent"
          />
          <Button onClick={sendFeedback} disabled={!feedbackText.trim() || sent} className="w-full gap-2">
            {sent ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {sent ? "Saved!" : "Send Feedback"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Your feedback is saved on-device and reviewed in Settings — no email app opens.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Feedback;
