/**
 * Push notification trigger logic.
 * Called after key events (e.g. new feedback) to send push to relevant users.
 */
import "server-only";
import { db } from "@/db";
import { deviceTokens, users, notificationPreferences, notifications } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { sendPushMulticast } from "@/lib/firebase/admin";

/** Build notification content based on event type. */
function buildContent(opts: {
  branchName: string;
  rating: number | null;
  outcome: "positive" | "negative" | "neutral" | null;
}) {
  const stars = opts.rating ? "⭐".repeat(Math.max(0, Math.min(5, opts.rating))) : "";
  const isUrgent = opts.outcome === "negative";

  if (isUrgent) {
    return {
      title: "🚨 Komplain Baru",
      body: `${stars} Rating ${opts.rating}/5 di ${opts.branchName}. Ketuk untuk follow up.`,
      priority: "high" as const,
    };
  }
  if (opts.outcome === "positive") {
    return {
      title: "🔔 Feedback Positif",
      body: `${stars} ${opts.branchName} mendapat rating ${opts.rating}/5.`,
      priority: "normal" as const,
    };
  }
  return {
    title: "🔔 Feedback Baru",
    body: `${stars} ${opts.branchName}: rating ${opts.rating ?? "?"}/5.`,
    priority: "normal" as const,
  };
}

/** Check if current time is in user's quiet hours. */
function isInQuietHours(prefs: { quietHoursEnabled: number; quietHoursStart: string; quietHoursEnd: string }): boolean {
  if (!prefs.quietHoursEnabled) return false;

  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const start = prefs.quietHoursStart;
  const end = prefs.quietHoursEnd;

  if (start < end) {
    return hhmm >= start && hhmm <= end;
  }
  // Overnight (e.g. 22:00 - 07:00)
  return hhmm >= start || hhmm <= end;
}

/** Trigger push notifications for new feedback to all owners in the tenant. */
export async function triggerFeedbackNotification(opts: {
  tenantId: string;
  tenantSlug: string;
  feedbackId: string;
  outcome: "positive" | "negative" | "neutral" | null;
  rating: number | null;
  branchName: string;
}): Promise<{ sent: number; failed: number }> {
  try {
    // Get all owners of this tenant
    const recipients = await db.query.users.findMany({
      where: and(eq(users.tenantId, opts.tenantId), eq(users.role, "owner")),
    });

    if (recipients.length === 0) {
      return { sent: 0, failed: 0 };
    }

    let totalSent = 0;
    let totalFailed = 0;

    for (const user of recipients) {
      // Get user preferences
      let prefs = await db.query.notificationPreferences.findFirst({
        where: eq(notificationPreferences.userId, user.id),
      });

      // Default if not set
      const defaults = {
        pushEnabled: 1,
        notifyOnPositive: 0,
        notifyOnNegative: 1,
        notifyOnNeutral: 0,
        quietHoursEnabled: 0,
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
      };
      const effectivePrefs = { ...defaults, ...(prefs ?? {}) } as typeof defaults & typeof prefs;

      // Master toggle
      if (!effectivePrefs.pushEnabled) continue;

      // Per-event check
      if (opts.outcome === "negative" && !effectivePrefs.notifyOnNegative) continue;
      if (opts.outcome === "positive" && !effectivePrefs.notifyOnPositive) continue;
      if (opts.outcome === "neutral" && !effectivePrefs.notifyOnNeutral) continue;

      // Quiet hours
      if (effectivePrefs.quietHoursEnabled && isInQuietHours(effectivePrefs)) continue;

      // Get user's active devices
      const devices = await db.query.deviceTokens.findMany({
        where: and(eq(deviceTokens.userId, user.id), eq(deviceTokens.active, 1)),
      });

      if (devices.length === 0) continue;

      // Build content
      const content = buildContent({
        branchName: opts.branchName,
        rating: opts.rating,
        outcome: opts.outcome,
      });

      // Send
      const result = await sendPushMulticast(
        devices.map((d) => d.fcmToken),
        {
          title: content.title,
          body: content.body,
          priority: content.priority,
          data: {
            feedbackId: opts.feedbackId,
            clickAction: `/app/${opts.tenantSlug}/feedback/${opts.feedbackId}`,
            type: opts.outcome ?? "neutral",
            priority: content.priority,
          },
        }
      );

      totalSent += result.successCount;
      totalFailed += result.failureCount;

      // Clean up invalid tokens
      if (result.invalidTokens.length > 0) {
        await db
          .update(deviceTokens)
          .set({ active: 0, revokedAt: new Date() })
          .where(inArray(deviceTokens.fcmToken, result.invalidTokens));
      }

      // Log
      await db.insert(notifications).values({
        tenantId: opts.tenantId,
        userId: user.id,
        channel: "push",
        triggerType: `new_feedback_${opts.outcome ?? "neutral"}`,
        feedbackId: opts.feedbackId,
        status: result.successCount > 0 ? "sent" : "failed",
        title: content.title,
        body: content.body,
        sentAt: result.successCount > 0 ? new Date() : null,
      });
    }

    return { sent: totalSent, failed: totalFailed };
  } catch (err) {
    console.error("[trigger-feedback-notification] failed:", err);
    return { sent: 0, failed: 0 };
  }
}
