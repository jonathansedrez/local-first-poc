import { useState, useEffect } from "react";

type Status = "offline" | "online" | null;

export const ConnectionToast = () => {
  const [status, setStatus] = useState<Status>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>;

    const handleOffline = () => {
      clearTimeout(hideTimer);
      setStatus("offline");
      setVisible(true);
    };

    const handleOnline = () => {
      clearTimeout(hideTimer);
      setStatus("online");
      setVisible(true);
      hideTimer = setTimeout(() => setVisible(false), 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!status) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? "0" : "80px"})`,
        opacity: visible ? 1 : 0,
        transition: "transform 0.3s ease, opacity 0.3s ease",
        padding: "12px 20px",
        borderRadius: 4,
        fontSize: 14,
        fontWeight: 500,
        color: "#fff",
        backgroundColor: status === "offline" ? "#282828" : "#1a6b3c",
        boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
        zIndex: 9999,
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {status === "offline" ? "No internet connection" : "Back online"}
    </div>
  );
};
