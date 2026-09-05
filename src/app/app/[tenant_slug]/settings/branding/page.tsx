import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { ensureSchema } from "@/db";
import BrandingForm from "./branding-form";
import { Palette } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BrandingPage({
  params,
}: {
  params: Promise<{ tenant_slug: string }>;
}) {
  await ensureSchema();
  const { tenant_slug } = await params;
  const session = await getSession();
  if (!session || session.tenantSlug !== tenant_slug) {
    redirect(`/app/${tenant_slug}/login/`);
  }

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenant_slug) });
  if (!tenant) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-5 h-5 text-slate-400" />
          <h1 className="text-2xl font-bold">Branding</h1>
        </div>
        <p className="text-sm text-slate-500">
          Sesuaikan tampilan halaman publik agar terasa seperti bagian dari bisnis Anda.
        </p>
      </div>

      <BrandingForm
        tenantSlug={tenant_slug}
        initial={{
          name: tenant.name,
          logoUrl: tenant.logoUrl,
          primaryColor: tenant.primaryColor ?? "#0ea5e9",
          accentColor: tenant.accentColor ?? "#1e293b",
          greetingText: tenant.greetingText ?? "Halo! Beri kami kritik dan saran",
          thankYouText:
            tenant.thankYouText ?? "Terima kasih! Kritik dan saran Anda sangat berharga.",
        }}
      />
    </div>
  );
}
