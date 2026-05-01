import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// One-time PIN reset (clears any existing PIN/lock settings)
if (!localStorage.getItem("dailynova_pin_reset_v1")) {
  localStorage.removeItem("dailynova_app_pin");
  localStorage.removeItem("dailynova_lock_enabled");
  localStorage.removeItem("dailynova_lock_diary");
  localStorage.removeItem("dailynova_lock_journal");
  localStorage.setItem("dailynova_pin_reset_v1", "true");
}

// Auto-blur tapped buttons/links (NEVER inputs/textareas — that closes the keyboard)
if (typeof window !== "undefined") {
  const clearPressedElement = (e: Event) => {
    const t = e.target as HTMLElement | null;
    if (!t) return;
    // Skip anything that should keep focus (text fields, editors, contenteditable)
    const keepFocus = t.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']");
    if (keepFocus) return;
    const el = t.closest("button, a, [role='button']") as HTMLElement | null;
    if (!el) return;
    setTimeout(() => {
      // Don't steal focus from a text field that the click may have opened
      const active = document.activeElement;
      if (active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) return;
      el.blur();
    }, 80);
  };
  document.addEventListener("touchend", clearPressedElement, { passive: true });
  document.addEventListener("pointerup", clearPressedElement, { passive: true });
}

createRoot(document.getElementById("root")!).render(<App />);
