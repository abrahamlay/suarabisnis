"use server";
import { db } from "@/db";
import { branches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { canAddBranch } from "@/lib/modules";

async function ensureOwnership(branchId: string, tenantId: string) {
  const b = await db.query.branches.findFirst({ where: eq(branches.id, branchId) });
  if (!b || b.tenantId !== tenantId) throw new Error("Forbidden");
}

export async function addBranch(tenantId: string, name: string, slug: string, address: string, googlePlaceId: string) {
  const session = await requireSession();
  if (session.tenantId !== tenantId) return { error: "Forbidden" };

  const tenant = await db.query.tenants.findFirst({ where: eq((await import("@/db/schema")).tenants.id, tenantId) });
  if (!tenant) return { error: "Tenant not found" };

  const allBranches = await db.query.branches.findMany({ where: eq(branches.tenantId, tenantId) });
  if (!canAddBranch(tenant.plan as "free" | "basic" | "pro", allBranches.length)) {
    return { error: `Plan ${tenant.plan} terbatas. Upgrade untuk tambah cabang.` };
  }

  // Check slug uniqueness within tenant
  if (allBranches.find((b) => b.slug === slug)) {
    return { error: "Slug sudah dipakai cabang lain. Pakai slug lain." };
  }

  await db.insert(branches).values({
    tenantId,
    name,
    slug,
    address: address || null,
    googlePlaceId: googlePlaceId || null,
  });

  revalidatePath(`/app/${session.tenantSlug}/settings/branches`);
  return { success: true };
}

export async function updateBranch(branchId: string, name: string, slug: string, address: string, googlePlaceId: string) {
  const session = await requireSession();
  await ensureOwnership(branchId, session.tenantId);
  await db.update(branches).set({
    name,
    slug,
    address: address || null,
    googlePlaceId: googlePlaceId || null,
  }).where(eq(branches.id, branchId));
  revalidatePath(`/app/${session.tenantSlug}/settings/branches`);
}

export async function deleteBranch(branchId: string) {
  const session = await requireSession();
  await ensureOwnership(branchId, session.tenantId);
  await db.delete(branches).where(eq(branches.id, branchId));
  revalidatePath(`/app/${session.tenantSlug}/settings/branches`);
}
