import { useEffect } from "react";
import { useAdMob } from "@/hooks/use-admob";

interface BannerAdProps {
  position?: "top" | "bottom";
}

export const BannerAd = ({ position = "bottom" }: BannerAdProps) => {
  const { showBanner, hideBanner, isNative } = useAdMob();

  useEffect(() => {
    if (isNative) {
      showBanner(position);
    }

    return () => {
      if (isNative) {
        hideBanner();
      }
    };
  }, [showBanner, hideBanner, isNative, position]);

  // For web, show a placeholder
  if (!isNative) {
    return (
      <div className={`fixed ${position === "top" ? "top-0" : "bottom-16 md:bottom-0"} left-0 right-0 h-14 bg-muted/50 flex items-center justify-center text-xs text-muted-foreground z-40`}>
        <span>Ad Space</span>
      </div>
    );
  }

  return null;
};
