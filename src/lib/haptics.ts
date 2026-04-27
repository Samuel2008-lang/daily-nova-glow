// Cross-platform haptic feedback utility.
// Uses Capacitor Haptics on native, navigator.vibrate fallback on web.

type Style = "light" | "medium" | "heavy" | "success" | "warning" | "error";

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
  light: () => {
    nativeImpact("light");
    webVibrate(15);
  },
  medium: () => {
    nativeImpact("medium");
    webVibrate(30);
  },
  heavy: () => {
    nativeImpact("heavy");
    webVibrate(55);
  },
  success: () => {
    nativeImpact("success");
    webVibrate([30, 45, 30]);
  },
  warning: () => {
    nativeImpact("warning");
    webVibrate([35, 70, 35]);
  },
  error: () => {
    nativeImpact("error");
    webVibrate([55, 35, 55]);
  },
};
