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
      await Haptics.vibrate({ duration: style === "success" ? 120 : 180 });
      return;
    }
    const impactMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    } as const;
    await Haptics.impact({ style: impactMap[style] });
    if (style === "heavy") await Haptics.vibrate({ duration: 90 });
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
    webVibrate(50);
  },
  heavy: () => {
    nativeImpact("heavy");
    webVibrate(90);
  },
  success: () => {
    nativeImpact("success");
    webVibrate([70, 45, 90]);
  },
  warning: () => {
    nativeImpact("warning");
    webVibrate([80, 70, 80]);
  },
  error: () => {
    nativeImpact("error");
    webVibrate([100, 60, 100]);
  },
};
