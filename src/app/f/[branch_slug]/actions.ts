"use server";
import { db } from "@/db";
import { feedback, branches, tenants, visits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashIp } from "@/lib/helpers";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function submitFeedback(formData: FormData) {
  const tenantId = formData.get("tenantId") as string;
  const branchId = formData.get("branchId") as string;
  const categoryId = (formData.get("categoryId") as string) || null;
  const message = formData.get("message") as string;
  const ratingStr = formData.get("rating") as string;
  const customerName = (formData.get("customerName") as string) || null;
  const customerContact = (formData.get("customerContact") as string) || null;

  const rating = ratingStr && ratingStr !== "0" ? parseInt(ratingStr) : null;

  // message is optional: positive flow submits rating-only feedback before
  // sending the customer to Google review.
  const msgText = ((formData.get("message") as string) || "").trim();
  if (!tenantId || !branchId || (!msgText && rating === null)) {
    return { error: "Data tidak lengkap" };
  }

  // Hash IP for privacy
  let ipHash: string | null = null;
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "unknown";
    ipHash = await hashIp(ip);
  } catch {}

  // Determine outcome from rating (1-2 = negative, 3 = neutral, 4-5 = positive)
  const outcome: "positive" | "negative" | "neutral" | null =
    rating === null ? null : rating <= 2 ? "negative" : rating === 3 ? "neutral" : "positive";

  // Insert feedback
  const inserted = await db
    .insert(feedback)
    .values({
      tenantId,
      branchId,
      categoryId,
      message: msgText || `(rating ${rating ?? "-"} bintang saja)`,
      rating,
      outcome,
      customerName,
      customerContact,
      ipHash,
    })
    .returning();

  const newFeedback = inserted[0];

  // Trigger push notification (non-blocking, errors are logged but don't affect response)
  if (newFeedback) {
    try {
      // Fetch tenant + branch info for the notification
      const [tenant, branch] = await Promise.all([
        db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) }),
        db.query.branches.findFirst({ where: eq(branches.id, branchId) }),
      ]);

      if (tenant && branch) {
        const { triggerFeedbackNotification } = await import("@/lib/firebase/triggers");
        // Fire and forget
        triggerFeedbackNotification({
          tenantId,
          tenantSlug: tenant.slug,
          feedbackId: newFeedback.id,
          outcome,
          rating,
          branchName: branch.name,
        }).catch((err) => console.error("[submitFeedback] push trigger failed:", err));
      }
    } catch (err) {
      console.error("[submitFeedback] push import error:", err);
    }
  }

  return { success: true };
}

/**
 * Server Action: track a visit action (clicked_google, submitted_feedback, bounced).
 * Called from the public form client component.
 */
export async function trackVisit(input: {
  visitId: string;
  action: "clicked_google" | "submitted_feedback" | "bounced";
  durationMs?: number;
}) {
  try {
    await db
      .update(visits)
      .set({
        action: input.action,
        durationMs: input.durationMs ?? null,
      })
      .where(eq(visits.id, input.visitId));
    return { success: true };
  } catch (err) {
    console.error("[trackVisit] failed:", err);
    return { error: "Failed to track visit" };
  }
}
