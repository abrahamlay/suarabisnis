"use server";

import { activateSubscription } from "@/lib/billing";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { Plan } from "@/db/schema";

export async function mockActivateAction(tenantId: string, plan: Plan): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession();
  if (tenantId !== session.tenantId) {
    return { success: false, error: "Forbidden" };
  }
  if (!["basic", "pro"].includes(plan)) {
    return { success: false, error: "Plan tidak valid" };
  }

  await activateSubscription(tenantId, plan);

  // Bust the caches for tenant + dashboard
  revalidatePath("/pricing");
  revalidatePath(`/app/${session.tenantSlug}`);
  revalidatePath("/onboarding");

  return { success: true };
}