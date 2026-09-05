"use server";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";

export async function updateBranding(formData: FormData) {
  const tenantSlug = formData.get("tenantSlug") as string;
  if (!tenantSlug) return { error: "Missing tenant slug" };

  const session = await getSession();
  if (!session || session.tenantSlug !== tenantSlug) {
    return { error: "Unauthorized" };
  }

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenantSlug) });
  if (!tenant) return { error: "Tenant not found" };

  const updates: Partial<{
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    accentColor: string;
    greetingText: string;
    thankYouText: string;
  }> = {};

  const name = (formData.get("name") as string | null)?.trim();
  if (name) updates.name = name.slice(0, 100);

  const logoUrl = (formData.get("logoUrl") as string | null)?.trim();
  if (logoUrl !== null) updates.logoUrl = logoUrl || null;

  const primaryColor = formData.get("primaryColor") as string | null;
  if (primaryColor && /^#[0-9a-fA-F]{6}$/.test(primaryColor)) {
    updates.primaryColor = primaryColor;
  }

  const accentColor = formData.get("accentColor") as string | null;
  if (accentColor && /^#[0-9a-fA-F]{6}$/.test(accentColor)) {
    updates.accentColor = accentColor;
  }

  const greetingText = (formData.get("greetingText") as string | null)?.trim();
  if (greetingText !== undefined) updates.greetingText = greetingText.slice(0, 200);

  const thankYouText = (formData.get("thankYouText") as string | null)?.trim();
  if (thankYouText !== undefined) updates.thankYouText = thankYouText.slice(0, 300);

  if (Object.keys(updates).length === 0) {
    return { error: "No changes" };
  }

  await db.update(tenants).set(updates).where(eq(tenants.id, tenant.id));

  revalidatePath(`/app/${tenantSlug}/settings/branding`);
  revalidatePath(`/app/${tenantSlug}`);
  revalidatePath(`/f/${tenantSlug}-sudirman`);
  revalidatePath(`/f/${tenantSlug}-kemang`);

  return { success: true };
}
