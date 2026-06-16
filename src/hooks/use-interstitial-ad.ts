import { useCallback, useRef } from "react";
import { useAdMob } from "./use-admob";
import { recordingState } from "@/lib/recording-state";

const PAGE_CHANGE_THRESHOLD = 3; // Show ad every 3 page changes

export const useInterstitialAd = () => {
  const { showInterstitial, isNative } = useAdMob();
  const pageChangeCount = useRef(0);

  const onPageChange = useCallback(() => {
    if (!isNative) return;
    if (recordingState.isActive()) return;
    if (document.activeElement?.matches?.("input, textarea, select, [contenteditable='true']")) return;
    
    pageChangeCount.current += 1;
    
    if (pageChangeCount.current >= PAGE_CHANGE_THRESHOLD) {
      pageChangeCount.current = 0;
      setTimeout(() => {
        if (recordingState.isActive()) return;
        if (document.activeElement?.matches?.("input, textarea, select, [contenteditable='true']")) return;
        showInterstitial();
      }, 500);
    }
  }, [showInterstitial, isNative]);

  return { onPageChange };
};
