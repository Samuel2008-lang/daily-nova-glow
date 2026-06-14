import { useEffect, useState } from "react";
import { useAdMob } from "@/hooks/use-admob";

interface BannerAdProps {
  position?: "top" | "bottom";
}

/**
 * Renders a banner ad on native only. On web, renders nothing.
 * If the ad fails to load, the entire banner (including close button) is hidden.
 */
export const BannerAd = ({ position = "bottom" }: BannerAdProps) => {
  const { showBanner, hideBanner, isNative } = useAdMob();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;
    (async () => {
      try {
        await showBanner(position);
        if (!cancelled) setLoaded(true);
      } catch {
        if (!cancelled) setLoaded(false);
      }
    })();
    return () => {
      cancelled = true;
      hideBanner();
    };
  }, [showBanner, hideBanner, isNative, position]);

  // Web: render nothing — no fake "Ad Space" placeholder.
  // Native: the actual ad is drawn by AdMob natively above the webview. No overlay close button —
  // if the ad failed to load, AdMob renders nothing, so nothing here either.
  return null;
};
