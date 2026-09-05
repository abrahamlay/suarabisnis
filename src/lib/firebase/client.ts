/**
 * Firebase Client SDK (Browser)
 * Used for: requesting notification permission, getting FCM token, foreground messages.
 * Singleton pattern to avoid re-init on Next.js hot reload.
 */
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;

/** Lazily initialize Firebase app. Returns null if not configured (e.g. in dev). */
function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (!firebaseConfig.apiKey) {
    // Not configured - push notifications disabled
    return null;
  }
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

/** Get FCM Messaging instance. Returns null if not supported (e.g. iOS Safari < 16.4). */
export async function getMessagingInstance(): Promise<Messaging | null> {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;

  const supported = await isSupported();
  if (!supported) return null;

  return getMessaging(firebaseApp);
}

/** Request browser permission and get FCM token. */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window)) return null;

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  // Get FCM token
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.error("VAPID key not configured");
    return null;
  }

  try {
    const token = await getToken(messaging, { vapidKey });
    return token;
  } catch (err) {
    console.error("Failed to get FCM token:", err);
    return null;
  }
}

/** Listen for foreground messages (when tab is open). */
export function onForegroundMessage(callback: (payload: unknown) => void): () => void {
  let unsubscribe: (() => void) | null = null;

  (async () => {
    const messaging = await getMessagingInstance();
    if (!messaging) return;
    unsubscribe = onMessage(messaging, (payload) => {
      callback(payload);
    });
  })();

  return () => {
    if (unsubscribe) unsubscribe();
  };
}

/** Register the service worker for background push. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    return registration;
  } catch (err) {
    console.error("Service worker registration failed:", err);
    return null;
  }
}
