import { useState } from "react";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdMob } from "@/hooks/use-admob";
import { useToast } from "@/hooks/use-toast";

interface RewardedAdButtonProps {
  onReward: () => void;
  onUnavailable?: () => void;
  label?: string;
  className?: string;
}

export const RewardedAdButton = ({ onReward, onUnavailable, label = "Watch Ad for Reward", className }: RewardedAdButtonProps) => {
  const { showRewarded, isNative } = useAdMob();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    if (!isNative) {
      toast({ title: "Reward unlocked!", description: "Ads only work in the native app." });
      onReward();
      return;
    }

    if (!navigator.onLine) {
      toast({
        title: "No internet connection",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await showRewarded();
      if (result === "rewarded") {
        onReward();
        toast({ title: "Reward unlocked!", description: "Thank you for watching!" });
      } else {
        // "dismissed" or "failed" — let the parent decide what to show.
        onUnavailable?.();
      }
    } catch (error) {
      console.error("RewardedAdButton error:", error);
      onUnavailable?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={isLoading} variant="outline" className={className}>
      {isLoading ? (
        <span className="flex items-center">
          <span className="animate-spin mr-2">⏳</span>
          Loading...
        </span>
      ) : (
        <>
          <Gift className="w-4 h-4 mr-2" />
          {label}
        </>
      )}
    </Button>
  );
};
