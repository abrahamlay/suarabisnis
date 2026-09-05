"use server";
import { db } from "@/db";
import { feedback, feedbackReplies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function addReply(feedbackId: string, message: string, authorName: string) {
  await db.insert(feedbackReplies).values({
    feedbackId,
    message,
    authorName,
  });
  revalidatePath(`/admin`);
  return { success: true };
}

export async function updateStatus(feedbackId: string, status: "open" | "in_progress" | "closed") {
  await db.update(feedback).set({ status }).where(eq(feedback.id, feedbackId));
  revalidatePath(`/admin`);
  return { success: true };
}
