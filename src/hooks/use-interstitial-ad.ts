import { useCallback, useRef } from "react";
import { useAdMob } from "./use-admob";

const PAGE_CHANGE_THRESHOLD = 3; // Show ad every 3 page changes

export const useInterstitialAd = () => {
  const { showInterstitial, isNative } = useAdMob();
  const pageChangeCount = useRef(0);

  const onPageChange = useCallback(() => {
    if (!isNative) return;
    
    pageChangeCount.current += 1;
    
    if (pageChangeCount.current >= PAGE_CHANGE_THRESHOLD) {
      pageChangeCount.current = 0;
      showInterstitial();
    }
  }, [showInterstitial, isNative]);

  return { onPageChange };
};
