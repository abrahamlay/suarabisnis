import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { tenants, branches, subscriptions } from "@/db/schema";
import { eq, count } from "drizzle-orm";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant_slug: string }>;
}) {
  const { tenant_slug } = await params;

  // Skip auth for the tenant login page (set by middleware)
  const h = await headers();
  const isTenantPublic = h.get("x-tenant-is-public") === "1";

  if (isTenantPublic) {
    // Render public tenant page (login, pricing, demo, signup) without auth
    return <>{children}</>;
  }

  const session = await getSession();
  if (!session) redirect(`/app/${tenant_slug}/login`);

  // Validate session tenant matches URL
  if (session.tenantSlug !== tenant_slug) {
    redirect(`/app/${session.tenantSlug}`);
  }

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenant_slug) });
  if (!tenant) notFound();

  // Preload context data — pages within may re-fetch, but we warm it here.
  await db.select({ c: count() }).from(branches).where(eq(branches.tenantId, tenant.id)).get();
  await db.query.subscriptions.findFirst({ where: eq(subscriptions.tenantId, tenant.id) });

  return <>{children}</>;
}