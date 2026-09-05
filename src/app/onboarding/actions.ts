"use server";

import { db } from "@/db";
import { tenants, branches } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { slugify } from "@/lib/helpers";
import { createCheckoutSession } from "@/lib/billing";
import type { Plan } from "@/db/schema";

export type OnboardingResult = { error?: string; success?: boolean };

function ensureOwnership(tenantId: string, sessionTenantId: string) {
  if (tenantId !== sessionTenantId) {
    throw new Error("Forbidden");
  }
}

export async function updateTenantProfile(tenantId: string, name: string, slug: string): Promise<OnboardingResult> {
  const session = await requireSession();
  ensureOwnership(tenantId, session.tenantId);

  const trimmedName = name.trim();
  const trimmedSlug = slugify(slug);
  if (!trimmedName) return { error: "Nama bisnis wajib diisi." };
  if (!trimmedSlug) return { error: "Slug tidak valid." };

  // Validate slug uniqueness (excluding current tenant)
  const conflict = await db.query.tenants.findFirst({
    where: and(eq(tenants.slug, trimmedSlug), ne(tenants.id, tenantId)),
  });
  if (conflict) return { error: "Slug sudah dipakai bisnis lain. Pilih slug lain." };

  await db.update(tenants).set({ name: trimmedName, slug: trimmedSlug }).where(eq(tenants.id, tenantId));

  revalidatePath("/onboarding");
  revalidatePath(`/app/${trimmedSlug}`);
  return { success: true };
}

export async function addBranch(tenantId: string, name: string, slug: string, address: string): Promise<OnboardingResult> {
  const session = await requireSession();
  ensureOwnership(tenantId, session.tenantId);

  const trimmedName = name.trim();
  const trimmedSlug = slugify(slug);
  const trimmedAddress = address.trim();
  if (!trimmedName) return { error: "Nama cabang wajib diisi." };
  if (!trimmedSlug) return { error: "Slug cabang tidak valid." };

  // Validate branch slug uniqueness within tenant
  const conflict = await db.query.branches.findFirst({
    where: and(eq(branches.tenantId, tenantId), eq(branches.slug, trimmedSlug)),
  });
  if (conflict) return { error: "Slug cabang sudah dipakai di bisnis ini." };

  await db.insert(branches).values({
    tenantId,
    name: trimmedName,
    slug: trimmedSlug,
    address: trimmedAddress || null,
  });

  revalidatePath("/onboarding");
  return { success: true };
}

export async function completeOnboarding(_tenantId: string): Promise<OnboardingResult> {
  // Onboarding is implicitly completed when user reaches /app — no separate flag needed.
  // This is a no-op that we keep so the wizard flow has a clear final action.
  const session = await requireSession();
  redirect(`/app/${session.tenantSlug}`);
}

export async function choosePlan(tenantId: string, plan: Plan): Promise<{ url: string } | { error: string }> {
  const session = await requireSession();
  ensureOwnership(tenantId, session.tenantId);

  if (plan === "free") {
    // For free we just confirm and go to app
    redirect(`/app/${session.tenantSlug}`);
  }

  const successUrl = `/app/${session.tenantSlug}`;
  const { url } = await createCheckoutSession(tenantId, plan, successUrl);
  return { url };
}