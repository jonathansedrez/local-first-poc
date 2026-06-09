import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { db, initDb } from "./db.ts";
import { outboxQueue } from "./outbox.ts";
import { inboxSync } from "./inbox.ts";
import { todoStore } from "./store.ts";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// export to browser console for debugging
(window as any).db = db;
(window as any).outboxQueue = outboxQueue;
(window as any).inboxSync = inboxSync;
(window as any).todoStore = todoStore;

window.addEventListener("online", () => outboxQueue.process(BACKEND_URL));

setInterval(() => outboxQueue.process(BACKEND_URL), 5000);

initDb().then(async () => {
  await todoStore.load();
  outboxQueue.process(BACKEND_URL);
  inboxSync.connect(BACKEND_URL);

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
