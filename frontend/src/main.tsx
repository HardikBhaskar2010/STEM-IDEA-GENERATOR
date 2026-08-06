import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initPostHog } from "./lib/posthog";
import "./index.css";

initPostHog();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}
createRoot(rootElement).render(<App />);
