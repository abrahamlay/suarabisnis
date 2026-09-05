import { db } from "@/db";
import { tenants, branches } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import BranchManager from "./branch-manager";
import { canAddBranch } from "@/lib/modules";

export default async function BranchesSettings({ params }: { params: Promise<{ tenant_slug: string }> }) {
  const { tenant_slug } = await params;
  const session = await requireSession().catch(() => redirect("/login"));
  if (session.tenantSlug !== tenant_slug) redirect(`/app/${session.tenantSlug}/settings/branches`);

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenant_slug) });
  if (!tenant) notFound();

  const allBranches = await db.query.branches.findMany({
    where: eq(branches.tenantId, tenant.id),
    orderBy: [asc(branches.createdAt)],
  });

  return (
    <BranchManager
      tenantId={tenant.id}
      plan={tenant.plan as "free" | "basic" | "pro"}
      branches={allBranches.map(b => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        address: b.address,
        googlePlaceId: b.googlePlaceId,
      }))}
      canAddMore={canAddBranch(tenant.plan as "free" | "basic" | "pro", allBranches.length)}
    />
  );
}
