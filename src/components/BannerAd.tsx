import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAdMob } from "@/hooks/use-admob";

interface BannerAdProps {
  position?: "top" | "bottom";
}

export const BannerAd = ({ position = "bottom" }: BannerAdProps) => {
  const { showBanner, hideBanner, isNative } = useAdMob();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isNative && !dismissed) {
      showBanner(position);
    }

    return () => {
      if (isNative) {
        hideBanner();
      }
    };
  }, [showBanner, hideBanner, isNative, position, dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    if (isNative) {
      hideBanner();
    }
  };

  if (dismissed) return null;

  // For web, show a placeholder
  if (!isNative) {
    return (
      <div className={`fixed ${position === "top" ? "top-0" : "bottom-16 md:bottom-0"} left-0 right-0 h-14 bg-muted/50 flex items-center justify-center text-xs text-muted-foreground z-40`}>
        <span>Ad Space</span>
        <button onClick={handleDismiss} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Native: render a dismiss button overlay
  return (
    <div className={`fixed ${position === "top" ? "top-0" : "bottom-16 md:bottom-0"} right-2 z-50`}>
      <button onClick={handleDismiss} className="p-1 rounded-full bg-background/80 shadow-md">
        <X className="w-4 h-4 text-foreground" />
      </button>
    </div>
  );
};
