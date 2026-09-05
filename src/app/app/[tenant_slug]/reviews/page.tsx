import { db, ensureSchema } from "@/db";
import {
  tenants,
  branches,
  reviewQrTokens,
  reviewScans,
} from "@/db/schema";
import { eq, sql, gte, and } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { Star } from "lucide-react";
import ReviewsClient from "./reviews-client";

export const dynamic = "force-dynamic";

export default async function ReviewsPage({
  params,
}: {
  params: Promise<{ tenant_slug: string }>;
}) {
  await ensureSchema();
  const { tenant_slug } = await params;

  const session = await requireSession().catch(() => redirect("/login"));
  if (session.tenantSlug !== tenant_slug) {
    redirect(`/app/${session.tenantSlug}/reviews`);
  }

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, tenant_slug),
  });
  if (!tenant) notFound();

  const tenantBranches = await db.query.branches.findMany({
    where: eq(branches.tenantId, tenant.id),
    orderBy: (b, { asc }) => [asc(b.name)],
  });

  const tokens = await db.query.reviewQrTokens.findMany({
    where: eq(reviewQrTokens.tenantId, tenant.id),
  });

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Build scan counts per token
  const rows: Array<{
    id: string;
    token: string;
    label: string | null;
    active: number;
    googlePlaceId: string;
    branchName: string;
    totalScans: number;
    scansLast7: number;
    scansLast30: number;
  }> = [];

  // Prepare branch lookup
  const branchById = new Map(tenantBranches.map((b) => [b.id, b]));

  for (const t of tokens) {
    // total
    const totalRow = await db
      .select({ c: sql<number>`count(*)` })
      .from(reviewScans)
      .where(eq(reviewScans.tokenId, t.id));
    const total = Number(totalRow[0]?.c ?? 0);

    // last 7 days
    const last7Row = await db
      .select({ c: sql<number>`count(*)` })
      .from(reviewScans)
      .where(
        and(
          eq(reviewScans.tokenId, t.id),
          gte(reviewScans.scannedAt, sevenDaysAgo)
        )
      );
    const last7 = Number(last7Row[0]?.c ?? 0);

    // last 30 days
    const last30Row = await db
      .select({ c: sql<number>`count(*)` })
      .from(reviewScans)
      .where(
        and(
          eq(reviewScans.tokenId, t.id),
          gte(reviewScans.scannedAt, thirtyDaysAgo)
        )
      );
    const last30 = Number(last30Row[0]?.c ?? 0);

    rows.push({
      id: t.id,
      token: t.token,
      label: t.label,
      active: t.active,
      googlePlaceId: t.googlePlaceId,
      branchName: branchById.get(t.branchId)?.name ?? "(cabang dihapus)",
      totalScans: total,
      scansLast7: last7,
      scansLast30: last30,
    });
  }

  // Sort: active first, then newest
  rows.sort((a, b) => {
    if (a.active !== b.active) return b.active - a.active;
    return 0;
  });

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center">
          <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Google Review QR</h1>
          <p className="text-sm text-slate-500">
            Kelola QR review untuk setiap cabang. Scan tertangkap otomatis.
          </p>
        </div>
      </div>

      <ReviewsClient
        tenantId={tenant.id}
        tenantPlan={tenant.plan}
        rows={rows}
        branches={tenantBranches.map((b) => ({ id: b.id, name: b.name }))}
      />
    </div>
  );
}
