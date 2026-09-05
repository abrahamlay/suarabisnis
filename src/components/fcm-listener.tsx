"use client";

import { useEffect } from "react";
import { onForegroundMessage, registerServiceWorker } from "@/lib/firebase/client";

/**
 * Component to handle foreground push messages.
 * Renders nothing - just registers listeners.
 */
export function FcmListener({ onMessage }: { onMessage?: (payload: unknown) => void }) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register service worker on mount (idempotent)
    registerServiceWorker().catch(() => {});

    // Subscribe to foreground messages
    const unsubscribe = onForegroundMessage((payload) => {
      console.log("[fcm] foreground:", payload);
      onMessage?.(payload);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [onMessage]);

  return null;
}
