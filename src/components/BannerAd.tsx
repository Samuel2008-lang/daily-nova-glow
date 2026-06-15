import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAdMob } from "@/hooks/use-admob";
import { Button } from "@/components/ui/button";

interface BannerAdProps {
  position?: "top" | "bottom";
}

/**
 * Renders a banner ad on native only. On web, renders nothing.
 * Provides an optional close button overlay because standard AdMob banners
 * are persistent by default.
 */
export const BannerAd = ({ position = "bottom" }: BannerAdProps) => {
  const { showBanner, hideBanner, isNative } = useAdMob();
  const [isVisible, setIsVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;
    
    const init = async () => {
      try {
        await showBanner(position);
        if (!cancelled) {
          setLoaded(true);
          setIsVisible(true);
        }
      } catch (err) {
        console.error("BannerAd: Failed to load", err);
        if (!cancelled) {
          setLoaded(false);
          setIsVisible(false);
        }
      }
    };

    init();
    
    return () => {
      cancelled = true;
      hideBanner();
    };
  }, [showBanner, hideBanner, isNative, position]);

  const handleClose = async () => {
    setIsVisible(false);
    await hideBanner();
  };

  if (!isNative || !isVisible) return null;

  // The close button is rendered in the webview. 
  // We position it where the banner is expected to be.
  // Note: AdMob banners on Capacitor usually overlap the webview or push it.
  // If it overlaps, this button might be hidden UNDER the ad.
  // However, for many layouts, having a close button right above/below the ad area is helpful.
  return (
    <div 
      className={`fixed left-0 right-0 z-[9999] flex justify-end pointer-events-none ${
        position === "top" ? "top-0 pt-[env(safe-area-inset-top)]" : "bottom-0 pb-[env(safe-area-inset-bottom)]"
      }`}
      style={{ height: '50px' }} // Standard banner height
    >
      <Button
        variant="secondary"
        size="icon"
        className="h-6 w-6 rounded-full shadow-md pointer-events-auto m-1 opacity-80 hover:opacity-100"
        onClick={handleClose}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};
