import { useState, useEffect } from "react";
import { Lock, Delete, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { biometricService } from "@/lib/biometric";
import { haptics } from "@/lib/haptics";

interface LockScreenProps {
  onUnlock: () => void;
  pinKey?: string;     // localStorage key holding the expected PIN (defaults to app PIN)
  title?: string;      // optional custom title (e.g. "Unlock Diary")
}

const LockScreen = ({ onUnlock, pinKey = "dailynova_app_pin", title = "Enter PIN" }: LockScreenProps) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  // Per-area PIN if set, otherwise fall back to the master app PIN
  const savedPin = localStorage.getItem(pinKey) || localStorage.getItem("dailynova_app_pin") || "";
  const biometricEnabled = localStorage.getItem("dailynova_biometric_enabled") === "true";

  useEffect(() => {
    if (biometricEnabled) {
      biometricService.isAvailable().then((result) => {
        setBiometricAvailable(result.available);
        if (result.available) {
          handleBiometric();
        }
      });
    }
  }, []);

  const handleBiometric = async () => {
    const success = await biometricService.authenticate();
    if (success) onUnlock();
  };

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    haptics.light();
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      if (newPin === savedPin) {
        haptics.success();
        onUnlock();
      } else {
        haptics.error();
        setError(true);
        setTimeout(() => {
          setPin("");
          setError(false);
        }, 800);
      }
    }
  };

  const handleDelete = () => {
    haptics.light();
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const dots = Array.from({ length: 4 }, (_, i) => (
    <div
      key={i}
      className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
        i < pin.length
          ? error
            ? "bg-destructive border-destructive"
            : "bg-primary border-primary"
          : "border-muted-foreground/50"
      } ${error ? "animate-shake" : ""}`}
    />
  ));

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <Lock className="w-12 h-12 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>

        <div className="flex gap-4 mb-4">{dots}</div>

        {error && (
          <p className="text-destructive text-sm -mt-2">Wrong PIN</p>
        )}

        <div className="grid grid-cols-3 gap-4">
          {digits.map((d, i) => {
            if (d === "") return <div key={i} />;
            if (d === "del")
              return (
                <Button
                  key={i}
                  variant="ghost"
                  className="w-16 h-16 rounded-full text-muted-foreground"
                  onClick={handleDelete}
                >
                  <Delete className="w-6 h-6" />
                </Button>
              );
            return (
              <button
                key={i}
                className="w-16 h-16 rounded-full text-xl font-semibold glass border border-border/50 text-foreground active:bg-primary active:text-primary-foreground active:scale-95 transition-transform duration-75"
                onClick={() => handleDigit(d)}
              >
                {d}
              </button>
            );
          })}
        </div>

        {biometricAvailable && biometricEnabled && (
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-primary mt-4"
            onClick={handleBiometric}
          >
            <Fingerprint className="w-6 h-6" />
            Use Fingerprint
          </Button>
        )}
      </div>
    </div>
  );
};

export default LockScreen;
