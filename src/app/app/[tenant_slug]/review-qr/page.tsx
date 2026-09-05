import { db, ensureSchema } from "@/db";
import { reviewQrTokens, branches, tenants, reviewScans } from "@/db/schema";
import { eq, sql, desc, and, gte } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import ReviewQrClient from "./review-qr-client";
import { QrCode } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReviewQrPage({
  params,
}: {
  params: Promise<{ tenant_slug: string }>;
}) {
  await ensureSchema();
  const { tenant_slug } = await params;
  const session = await requireSession().catch(() => redirect("/login"));
  if (session.tenantSlug !== tenant_slug) {
    redirect(`/app/${session.tenantSlug}/review-qr`);
  }

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenant_slug) });
  if (!tenant) notFound();

  const tenantBranches = await db.query.branches.findMany({
    where: eq(branches.tenantId, tenant.id),
    orderBy: (b, { asc }) => [asc(b.name)],
  });

  const tokens = await db.query.reviewQrTokens.findMany({
    where: eq(reviewQrTokens.tenantId, tenant.id),
    orderBy: [desc(reviewQrTokens.createdAt)],
  });

  // Scan counts last 30d per token
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const scanCounts = await db
    .select({
      tokenId: reviewScans.tokenId,
      total: sql<number>`COUNT(*)`,
    })
    .from(reviewScans)
    .where(gte(reviewScans.scannedAt, thirtyDaysAgo))
    .groupBy(reviewScans.tokenId);

  const scanMap = new Map(scanCounts.map((s) => [s.tokenId, Number(s.total)]));
  const branchMap = new Map(tenantBranches.map((b) => [b.id, b]));

  const enrichedTokens = tokens.map((t) => ({
    id: t.id,
    token: t.token,
    label: t.label ?? null,
    branchName: branchMap.get(t.branchId)?.name ?? "(Cabang dihapus)",
    branchSlug: branchMap.get(t.branchId)?.slug ?? null,
    active: t.active === 1,
    scansLast30d: scanMap.get(t.id) ?? 0,
    createdAt: t.createdAt,
    googlePlaceId: t.googlePlaceId,
    googlePlaceName: t.googlePlaceName,
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <QrCode className="w-5 h-5 text-slate-400" />
          <h1 className="text-2xl font-bold">QR Review Google</h1>
        </div>
        <p className="text-sm text-slate-500">
          Generate QR code yang mengarah langsung ke halaman review Google untuk setiap cabang. Pelanggan tinggal scan, tinggal review.
        </p>
      </div>

      <ReviewQrClient
        tenantSlug={tenant_slug}
        tenantName={tenant.name}
        branches={tenantBranches.map((b) => ({ id: b.id, name: b.name, slug: b.slug }))}
        tokens={enrichedTokens}
        baseUrl={process.env.NEXT_PUBLIC_BASE_URL || "https://bamboy.my.id"}
      />
    </div>
  );
}
