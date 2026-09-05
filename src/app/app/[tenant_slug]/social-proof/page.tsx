import { db, ensureSchema } from "@/db";
import { feedback, socialProofImages, tenants } from "@/db/schema";
import { eq, and, gte, desc, isNotNull } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import SocialProofClient from "./social-proof-client";
import { ImageIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SocialProofPage({
  params,
}: {
  params: Promise<{ tenant_slug: string }>;
}) {
  await ensureSchema();
  const { tenant_slug } = await params;
  const session = await requireSession().catch(() => redirect("/login"));
  if (session.tenantSlug !== tenant_slug) {
    redirect(`/app/${session.tenantSlug}/social-proof`);
  }

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenant_slug) });
  if (!tenant) notFound();

  // Get 4-5 star feedback from the last 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const candidates = await db
    .select()
    .from(feedback)
    .where(
      and(
        eq(feedback.tenantId, tenant.id),
        gte(feedback.createdAt, ninetyDaysAgo),
        isNotNull(feedback.rating)
      )
    )
    .orderBy(desc(feedback.createdAt))
    .limit(100);

  const positiveFb = candidates.filter((f) => (f.rating ?? 0) >= 4);

  const recentImages = await db
    .select()
    .from(socialProofImages)
    .where(eq(socialProofImages.tenantId, tenant.id))
    .orderBy(desc(socialProofImages.createdAt))
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ImageIcon className="w-5 h-5 text-slate-400" />
          <h1 className="text-2xl font-bold">Social Proof Generator</h1>
        </div>
        <p className="text-sm text-slate-500">
          Ubah review pelanggan jadi gambar siap-posting untuk Instagram, WhatsApp, atau Story. Pilih review, pilih template, download.
        </p>
      </div>

      <SocialProofClient
        tenantSlug={tenant_slug}
        primaryColor={tenant.primaryColor ?? "#0ea5e9"}
        candidates={positiveFb.map((f) => ({
          id: f.id,
          rating: f.rating ?? 0,
          message: f.message,
          customerName: f.customerName,
          createdAt: f.createdAt,
        }))}
        recentImages={recentImages.map((i) => ({
          id: i.id,
          template: i.template,
          dataUrl: i.imageData,
          width: i.width,
          height: i.height,
          createdAt: i.createdAt,
        }))}
      />
    </div>
  );
}
