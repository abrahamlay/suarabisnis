"use server";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";

export async function updateTenantProfile(tenantId: string, name: string, slug: string, logoUrl: string | null) {
  const session = await requireSession();
  if (session.tenantId !== tenantId) return { error: "Forbidden" };

  // Slug uniqueness
  const conflict = await db.query.tenants.findFirst({
    where: and(eq(tenants.slug, slug), ne(tenants.id, tenantId)),
  });
  if (conflict) return { error: "Slug sudah dipakai tenant lain." };

  await db.update(tenants).set({ name, slug, logoUrl }).where(eq(tenants.id, tenantId));
  revalidatePath(`/app/${slug}/settings/general`);
  return { success: true };
}
