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

/**
 * PinGate: gates content behind a PIN.
 * IMPORTANT: unlocked state is persisted in sessionStorage so navigating
 * between pages does NOT re-prompt for the PIN within the same session.
 */
const PinGate = ({ storageKey, pinKey, title, children }: PinGateProps) => {
  const sessionKey = `${storageKey}__unlocked`;
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(sessionKey) === "true");

  const hasAreaPin = pinKey && localStorage.getItem(pinKey);
  const hasAppPin = localStorage.getItem("dailynova_app_pin");
  const isLockActive =
    localStorage.getItem(storageKey) === "true" &&
    (hasAreaPin || (localStorage.getItem("dailynova_lock_enabled") === "true" && hasAppPin));

  if (isLockActive && !unlocked) {
    return (
      <LockScreen
        onUnlock={() => {
          sessionStorage.setItem(sessionKey, "true");
          setUnlocked(true);
        }}
        pinKey={pinKey}
        title={title}
      />
    );
  }

  return <>{children}</>;
};

export default PinGate;
