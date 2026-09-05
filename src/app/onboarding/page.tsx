import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { tenants, branches } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import OnboardingWizard from "./wizard";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, session.tenantId),
  });
  if (!tenant) redirect("/login");

  const branchCountRow = await db
    .select({ c: count() })
    .from(branches)
    .where(eq(branches.tenantId, session.tenantId))
    .get();
  const branchCount = branchCountRow?.c ?? 0;

  return (
    <OnboardingWizard
      tenant={{
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
      }}
      hasBranches={branchCount > 0}
    />
  );
}