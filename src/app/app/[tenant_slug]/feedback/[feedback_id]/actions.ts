"use server";
import { db } from "@/db";
import { feedback, feedbackReplies, feedbackNotes, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";

export async function addReply(feedbackId: string, message: string, authorName: string) {
  const session = await requireSession();
  // Verify feedback belongs to tenant
  const item = await db.query.feedback.findFirst({ where: eq(feedback.id, feedbackId) });
  if (!item || item.tenantId !== session.tenantId) throw new Error("Forbidden");

  await db.insert(feedbackReplies).values({
    feedbackId,
    userId: session.userId,
    message,
    authorName,
  });
  revalidatePath(`/app/${session.tenantSlug}/feedback`);
  revalidatePath(`/app/${session.tenantSlug}/feedback/${feedbackId}`);
  return { success: true };
}

export async function updateStatus(feedbackId: string, status: "open" | "in_progress" | "closed") {
  const session = await requireSession();
  const item = await db.query.feedback.findFirst({ where: eq(feedback.id, feedbackId) });
  if (!item || item.tenantId !== session.tenantId) throw new Error("Forbidden");

  await db.update(feedback).set({ status }).where(eq(feedback.id, feedbackId));
  revalidatePath(`/app/${session.tenantSlug}/feedback`);
  revalidatePath(`/app/${session.tenantSlug}/feedback/${feedbackId}`);
  return { success: true };
}

export async function updatePriority(feedbackId: string, priority: "low" | "medium" | "high") {
  const session = await requireSession();
  const item = await db.query.feedback.findFirst({ where: eq(feedback.id, feedbackId) });
  if (!item || item.tenantId !== session.tenantId) throw new Error("Forbidden");

  await db.update(feedback).set({ priority }).where(eq(feedback.id, feedbackId));
  revalidatePath(`/app/${session.tenantSlug}/feedback`);
  return { success: true };
}

/**
 * Phase 2: add an internal note (only visible to the team, never to the customer).
 * Looks up the user's display name from the users table.
 */
export async function addNote(feedbackId: string, note: string) {
  const session = await requireSession();
  const item = await db.query.feedback.findFirst({ where: eq(feedback.id, feedbackId) });
  if (!item || item.tenantId !== session.tenantId) throw new Error("Forbidden");

  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  const authorName = user?.name || user?.email?.split("@")[0] || "Owner";

  await db.insert(feedbackNotes).values({
    feedbackId,
    userId: session.userId,
    authorName,
    note,
  });
  revalidatePath(`/app/${session.tenantSlug}/feedback/${feedbackId}`);
  return { success: true };
}

export async function deleteNote(noteId: string) {
  const session = await requireSession();
  const note = await db.query.feedbackNotes.findFirst({ where: eq(feedbackNotes.id, noteId) });
  if (!note) return { success: true };
  // Verify ownership
  const item = await db.query.feedback.findFirst({ where: eq(feedback.id, note.feedbackId) });
  if (!item || item.tenantId !== session.tenantId) throw new Error("Forbidden");
  // Only author or owner can delete
  if (note.userId !== session.userId && session.role !== "owner") {
    throw new Error("Forbidden");
  }
  await db.delete(feedbackNotes).where(eq(feedbackNotes.id, noteId));
  revalidatePath(`/app/${session.tenantSlug}/feedback/${note.feedbackId}`);
  return { success: true };
}
