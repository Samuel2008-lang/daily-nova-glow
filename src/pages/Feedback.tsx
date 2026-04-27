import { useState } from "react";
import { MessageCircle, Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { haptics } from "@/lib/haptics";

const CREATOR_EMAIL = "hopeegbon28@gmail.com";

const Feedback = () => {
  const [feedbackText, setFeedbackText] = useState("");
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const sendFeedback = () => {
    if (!feedbackText.trim()) return;
    haptics.success();

    // Open the user's default mail app (Gmail, Outlook, Apple Mail, etc.)
    const subject = encodeURIComponent("Daily Nova — App Feedback");
    const body = encodeURIComponent(feedbackText.trim());
    const mailto = `mailto:${CREATOR_EMAIL}?subject=${subject}&body=${body}`;

    try {
      window.location.href = mailto;
    } catch {
      /* ignore */
    }

    setSent(true);
    toast({
      title: "Opening your mail app…",
      description: `Send the email to ${CREATOR_EMAIL} to deliver your feedback.`,
    });
    setTimeout(() => {
      setSent(false);
      setFeedbackText("");
    }, 2500);
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
            Share bugs, suggestions, or thoughts with the creator. Tapping
            "Send Feedback" opens your default mail app (Gmail, Outlook,
            etc.) with your message ready to send to{" "}
            <span className="text-accent">{CREATOR_EMAIL}</span>.
          </p>
          <Textarea
            placeholder="Tell us what you think…"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="min-h-[140px] bg-background/50 border-border/50 focus:border-accent"
          />
          <Button onClick={sendFeedback} disabled={!feedbackText.trim() || sent} className="w-full gap-2">
            <Send className="w-4 h-4" />
            {sent ? "Opening mail app…" : "Send Feedback"}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Feedback;
