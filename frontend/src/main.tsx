import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { db, initDb } from "./db.ts";
import { outboxQueue } from "./outbox.ts";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// export to browser console for debugging
(window as any).db = db;
(window as any).outboxQueue = outboxQueue;

// trigger process after reconnect
window.addEventListener("online", () => outboxQueue.process(BACKEND_URL));

// poll every 5s
setInterval(() => outboxQueue.process(BACKEND_URL), 5000);

initDb().then(() => {
  outboxQueue.process(BACKEND_URL);
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
