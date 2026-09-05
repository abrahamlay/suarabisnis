import { db } from "@/db";
import { tenants, categories, branches } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import CategoryManager from "./category-manager";

export default async function CategoriesSettings({ params }: { params: Promise<{ tenant_slug: string }> }) {
  const { tenant_slug } = await params;
  const session = await requireSession().catch(() => redirect("/login"));
  if (session.tenantSlug !== tenant_slug) redirect(`/app/${session.tenantSlug}/settings/categories`);

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenant_slug) });
  if (!tenant) notFound();

  const cats = await db.query.categories.findMany({
    where: eq(categories.tenantId, tenant.id),
    orderBy: [asc(categories.order)],
  });

  return <CategoryManager tenantId={tenant.id} categories={cats} />;
}
