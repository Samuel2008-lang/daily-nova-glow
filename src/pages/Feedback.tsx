import { useState } from "react";
import { MessageCircle, Send, ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { haptics } from "@/lib/haptics";
import { sendFeedback } from "@/lib/feedback";

const Feedback = () => {
  const [feedbackText, setFeedbackText] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const submit = async () => {
    const text = feedbackText.trim();
    if (!text || sending) return;
    haptics.light();
    setSending(true);
    try {
      const result = await sendFeedback(text);
      haptics.success();
      setFeedbackText("");
      toast(
        result === "sent"
          ? { title: "Feedback sent. Thank you!" }
          : { title: "Saved offline", description: "We'll deliver it as soon as you're back online." }
      );
    } catch {
      toast({ title: "Couldn't send", description: "Please try again in a moment.", variant: "destructive" });
    } finally {
      setSending(false);
    }
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
            className="min-h-[160px] bg-background/50 border-border/50"
          />
          <Button onClick={submit} disabled={!feedbackText.trim() || sending} className="w-full gap-2">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Sending…" : "Submit"}
          </Button>
          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Sent privately to the developer. No email app opens.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Feedback;
