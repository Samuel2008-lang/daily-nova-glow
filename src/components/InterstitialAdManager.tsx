import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAdMob } from "@/hooks/use-admob";
import { recordingState } from "@/lib/recording-state";

const PAGE_CHANGE_THRESHOLD = 8;
const MIN_GAP_MS = 2 * 60 * 1000; // 2 minutes between interstitials

// Routes where the user is actively writing/reading and ads must never appear.
const PROTECTED_ROUTES = ["/diary", "/journal", "/notes", "/diary/ai", "/journal/ai"];

/**
 * Tracks page changes and shows an interstitial after N transitions, throttled.
 * Never shows while the mic is recording or while the user is on a writing/reading page.
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

    if (pageChangeCount.current < PAGE_CHANGE_THRESHOLD) return;
    const now = Date.now();
    if (now - lastShownAt.current < MIN_GAP_MS) return;

    // Never show on writing/reading screens or while mic is active
    if (PROTECTED_ROUTES.some((p) => location.pathname.startsWith(p))) return;
    if (recordingState.isActive()) return;
    if (document.activeElement?.matches?.("input, textarea, select, [contenteditable='true']")) return;

    pageChangeCount.current = 0;
    lastShownAt.current = now;
    setTimeout(() => {
      if (recordingState.isActive()) return;
      if (document.activeElement?.matches?.("input, textarea, select, [contenteditable='true']")) return;
      showInterstitial();
    }, 500);
  }, [location.pathname, showInterstitial, isNative]);

  return null;
};
