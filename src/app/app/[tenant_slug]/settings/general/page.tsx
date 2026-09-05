import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import GeneralSettingsForm from "./general-form";
import { getActiveSubscription } from "@/lib/billing";
import { PLANS } from "@/lib/modules";

export default async function GeneralSettings({ params }: { params: Promise<{ tenant_slug: string }> }) {
  const { tenant_slug } = await params;
  const session = await requireSession().catch(() => redirect("/login"));
  if (session.tenantSlug !== tenant_slug) redirect(`/app/${session.tenantSlug}/settings/general`);

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenant_slug) });
  if (!tenant) notFound();

  const subscription = await getActiveSubscription(tenant.id);
  const planInfo = PLANS[tenant.plan as "free" | "basic" | "pro"];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pengaturan Umum</h1>

      <div className="space-y-6">
        {/* Business profile */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold mb-4">Profil Bisnis</h2>
          <GeneralSettingsForm
            tenantId={tenant.id}
            initialName={tenant.name}
            initialSlug={tenant.slug}
            initialLogoUrl={tenant.logoUrl}
          />
        </div>

        {/* Subscription */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold mb-4">Langganan</h2>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-slate-600">Plan saat ini</p>
              <p className="text-2xl font-bold">{planInfo.name}</p>
              <p className="text-sm text-slate-500 mt-1">{planInfo.price}</p>
              {subscription?.currentPeriodEnd && (
                <p className="text-xs text-slate-500 mt-1">
                  Periode berakhir: {new Date(subscription.currentPeriodEnd).toLocaleDateString("id-ID", { dateStyle: "long" })}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {tenant.plan !== "pro" && (
                <a href="/pricing" className="bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-600">
                  Upgrade Plan
                </a>
              )}
              {tenant.plan !== "free" && (
                <form action={async () => {
                  "use server";
                  const { cancelSubscription } = await import("@/lib/billing");
                  const s = await requireSession();
                  await cancelSubscription(s.tenantId);
                  const { revalidatePath } = await import("next/cache");
                  revalidatePath(`/app/${s.tenantSlug}/settings/general`);
                }}>
                  <button type="submit" className="bg-white border border-red-300 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50">
                    Batalkan
                  </button>
                </form>
              )}
            </div>
          </div>
          <ul className="mt-4 grid md:grid-cols-2 gap-2 text-sm">
            {planInfo.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-slate-700">
                <Check className="w-4 h-4 text-green-500" /> {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
