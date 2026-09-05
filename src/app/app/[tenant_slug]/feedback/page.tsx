import { db } from "@/db";
import { feedback, branches, categories } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Inbox, AlertCircle, CheckCircle2, Clock, Plus } from "lucide-react";
import StatusBadge from "@/components/status-badge";
import SLABadge from "@/components/sla-badge";
import FilterBar from "./filter-bar";

export default async function FeedbackList({ params, searchParams }: {
  params: Promise<{ tenant_slug: string }>;
  searchParams: Promise<{ status?: string; category?: string; branch?: string; q?: string; page?: string }>;
}) {
  const { tenant_slug } = await params;
  const sp = await searchParams;
  const session = await requireSession().catch(() => redirect("/login"));
  if (session.tenantSlug !== tenant_slug) redirect(`/app/${session.tenantSlug}/feedback`);

  const PAGE_SIZE = 20;
  const page = parseInt(sp.page || "1");

  // Build where clause
  const conditions = [eq(feedback.tenantId, session.tenantId)];
  if (sp.status && ["open", "in_progress", "closed"].includes(sp.status)) {
    conditions.push(eq(feedback.status, sp.status as any));
  }
  if (sp.category) conditions.push(eq(feedback.categoryId, sp.category));
  if (sp.branch) conditions.push(eq(feedback.branchId, sp.branch));
  if (sp.q) {
    // SQLite LIKE search
    const { like, or } = await import("drizzle-orm");
    conditions.push(or(
      like(feedback.message, `%${sp.q}%`),
      like(feedback.customerName, `%${sp.q}%`)
    )!);
  }

  const allFeedback = await db.query.feedback.findMany({
    where: and(...conditions),
    orderBy: [desc(feedback.createdAt)],
  });

  // Stats (over all feedback, not filtered)
  const allForStats = await db.query.feedback.findMany({
    where: eq(feedback.tenantId, session.tenantId),
  });
  const stats = {
    total: allForStats.length,
    open: allForStats.filter((f) => f.status === "open").length,
    inProgress: allForStats.filter((f) => f.status === "in_progress").length,
    closed: allForStats.filter((f) => f.status === "closed").length,
  };

  const branchList = await db.query.branches.findMany({ where: eq(branches.tenantId, session.tenantId) });
  const branchMap = new Map(branchList.map((b) => [b.id, b.name]));

  const catList = await db.query.categories.findMany({
    where: and(eq(categories.tenantId, session.tenantId), eq(categories.active, 1)),
  });
  const categoryMap = new Map(catList.map((c) => [c.id, c.name]));

  const paginated = allFeedback.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(allFeedback.length / PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Feedback Customer</h1>
          <p className="text-slate-600 text-sm mt-1">Semua kritik & saran masuk</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Inbox className="w-5 h-5" />} label="Total" value={stats.total} color="slate" />
        <StatCard icon={<AlertCircle className="w-5 h-5" />} label="Belum Ditangani" value={stats.open} color="red" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Proses" value={stats.inProgress} color="amber" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Selesai" value={stats.closed} color="green" />
      </div>

      {/* Filters */}
      <FilterBar
        branches={branchList.map(b => ({ id: b.id, name: b.name }))}
        categories={catList.map(c => ({ id: c.id, name: c.name }))}
        currentStatus={sp.status}
        currentBranch={sp.branch}
        currentCategory={sp.category}
        currentQuery={sp.q || ""}
      />

      {/* Ticket list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mt-4">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold">Daftar Feedback</h2>
          <span className="text-xs text-slate-500">{allFeedback.length} entri</span>
        </div>
        {paginated.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Tidak ada feedback</h3>
            <p className="text-sm text-slate-500">Coba ubah filter, atau bagikan link form ke customer</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {paginated.map((f) => {
              const created = f.createdAt instanceof Date ? f.createdAt : new Date((f.createdAt as any) * 1000);
              return (
                <li key={f.id}>
                  <Link
                    href={`/app/${tenant_slug}/feedback/${f.id}`}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex gap-1">
              {page > 1 && (
                <Link
                  href={{ query: { ...sp, page: String(page - 1) } }}
                  className="px-3 py-1.5 border border-slate-300 rounded text-sm hover:bg-slate-50"
                >
                  ← Sebelumnya
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={{ query: { ...sp, page: String(page + 1) } }}
                  className="px-3 py-1.5 border border-slate-300 rounded text-sm hover:bg-slate-50"
                >
                  Selanjutnya →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
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
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}
