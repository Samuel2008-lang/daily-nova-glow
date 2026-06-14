import { useState } from "react";
import { MessageCircle, Send, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { haptics } from "@/lib/haptics";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DEVELOPER_EMAIL = "hopeegbon28@gmail.com";

const Feedback = () => {
  const [feedbackText, setFeedbackText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const openConfirm = () => {
    if (!feedbackText.trim()) return;
    haptics.light();
    setConfirmOpen(true);
  };

  const sendFeedback = () => {
    const text = feedbackText.trim();
    if (!text) return;
    haptics.success();

    const subject = encodeURIComponent("DailyNova Feedback");
    const body = encodeURIComponent(text);
    const mailto = `mailto:${DEVELOPER_EMAIL}?subject=${subject}&body=${body}`;

    try {
      window.location.href = mailto;
    } catch {
      toast({
        title: "Couldn't open email app",
        description: `Please email ${DEVELOPER_EMAIL} directly.`,
        variant: "destructive",
      });
    }
    setConfirmOpen(false);
    setFeedbackText("");
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
          <Button onClick={openConfirm} disabled={!feedbackText.trim()} className="w-full gap-2">
            <Send className="w-4 h-4" />
            Send Feedback
          </Button>
          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <Mail className="w-3 h-3" />
            Your feedback will open your email app and be sent to the developer.
          </p>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send via email?</AlertDialogTitle>
            <AlertDialogDescription>
              Your feedback will be sent via email to the developer at <strong>{DEVELOPER_EMAIL}</strong>.
              Your default mail app will open with the message pre-filled. You can review it before sending.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={sendFeedback}>Open Email</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Feedback;
