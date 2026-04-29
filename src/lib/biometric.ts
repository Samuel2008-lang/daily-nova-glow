import { Capacitor } from "@capacitor/core";

interface BiometricResult {
  available: boolean;
  biometryType?: string;
  reason?: string;
}

export const biometricService = {
  async isAvailable(): Promise<BiometricResult> {
    if (!Capacitor.isNativePlatform()) {
      return { available: false, reason: "Biometrics work only in the installed mobile app." };
    }
    try {
      const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
      const result = await NativeBiometric.isAvailable();
      return {
        available: result.isAvailable,
        biometryType: String(result.biometryType),
        reason: result.isAvailable ? undefined : "No fingerprint or face unlock is enrolled on this phone.",
      };
    } catch (error) {
      return { available: false, reason: error instanceof Error ? error.message : "Biometric plugin is not ready. Sync and rebuild the native app." };
    }
  },

  async authenticate(reason = "Unlock DailyNova"): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
      await NativeBiometric.verifyIdentity({ reason, title: "DailyNova", subtitle: "Confirm your identity" });
      return true;
    } catch {
      return false;
    }
  },
};
