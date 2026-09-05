import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { tenants, branches, feedback, categories } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/billing";
import {
  Inbox,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import StatusBadge from "@/components/status-badge";
import SLABadge from "@/components/sla-badge";
import PlanBadge from "@/components/plan-badge";
import type { Plan } from "@/db/schema";

export default async function DashboardHome({
  params,
}: {
  params: Promise<{ tenant_slug: string }>;
}) {
  const { tenant_slug } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.tenantSlug !== tenant_slug) redirect(`/app/${session.tenantSlug}`);

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenant_slug) });
  if (!tenant) notFound();

  const plan = tenant.plan as Plan;
  const subscription = await getActiveSubscription(tenant.id);

  // All feedback for stats
  const allFeedback = await db.query.feedback.findMany({
    where: eq(feedback.tenantId, tenant.id),
  });

  // 5 most recent
  const recentFeedback = await db.query.feedback.findMany({
    where: eq(feedback.tenantId, tenant.id),
    orderBy: [desc(feedback.createdAt)],
    limit: 5,
  });

  const allBranches = await db.query.branches.findMany({
    where: eq(branches.tenantId, tenant.id),
  });
  const branchMap = new Map(allBranches.map((b) => [b.id, b.name]));

  const allCategories = await db.query.categories.findMany({
    where: eq(categories.tenantId, tenant.id),
  });
  const categoryMap = new Map(allCategories.map((c) => [c.id, c.name]));

  const stats = {
    total: allFeedback.length,
    open: allFeedback.filter((f) => f.status === "open").length,
    inProgress: allFeedback.filter((f) => f.status === "in_progress").length,
    closed: allFeedback.filter((f) => f.status === "closed").length,
  };

  // Average rating
  const rated = allFeedback.filter((f) => f.rating != null);
  const avgRating =
    rated.length > 0
      ? rated.reduce((s, f) => s + (f.rating ?? 0), 0) / rated.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">
              Halo, {session.name?.split(" ")[0] ?? "Owner"} 👋
            </h1>
            <p className="text-slate-600 mt-1">
              Berikut ringkasan bisnis <strong>{tenant.name}</strong> hari ini.
            </p>
          </div>
          <PlanBadge plan={plan} />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Inbox className="w-5 h-5" />} label="Total Feedback" value={stats.total} color="slate" />
        <StatCard icon={<AlertCircle className="w-5 h-5" />} label="Belum Ditangani" value={stats.open} color="red" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Sedang Proses" value={stats.inProgress} color="amber" />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Selesai"
          value={stats.closed}
          color="green"
        />
      </div>

      {/* Avg rating + branch count */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Rating Rata-rata</p>
          <p className="text-3xl font-bold mt-1">
            {avgRating > 0 ? avgRating.toFixed(1) : "—"}
            <span className="text-base text-slate-400 ml-1">/ 5</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">{rated.length} feedback dengan rating</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Cabang Aktif</p>
          <p className="text-3xl font-bold mt-1">{allBranches.length}</p>
          <p className="text-xs text-slate-500 mt-1">
            Plan {plan}: maks {plan === "free" ? 1 : plan === "basic" ? 3 : "unlimited"}
          </p>
        </div>
      </div>

      {/* Recent feedback */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold">Feedback Terbaru</h2>
          <Link
            href={`/app/${tenant.slug}/feedback`}
            className="text-sm text-sky-600 hover:text-sky-700 hover:underline font-medium inline-flex items-center gap-1"
          >
            Lihat semua feedback <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentFeedback.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Belum ada feedback</h3>
            <p className="text-sm text-slate-500 mb-4">
              Bagikan link form ke customer Anda untuk mulai terima feedback.
            </p>
            {allBranches.length > 0 && (
              <Link
                href={`/f/${allBranches[0].slug}`}
                className="inline-flex items-center gap-1 text-sm bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-600"
              >
                Buka form publik <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {recentFeedback.map((f) => {
              const created = f.createdAt instanceof Date ? f.createdAt : new Date((f.createdAt as any) * 1000);
              return (
                <li key={f.id}>
                  <Link
                    href={`/app/${tenant.slug}/feedback/${f.id}`}
                    className="block px-6 py-4 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-start gap-4">
                      {f.rating && (
                        <div className="shrink-0 w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                          <span className="text-yellow-600 font-bold text-sm">{f.rating}★</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs px-2 py-0.5 bg-slate-100 rounded">
                            {categoryMap.get(f.categoryId || "") || "Tanpa kategori"}
                          </span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-500">
                            {branchMap.get(f.branchId) || "Cabang"}
                          </span>
                          <StatusBadge status={f.status as any} />
                          <SLABadge
                            createdAt={created}
                            priority={f.priority as any}
                            status={f.status as any}
                          />
                        </div>
                        <p className="text-sm text-slate-900 line-clamp-2">{f.message}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {f.customerName || "Anonim"} •{" "}
                          {created.toLocaleString("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Subscription hint for free plan */}
      {plan === "free" && (
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-xl p-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-bold text-lg mb-1">Tingkatkan ke Basic 🚀</h3>
            <p className="text-sky-100 text-sm">
              Unlock Google Review QR, multi-cabang, dan email notifikasi hanya Rp 99rb/bulan.
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-lg font-medium hover:bg-slate-100"
          >
            Lihat Plan <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  const colors: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
  };
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}