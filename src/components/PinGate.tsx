import { useState } from "react";
import LockScreen from "./LockScreen";

interface PinGateProps {
  /** "dailynova_diary_lock" or "dailynova_journal_lock" — toggle that enables this gate */
  storageKey: string;
  /** Optional per-area PIN key (e.g. "dailynova_diary_pin"). Falls back to the app PIN. */
  pinKey?: string;
  /** Lock screen title (e.g. "Unlock Diary") */
  title?: string;
  children: React.ReactNode;
}

const PinGate = ({ storageKey, pinKey, title, children }: PinGateProps) => {
  const [unlocked, setUnlocked] = useState(false);

  const hasAreaPin = pinKey && localStorage.getItem(pinKey);
  const hasAppPin = localStorage.getItem("dailynova_app_pin");
  // The area is locked when its toggle is on AND we have a PIN to verify against
  // (either a per-area PIN or, as fallback, the app PIN).
  const isLockActive =
    localStorage.getItem(storageKey) === "true" &&
    (hasAreaPin || (localStorage.getItem("dailynova_lock_enabled") === "true" && hasAppPin));

  if (isLockActive && !unlocked) {
    return (
      <LockScreen
        onUnlock={() => setUnlocked(true)}
        pinKey={pinKey}
        title={title}
      />
    );
  }

  return <>{children}</>;
};

export default PinGate;
