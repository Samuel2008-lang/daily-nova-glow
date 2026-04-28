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

// Auto-blur tapped buttons/links so focus highlight doesn't linger on touch devices
if (typeof window !== "undefined") {
  const clearPressedElement = (e: Event) => {
    const t = e.target as HTMLElement | null;
    if (!t) return;
    const el = t.closest("button, a, input, textarea, [role='button'], [data-state]") as HTMLElement | null;
    if (el) {
      // Defer so click handlers still fire normally before we blur
      setTimeout(() => {
        el.blur();
        if (document.activeElement instanceof HTMLElement && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
          document.activeElement.blur();
        }
      }, 80);
    }
  };
  document.addEventListener("touchend", clearPressedElement, { passive: true });
  document.addEventListener("pointerup", clearPressedElement, { passive: true });
}

createRoot(document.getElementById("root")!).render(<App />);
