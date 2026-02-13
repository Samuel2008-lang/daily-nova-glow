import { useState } from "react";
import LockScreen from "./LockScreen";

interface PinGateProps {
  storageKey: string;
  children: React.ReactNode;
}

const PinGate = ({ storageKey, children }: PinGateProps) => {
  const [unlocked, setUnlocked] = useState(false);

  const isLockActive =
    localStorage.getItem("dailynova_lock_enabled") === "true" &&
    localStorage.getItem(storageKey) === "true" &&
    localStorage.getItem("dailynova_app_pin");

  if (isLockActive && !unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }

  return <>{children}</>;
};

export default PinGate;
