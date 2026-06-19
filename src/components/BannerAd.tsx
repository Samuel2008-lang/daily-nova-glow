import { useEffect } from "react";
import { useAdMob } from "@/hooks/use-admob";

interface BannerAdProps {
  position?: "top" | "bottom";
}

/**
 * Renders an AdMob banner on native only (the OS draws the banner outside
 * the WebView). On web, renders nothing.
 *
 * We intentionally do NOT render a close-button overlay anymore — when the
 * banner failed to fill, the overlay would appear as a lone "X" floating
 * above empty space.
 */
export const BannerAd = ({ position = "bottom" }: BannerAdProps) => {
  const { showBanner, hideBanner, isNative } = useAdMob();

  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;
    (async () => {
      try {
        await showBanner(position);
      } catch (err) {
        console.error("BannerAd: Failed to load", err);
      }
      if (cancelled) hideBanner();
    })();
    return () => {
      cancelled = true;
      hideBanner();
    };
  }, [showBanner, hideBanner, isNative, position]);

  return null;
};
