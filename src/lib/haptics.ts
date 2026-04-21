// Cross-platform haptic feedback utility.
// Uses Capacitor Haptics on native, navigator.vibrate fallback on web.

import { Capacitor } from "@capacitor/core";

type Style = "light" | "medium" | "heavy" | "success" | "warning" | "error";

const isNative = (() => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
})();

async function nativeImpact(style: Style) {
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
    if (style === "success" || style === "warning" || style === "error") {
      const map = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error,
      } as const;
      await Haptics.notification({ type: map[style] });
      return;
    }
    const impactMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    } as const;
    await Haptics.impact({ style: impactMap[style] });
  } catch {
    // ignore — plugin not available
  }
}

function webVibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // ignore
  }
}

export const haptics = {
  light: () => (isNative ? nativeImpact("light") : webVibrate(10)),
  medium: () => (isNative ? nativeImpact("medium") : webVibrate(20)),
  heavy: () => (isNative ? nativeImpact("heavy") : webVibrate(40)),
  success: () => (isNative ? nativeImpact("success") : webVibrate([15, 40, 15])),
  warning: () => (isNative ? nativeImpact("warning") : webVibrate([20, 60, 20])),
  error: () => (isNative ? nativeImpact("error") : webVibrate([40, 30, 40])),
};
