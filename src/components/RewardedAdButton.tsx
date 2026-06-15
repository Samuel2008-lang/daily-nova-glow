import { useState } from "react";
import { Gift, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdMob } from "@/hooks/use-admob";
import { useToast } from "@/hooks/use-toast";

interface RewardedAdButtonProps {
  onReward: () => void;
  label?: string;
  className?: string;
}

export const RewardedAdButton = ({ onReward, label = "Watch Ad for Reward", className }: RewardedAdButtonProps) => {
  const { showRewarded, isNative } = useAdMob();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    if (!isNative) {
      // In web, simulate reward
      toast({ title: "Reward unlocked!", description: "Ads only work in the native app." });
      onReward();
      return;
    }

    if (!navigator.onLine) {
      toast({ 
        title: "No connection", 
        description: "Please check your internet connection to load ads.", 
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);
    try {
      const rewarded = await showRewarded();
      if (rewarded) {
        onReward();
        toast({ title: "Reward unlocked!", description: "Thank you for watching!" });
      } else {
        toast({ title: "Ad not completed", description: "Watch the full ad to get your reward.", variant: "destructive" });
      }
    } catch (error) {
      console.error("RewardedAdButton error:", error);
      toast({ 
        title: "Ad unavailable", 
        description: "The ad server couldn't be reached. Try again in a moment.", 
        variant: "destructive" 
      });
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
