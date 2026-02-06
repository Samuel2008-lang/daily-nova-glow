import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAdMob } from "@/hooks/use-admob";

const PAGE_CHANGE_THRESHOLD = 3;

/**
 * Invisible component that tracks page changes and shows interstitial ads
 * every N page transitions. Only active in native builds.
 */
export const InterstitialAdManager = () => {
  const location = useLocation();
  const { showInterstitial, isNative } = useAdMob();
  const pageChangeCount = useRef(0);
  const lastPath = useRef(location.pathname);

  useEffect(() => {
    if (!isNative) return;
    if (location.pathname === lastPath.current) return;
    
    lastPath.current = location.pathname;
    pageChangeCount.current += 1;

    if (pageChangeCount.current >= PAGE_CHANGE_THRESHOLD) {
      pageChangeCount.current = 0;
      // Small delay to let the page render first
      setTimeout(() => {
        showInterstitial();
      }, 500);
    }
  }, [location.pathname, showInterstitial, isNative]);

  return null;
};
