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
  document.addEventListener("touchend", (e) => {
    const t = e.target as HTMLElement | null;
    if (!t) return;
    const el = t.closest("button, a, [role='button']") as HTMLElement | null;
    if (el) {
      // Defer so click handlers still fire normally before we blur
      setTimeout(() => el.blur(), 0);
    }
  }, { passive: true });
}

createRoot(document.getElementById("root")!).render(<App />);
