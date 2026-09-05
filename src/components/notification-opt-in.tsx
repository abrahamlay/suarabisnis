"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

type Props = {
  /** Tenant slug for display */
  tenantName: string;
  /** Called after successful opt-in */
  onEnabled?: () => void;
};

const STORAGE_KEY = "suara_notif_optin_dismissed";

export function NotificationOptIn({ tenantName, onEnabled }: Props) {
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<"idle" | "requesting" | "granted" | "denied" | "unsupported">("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check support
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setState("unsupported");
      return;
    }

    // Already granted?
    if (Notification.permission === "granted") {
      setState("granted");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    // Show modal only if not dismissed before
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    // Delay 3s so user sees dashboard first
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  async function handleEnable() {
    setState("requesting");
    try {
      // Dynamic import to avoid SSR issues
      const [{ requestNotificationPermission, registerServiceWorker }] = await Promise.all([
        import("@/lib/firebase/client"),
      ]);

      // Register service worker first (required for background push)
      await registerServiceWorker();

      // Get FCM token (this also requests browser permission)
      const token = await requestNotificationPermission();
      if (!token) {
        setState("denied");
        return;
      }

      // Register token with server
      const res = await fetch("/api/notifications/register-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fcmToken: token,
          platform: "web",
          deviceName: navigator.userAgent,
        }),
      });

      if (res.ok) {
        setState("granted");
        onEnabled?.();
      } else {
        setState("denied");
      }
    } catch (err) {
      console.error("[opt-in] failed:", err);
      setState("denied");
    } finally {
      localStorage.setItem(STORAGE_KEY, "1");
      // Hide after 2s on success
      if (state !== "denied") {
        setTimeout(() => setVisible(false), 2000);
      } else {
        setVisible(false);
      }
    }
  }

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Aktifkan notifikasi"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm bg-white shadow-2xl rounded-2xl p-5 border border-slate-200 z-50"
    >
      <button
        onClick={handleDismiss}
        aria-label="Tutup"
        className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-slate-600"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-sky-600" />
        </div>
        <div className="flex-1">
          {state === "granted" ? (
            <>
              <h3 className="font-semibold text-slate-900">Notifikasi aktif</h3>
              <p className="text-sm text-slate-600 mt-1">
                Kamu akan dapat kabar saat ada kritik dan saran baru.
              </p>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-slate-900">Aktifkan notifikasi?</h3>
              <p className="text-sm text-slate-600 mt-1">
                Dapatkan kabar langsung di HP atau laptop saat {tenantName} menerima kritik dan
                saran baru.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleEnable}
                  disabled={state === "requesting"}
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                >
                  {state === "requesting" ? "Meminta izin..." : "Aktifkan"}
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-slate-500 hover:text-slate-700 px-3 py-2 text-sm"
                >
                  Nanti
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
