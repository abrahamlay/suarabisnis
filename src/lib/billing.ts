// Mock billing for MVP — simulates Stripe checkout success/cancel.
// In production, swap with real Stripe Checkout sessions + webhooks.

import { db } from "@/db";
import { subscriptions, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import type { Plan } from "@/db/schema";

export async function createCheckoutSession(tenantId: string, plan: Plan, successUrl: string): Promise<{ url: string; sessionId: string }> {
  const sessionId = "mock_cs_" + crypto.randomBytes(12).toString("hex");
  // In real Stripe, this returns a hosted checkout URL.
  // For mock, we return a URL that simulates the flow.
  const url = `/billing/mock-checkout?session=${sessionId}&tenant=${tenantId}&plan=${plan}&return=${encodeURIComponent(successUrl)}`;
  return { url, sessionId };
}

export async function activateSubscription(tenantId: string, plan: Plan): Promise<void> {
  // Cancel any existing subscription
  await db.delete(subscriptions).where(eq(subscriptions.tenantId, tenantId));

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await db.insert(subscriptions).values({
    tenantId,
    plan,
    status: "active",
    currentPeriodEnd: periodEnd,
    mockSubscriptionId: "mock_sub_" + crypto.randomBytes(8).toString("hex"),
  });

  // Update tenant plan
  await db.update(tenants).set({ plan }).where(eq(tenants.id, tenantId));
}

export async function cancelSubscription(tenantId: string): Promise<void> {
  await db.update(subscriptions)
    .set({ status: "canceled" })
    .where(eq(subscriptions.tenantId, tenantId));
  await db.update(tenants).set({ plan: "free" }).where(eq(tenants.id, tenantId));
}

export async function getActiveSubscription(tenantId: string) {
  const rows = await db.select().from(subscriptions)
    .where(eq(subscriptions.tenantId, tenantId))
    .all();
  return rows.find((s) => s.status === "active") || null;
}
