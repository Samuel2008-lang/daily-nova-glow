import { useState } from "react";
import { Lock, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PinSetupProps {
  onComplete: (pin: string) => void;
  onCancel: () => void;
}

const PinSetup = ({ onComplete, onCancel }: PinSetupProps) => {
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [firstPin, setFirstPin] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      if (step === "create") {
        setFirstPin(newPin);
        setPin("");
        setStep("confirm");
      } else {
        if (newPin === firstPin) {
          onComplete(newPin);
        } else {
          setError(true);
          setTimeout(() => {
            setPin("");
            setError(false);
          }, 800);
        }
      }
    }
  };

  const handleDelete = () => {
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
      }`}
    />
  ));

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <Lock className="w-12 h-12 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">
          {step === "create" ? "Create PIN" : "Confirm PIN"}
        </h2>

        <div className="flex gap-4 mb-4">{dots}</div>

        {error && (
          <p className="text-destructive text-sm -mt-2">PINs don't match. Try again.</p>
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
                onTouchEnd={() => handleDigit(d)}
                onMouseUp={() => handleDigit(d)}
                onMouseDown={(e) => e.preventDefault()}
              >
                {d}
              </button>
            );
          })}
        </div>

        <Button variant="ghost" className="text-muted-foreground mt-4" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default PinSetup;
