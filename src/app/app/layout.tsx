import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { tenants, branches, subscriptions } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import DashboardSidebar from "@/components/dashboard-sidebar";
import { FcmListener } from "@/components/fcm-listener";
import { NotificationOptIn } from "@/components/notification-opt-in";
import type { Plan } from "@/db/schema";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Bypass auth for public tenant pages (login, pricing, demo, signup) — middleware sets this header
  const h = await headers();
  const isTenantPublic = h.get("x-tenant-is-public") === "1";
  if (isTenantPublic) {
    // Render public tenant page without auth or dashboard chrome
    return <>{children}</>;
  }

  const session = await getSession();
  if (!session) redirect("/login");

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, session.tenantId) });
  if (!tenant) redirect("/login");

  const branchCountRow = await db
    .select({ c: count() })
    .from(branches)
    .where(eq(branches.tenantId, session.tenantId))
    .get();

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.tenantId, session.tenantId),
  });

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <DashboardSidebar
        tenantSlug={tenant.slug}
        tenantName={tenant.name}
        plan={tenant.plan as Plan}
        userName={session.name}
        userEmail={session.email}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-30">
          <div className="md:hidden w-10" /> {/* spacer for mobile menu button */}
          <div className="flex-1 max-w-md hidden md:block">
            <input
              type="search"
              placeholder="Cari feedback, cabang, kategori..."
              className="w-full px-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
            />
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-tight">{session.name ?? "Anda"}</p>
              <p className="text-xs text-slate-500 leading-tight">{session.email}</p>
            </div>
            <div className="w-9 h-9 bg-sky-500 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
              {(session.name ?? session.email)[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-full overflow-x-hidden">
          <TenantContextProvider
            tenant={{
              id: tenant.id,
              name: tenant.name,
              slug: tenant.slug,
              plan: tenant.plan as Plan,
              logoUrl: tenant.logoUrl,
            }}
            branchesCount={branchCountRow?.c ?? 0}
            subscription={subscription
              ? {
                  plan: subscription.plan as Plan,
                  status: subscription.status as "active" | "trialing" | "canceled" | "past_due",
                  currentPeriodEnd: subscription.currentPeriodEnd,
                }
              : null}
          >
            {children}
          </TenantContextProvider>
        </main>
      </div>

      {/* FCM push notification components (client-side, no UI) */}
      <FcmListener />
      <NotificationOptIn tenantName={tenant.name} />
    </div>
  );
}

// Tenant context wrapper — uses a div + data-attrs since we don't have a Context provider file yet.
// Children receive this as their wrapping container.
function TenantContextProvider({
  children,
  tenant,
  branchesCount,
  subscription,
}: {
  children: React.ReactNode;
  tenant: { id: string; name: string; slug: string; plan: Plan; logoUrl: string | null };
  branchesCount: number;
  subscription: { plan: Plan; status: "active" | "trialing" | "canceled" | "past_due"; currentPeriodEnd: Date | null } | null;
}) {
  return (
    <div
      data-tenant-id={tenant.id}
      data-tenant-slug={tenant.slug}
      data-tenant-plan={tenant.plan}
      data-branches-count={branchesCount}
      data-subscription-plan={subscription?.plan ?? "none"}
    >
      {children}
    </div>
  );
}