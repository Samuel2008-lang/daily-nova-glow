import { Capacitor } from "@capacitor/core";

interface BiometricResult {
  available: boolean;
  biometryType?: string;
}

export const biometricService = {
  async isAvailable(): Promise<BiometricResult> {
    if (!Capacitor.isNativePlatform()) {
      return { available: false };
    }
    try {
      const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
      const result = await NativeBiometric.isAvailable();
      return {
        available: result.isAvailable,
        biometryType: String(result.biometryType),
      };
    } catch {
      return { available: false };
    }
  },

  async authenticate(reason = "Unlock DailyNova"): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
      await NativeBiometric.verifyIdentity({ reason, title: "DailyNova" });
      return true;
    } catch {
      return false;
    }
  },
};
