import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// One-time PIN reset (clears any existing PIN/lock settings)
if (!localStorage.getItem("dailynova_pin_reset_v1")) {
  localStorage.removeItem("dailynova_app_pin");
  localStorage.removeItem("dailynova_lock_enabled");
  localStorage.removeItem("dailynova_lock_diary");
  localStorage.removeItem("dailynova_lock_journal");
  localStorage.removeItem("dailynova_biometric_enabled");
  localStorage.setItem("dailynova_pin_reset_v1", "true");
}

createRoot(document.getElementById("root")!).render(<App />);
