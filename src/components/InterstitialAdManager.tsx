import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAdMob } from "@/hooks/use-admob";

const PAGE_CHANGE_THRESHOLD = 8;
const MIN_GAP_MS = 2 * 60 * 1000; // 2 minutes between interstitials

/**
 * Invisible component that tracks page changes and shows interstitial ads
 * every N page transitions, throttled to no more than once per 2 minutes.
 * Only active in native builds.
 */
export const InterstitialAdManager = () => {
  const location = useLocation();
  const { showInterstitial, isNative } = useAdMob();
  const pageChangeCount = useRef(0);
  const lastShownAt = useRef(0);
  const lastPath = useRef(location.pathname);

  useEffect(() => {
    if (!isNative) return;
    if (location.pathname === lastPath.current) return;

    lastPath.current = location.pathname;
    pageChangeCount.current += 1;

    if (pageChangeCount.current >= PAGE_CHANGE_THRESHOLD) {
      const now = Date.now();
      if (now - lastShownAt.current < MIN_GAP_MS) return;
      pageChangeCount.current = 0;
      lastShownAt.current = now;
      setTimeout(() => {
        showInterstitial();
      }, 500);
    }
  }, [location.pathname, showInterstitial, isNative]);

  return null;
};
