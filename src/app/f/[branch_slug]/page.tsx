import { db, ensureSchema } from "@/db";
import { tenants, branches, categories, reviewQrTokens, visits } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { hashIp } from "@/lib/helpers";
import FeedbackForm from "./form";

export default async function PublicFeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ branch_slug: string }>;
  searchParams: Promise<{ source?: string; token?: string; t?: string }>;
}) {
  await ensureSchema();
  const { branch_slug } = await params;
  const sp = await searchParams;

  const branch = await db.query.branches.findFirst({
    where: eq(branches.slug, branch_slug),
  });
  if (!branch) notFound();

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, branch.tenantId),
  });
  if (!tenant) notFound();

  const cats = await db.query.categories.findMany({
    where: and(eq(categories.tenantId, branch.tenantId)),
    orderBy: (c, { asc }) => [asc(c.order)],
  });

  // Pick one active review QR token for this branch (if any)
  const reviewToken = await db.query.reviewQrTokens.findFirst({
    where: and(
      eq(reviewQrTokens.branchId, branch.id),
      eq(reviewQrTokens.active, 1)
    ),
  });

  // Phase 1: log visit (best-effort, do not block render on failure)
  let visitId: string | null = null;
  try {
    const h = await headers();
    const userAgent = h.get("user-agent") ?? null;
    const fwd = h.get("x-forwarded-for") ?? "";
    const ip = (fwd.split(",")[0] ?? "").trim() || h.get("x-real-ip") || "unknown";
    const ipHash = await hashIp(ip);

    const source: "qr_scan" | "direct_link" | "bio_link" =
      sp.source === "qr" || sp.token ? "qr_scan" : sp.source === "bio" ? "bio_link" : "direct_link";

    const newId = crypto.randomUUID();
    visitId = newId;
    await db.insert(visits).values({
      id: newId,
      tenantId: branch.tenantId,
      branchId: branch.id,
      source,
      qrTokenId: reviewToken && sp.token === reviewToken.token ? reviewToken.id : null,
      userAgent,
      ipHash,
      action: "viewed",
    });
  } catch (err) {
    console.error("[f/page] visit log failed:", err);
    // visitId stays null - tracking is best-effort
  }

  return (
    <FeedbackForm
      tenant={{
        id: tenant.id,
        name: tenant.name,
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
        greetingText: tenant.greetingText,
        thankYouText: tenant.thankYouText,
      }}
      branch={{
        id: branch.id,
        name: branch.name,
        slug: branch.slug,
        googlePlaceLat: branch.googlePlaceLat ?? null,
        googlePlaceLng: branch.googlePlaceLng ?? null,
        googlePlaceName: branch.googlePlaceName ?? null,
        address: branch.address ?? null,
      }}
      categories={cats}
      reviewToken={reviewToken?.token ?? null}
      visitId={visitId}
    />
  );
}
