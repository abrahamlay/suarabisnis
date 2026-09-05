import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { getSession } from "@/lib/auth";
import TenantLoginForm from "./login-form";

export default async function TenantLoginPage({
  params,
}: {
  params: Promise<{ tenant_slug: string }>;
}) {
  const { tenant_slug } = await params;

  // 1. Load tenant by slug
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenant_slug) });
  if (!tenant) notFound();

  // 2. If already logged in to this tenant, redirect to dashboard
  const session = await getSession();
  if (session && session.tenantSlug === tenant_slug) {
    redirect(`/app/${tenant_slug}`);
  }
  // If logged in to DIFFERENT tenant, sign out first (force re-login for security)
  // Don't auto-redirect — show login page so user can pick correct tenant

  return (
    <TenantLoginForm
      tenantSlug={tenant.slug}
      tenantName={tenant.name}
      tenantLogo={tenant.logoUrl}
    />
  );
}
