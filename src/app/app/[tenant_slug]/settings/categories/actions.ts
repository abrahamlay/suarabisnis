"use server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";

async function ensureOwnership(categoryId: string, tenantId: string) {
  const cat = await db.query.categories.findFirst({ where: eq(categories.id, categoryId) });
  if (!cat || cat.tenantId !== tenantId) throw new Error("Forbidden");
}

export async function addCategory(tenantId: string, name: string) {
  const session = await requireSession();
  if (session.tenantId !== tenantId) throw new Error("Forbidden");

  const existing = await db.query.categories.findMany({ where: eq(categories.tenantId, tenantId) });
  await db.insert(categories).values({
    tenantId,
    name,
    order: existing.length,
    active: 1,
  });
  revalidatePath(`/app/${session.tenantSlug}/settings/categories`);
}

export async function updateCategory(categoryId: string, name: string) {
  const session = await requireSession();
  await ensureOwnership(categoryId, session.tenantId);
  await db.update(categories).set({ name }).where(eq(categories.id, categoryId));
  revalidatePath(`/app/${session.tenantSlug}/settings/categories`);
}

export async function deleteCategory(categoryId: string) {
  const session = await requireSession();
  await ensureOwnership(categoryId, session.tenantId);
  await db.delete(categories).where(eq(categories.id, categoryId));
  revalidatePath(`/app/${session.tenantSlug}/settings/categories`);
}

export async function toggleCategory(categoryId: string, active: number) {
  const session = await requireSession();
  await ensureOwnership(categoryId, session.tenantId);
  await db.update(categories).set({ active }).where(eq(categories.id, categoryId));
  revalidatePath(`/app/${session.tenantSlug}/settings/categories`);
}
