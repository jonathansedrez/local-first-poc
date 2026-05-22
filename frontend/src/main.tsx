import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { db, initDb } from "./db.ts";

// export window to DB to enable debug at browser console
(window as any).db = db;

initDb().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
