import { db } from "@/db";
import { tenants, branches, feedback, categories } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Inbox, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import StatusBadge from "@/components/status-badge";
import SLABadge from "@/components/sla-badge";

export default async function AdminDashboard({ params }: { params: Promise<{ tenant_slug: string }> }) {
  const { tenant_slug } = await params;

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, tenant_slug),
  });
  if (!tenant) notFound();

  const allFeedback = await db.query.feedback.findMany({
    where: eq(feedback.tenantId, tenant.id),
    orderBy: [desc(feedback.createdAt)],
    limit: 100,
  });

  // Branch map
  const allBranches = await db.query.branches.findMany({
    where: eq(branches.tenantId, tenant.id),
  });
  const branchMap = new Map(allBranches.map((b) => [b.id, b.name]));

  // Category map
  const allCategories = await db.query.categories.findMany({
    where: eq(categories.tenantId, tenant.id),
  });
  const categoryMap = new Map(allCategories.map((c) => [c.id, c.name]));

  // Stats
  const stats = {
    total: allFeedback.length,
    open: allFeedback.filter((f) => f.status === "open").length,
    inProgress: allFeedback.filter((f) => f.status === "in_progress").length,
    closed: allFeedback.filter((f) => f.status === "closed").length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-slate-900">
              <MessageSquare className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="font-bold">{tenant.name}</h1>
              <p className="text-xs text-slate-500">Dashboard Admin • Plan: {tenant.plan}</p>
            </div>
          </div>
          <Link href="/demo" className="text-sm text-slate-500 hover:text-slate-900">← Demo</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Inbox className="w-5 h-5" />} label="Total" value={stats.total} color="slate" />
          <StatCard icon={<AlertCircle className="w-5 h-5" />} label="Belum Ditangani" value={stats.open} color="red" />
          <StatCard icon={<Clock className="w-5 h-5" />} label="Proses" value={stats.inProgress} color="amber" />
          <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Selesai" value={stats.closed} color="green" />
        </div>

        {/* Filters (visual only for prototype) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-2">
          <button className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm">Semua ({stats.total})</button>
          <button className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">Belum ({stats.open})</button>
          <button className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">Proses ({stats.inProgress})</button>
          <button className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">Selesai ({stats.closed})</button>
        </div>

        {/* Ticket list */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold">Feedback Terbaru</h2>
            <span className="text-xs text-slate-500">{allFeedback.length} entri</span>
          </div>
          {allFeedback.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Belum ada feedback</h3>
              <p className="text-sm text-slate-500 mb-4">Bagikan QR/form ke customer Anda untuk mulai terima feedback</p>
              <Link href="/f/warung-demo" className="text-sm text-sky-600 hover:underline">Coba form publik →</Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {allFeedback.map((f) => {
                const created = f.createdAt instanceof Date ? f.createdAt : new Date((f.createdAt as any) * 1000);
                return (
                  <li key={f.id}>
                    <Link href={`/admin/${tenant.slug}/feedback/${f.id}`} className="block px-6 py-4 hover:bg-slate-50 transition">
                      <div className="flex items-start gap-4">
                        {f.rating && (
                          <div className="shrink-0 w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                            <span className="text-yellow-600 font-bold">{f.rating}★</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs px-2 py-0.5 bg-slate-100 rounded">{categoryMap.get(f.categoryId || "") || "Tanpa kategori"}</span>
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs text-slate-500">{branchMap.get(f.branchId) || "Cabang"}</span>
                            <StatusBadge status={f.status as any} />
                            <SLABadge createdAt={created} priority={f.priority as any} status={f.status as any} />
                          </div>
                          <p className="text-sm text-slate-900 line-clamp-2">{f.message}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {f.customerName || "Anonim"} • {created.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
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
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
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
