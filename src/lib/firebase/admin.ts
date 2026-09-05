/**
 * Firebase Admin SDK (Server-side)
 * Used for: SENDING push notifications to user devices.
 * Lazy initialization - only connects to Firebase when actually sending.
 */
import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin";
import { getMessaging } from "firebase-admin/messaging";

let initialized = false;
let appInstance: App | null = null;

function getFirebaseApp(): App | null {
  if (initialized) return appInstance;
  if (typeof window !== "undefined") return null; // Server-only

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  // Systemd may pass env values with surrounding quotes literally — strip them.
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }

  try {
    if (getApps().length === 0) {
      appInstance = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          // Replace literal \n (from .env) with actual newlines
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });
    } else {
      appInstance = getApps()[0]!;
    }
    initialized = true;
    return appInstance;
  } catch (err) {
    console.error("Firebase admin init failed:", err);
    return null;
  }
}

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
  priority?: "normal" | "high";
};

/** Send to a single device token. */
export async function sendPushToToken(
  fcmToken: string,
  payload: PushPayload
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const app = getFirebaseApp();
  if (!app) return { success: false, error: "firebase_admin_not_configured" };

  try {
    const message = {
      token: fcmToken,
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
      android: {
        priority: payload.priority === "high" ? ("high" as const) : ("normal" as const),
        notification: { sound: "default", channelId: "suara_bisnis_feedback" },
      },
      apns: { payload: { aps: { sound: "default", badge: 1 } } },
      webpush: {
        headers: { Urgency: payload.priority === "high" ? "high" : "normal" },
        notification: {
          icon: "/icon-192x192.png",
          badge: "/badge-72x72.png",
          requireInteraction: payload.priority === "high",
        },
      },
    };

    const messageId = await getMessaging(app).send(message);
    return { success: true, messageId };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "messaging/registration-token-not-registered") {
      return { success: false, error: "invalid_token" };
    }
    return { success: false, error: String((err as Error)?.message ?? err) };
  }
}

/** Send to multiple devices. Returns counts and list of invalid tokens to clean up. */
export async function sendPushMulticast(
  fcmTokens: string[],
  payload: PushPayload
): Promise<{ successCount: number; failureCount: number; invalidTokens: string[] }> {
  const app = getFirebaseApp();
  if (!app || fcmTokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  try {
    const response = await getMessaging(app).sendEachForMulticast({
      tokens: fcmTokens,
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
      android: { priority: payload.priority === "high" ? "high" : "normal" },
      apns: { payload: { aps: { sound: "default" } } },
      webpush: { headers: { Urgency: payload.priority === "high" ? "high" : "normal" } },
    });

    const invalidTokens: string[] = [];
    response.responses.forEach((resp: { error?: { code?: string } }, idx: number) => {
      if (resp.error?.code === "messaging/registration-token-not-registered") {
        invalidTokens.push(fcmTokens[idx]);
      }
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens,
    };
  } catch (err) {
    console.error("[push] multicast send failed:", err);
    return { successCount: 0, failureCount: fcmTokens.length, invalidTokens: [] };
  }
}

/** Check if Firebase admin is configured. */
export function isPushConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}
