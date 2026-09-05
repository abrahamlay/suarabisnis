"use server";
import { db } from "@/db";
import { feedback, socialProofImages, tenants, branches } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { renderSocialProof } from "@/lib/social-proof";
import { revalidatePath } from "next/cache";

export type GenerateSocialProofInput = {
  tenantSlug: string;
  feedbackId: string;
  template: "star-five" | "star-quote" | "minimal-card";
};

export async function generateSocialProofImage(input: GenerateSocialProofInput) {
  const session = await getSession();
  if (!session || session.tenantSlug !== input.tenantSlug) {
    return { error: "Unauthorized" };
  }

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, input.tenantSlug) });
  if (!tenant) return { error: "Tenant tidak ditemukan" };

  const fb = await db.query.feedback.findFirst({
    where: and(eq(feedback.id, input.feedbackId), eq(feedback.tenantId, tenant.id)),
  });
  if (!fb) return { error: "Feedback tidak ditemukan" };

  // Get branch + category info
  const [branch, category] = await Promise.all([
    fb.branchId ? db.query.branches.findFirst({ where: eq(branches.id, fb.branchId) }) : null,
    fb.categoryId
      ? db.query.categories
          .findFirst({ where: (c, { eq: eq2 }) => eq2(c.id, fb.categoryId!) })
          .catch(() => null)
      : null,
  ]);

  try {
    const { png, width, height, dataUrl } = await renderSocialProof({
      tenantName: tenant.name,
      tenantLogoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor ?? "#0ea5e9",
      rating: fb.rating ?? 5,
      customerName: fb.customerName,
      message: fb.message,
      categoryName: null,
      branchName: branch?.name ?? null,
      template: input.template,
    });

    // Store base64 in DB (capped — assume ~1MB max)
    const imageData = dataUrl;
    if (imageData.length > 1.5 * 1024 * 1024) {
      return { error: "Gambar terlalu besar. Coba template lain." };
    }

    const inserted = await db
      .insert(socialProofImages)
      .values({
        tenantId: tenant.id,
        feedbackId: fb.id,
        template: input.template,
        imageData,
        width,
        height,
      })
      .returning();

    revalidatePath(`/app/${input.tenantSlug}/social-proof`);

    return {
      success: true as const,
      id: inserted[0].id,
      dataUrl,
      width,
      height,
    };
  } catch (err) {
    console.error("[generateSocialProofImage]", err);
    return { error: err instanceof Error ? err.message : "Gagal generate gambar" };
  }
}

export async function listSocialProofImages(tenantSlug: string) {
  const session = await getSession();
  if (!session || session.tenantSlug !== tenantSlug) {
    return { error: "Unauthorized" };
  }
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenantSlug) });
  if (!tenant) return { error: "Tenant tidak ditemukan" };

  const rows = await db
    .select()
    .from(socialProofImages)
    .where(eq(socialProofImages.tenantId, tenant.id))
    .orderBy(desc(socialProofImages.createdAt))
    .limit(50);

  return {
    success: true as const,
    images: rows.map((r) => ({
      id: r.id,
      template: r.template,
      dataUrl: r.imageData,
      width: r.width,
      height: r.height,
      createdAt: r.createdAt,
    })),
  };
}

export async function deleteSocialProofImage(id: string) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const row = await db.query.socialProofImages.findFirst({ where: eq(socialProofImages.id, id) });
  if (!row) return { error: "Gambar tidak ditemukan" };
  if (row.tenantId !== session.tenantId) return { error: "Unauthorized" };

  await db.delete(socialProofImages).where(eq(socialProofImages.id, id));
  return { success: true as const };
}
