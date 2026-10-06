import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdMob } from "@/hooks/use-admob";

interface BannerAdProps {
  position?: "top" | "bottom";
}

/**
 * Renders an AdMob banner on native only (the OS draws the banner outside
 * the WebView). On web, renders nothing.
 *
 * Shows the close button only after AdMob reports a visible banner, so there
 * is never a floating X on an empty ad slot.
 */
export const BannerAd = ({ position = "bottom" }: BannerAdProps) => {
  const { showBanner, hideBanner, isNative } = useAdMob();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;
    (async () => {
      try {
        const shown = await showBanner(
          position,
          () => !cancelled && setIsVisible(true),
          () => !cancelled && setIsVisible(false),
        );
        if (!shown && !cancelled) setIsVisible(false);
      } catch (err) {
        if (!cancelled) setIsVisible(false);
      }
      if (cancelled) hideBanner();
    })();
    return () => {
      cancelled = true;
      setIsVisible(false);
      hideBanner();
    };
  }, [showBanner, hideBanner, isNative, position]);

  if (!isNative || !isVisible) return null;

  return (
    <Button
      size="icon"
      variant="secondary"
      className={`fixed z-[80] h-8 w-8 rounded-full border border-border/60 shadow-lg ${position === "top" ? "top-2" : "bottom-16"} right-3`}
      onClick={() => {
        setIsVisible(false);
        hideBanner();
      }}
      aria-label="Close banner ad"
    >
      <X className="h-4 w-4" />
    </Button>
  );
};
