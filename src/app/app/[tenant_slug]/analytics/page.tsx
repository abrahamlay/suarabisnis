import { db, ensureSchema } from "@/db";
import { visits, feedback, branches, tenants } from "@/db/schema";
import { eq, and, gte, sql, count } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Eye, MousePointerClick, MessageSquareWarning, Star, ThumbsUp, ThumbsDown, Minus, TrendingUp } from "lucide-react";
import Link from "next/link";
import AnalyticsCharts from "./analytics-charts";

export const dynamic = "force-dynamic";

type SP = { range?: string };

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant_slug: string }>;
  searchParams: Promise<SP>;
}) {
  await ensureSchema();
  const { tenant_slug } = await params;
  const sp = await searchParams;
  const range = sp.range === "30d" ? 30 : sp.range === "24h" ? 1 : 7; // default 7d

  const session = await getSession();
  if (!session || session.tenantSlug !== tenant_slug) {
    redirect(`/app/${tenant_slug}/login/`);
  }

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenant_slug) });
  if (!tenant) notFound();

  const now = new Date();
  const since = new Date(now.getTime() - range * 24 * 60 * 60 * 1000);
  const sinceUnix = Math.floor(since.getTime() / 1000);

  // Funnel aggregates
  const [funnelRows, branchList, dailyVisits, dailyFeedback, sentimentBreakdown] = await Promise.all([
    db
      .select({
        total: count(),
        viewed: sql<number>`SUM(CASE WHEN ${visits.action} = 'viewed' THEN 1 ELSE 0 END)`,
        clickedGoogle: sql<number>`SUM(CASE WHEN ${visits.action} = 'clicked_google' THEN 1 ELSE 0 END)`,
        submittedFeedback: sql<number>`SUM(CASE WHEN ${visits.action} = 'submitted_feedback' THEN 1 ELSE 0 END)`,
        bounced: sql<number>`SUM(CASE WHEN ${visits.action} = 'bounced' THEN 1 ELSE 0 END)`,
        avgDuration: sql<number | null>`AVG(${visits.durationMs})`,
      })
      .from(visits)
      .where(and(eq(visits.tenantId, tenant.id), gte(visits.createdAt, since))),
    db.query.branches.findMany({ where: eq(branches.tenantId, tenant.id) }),
    // Daily visits grouped by date
    db
      .select({
        day: sql<string>`strftime('%Y-%m-%d', datetime(${visits.createdAt}, 'unixepoch'))`,
        total: count(),
      })
      .from(visits)
      .where(and(eq(visits.tenantId, tenant.id), gte(visits.createdAt, since)))
      .groupBy(sql`strftime('%Y-%m-%d', datetime(${visits.createdAt}, 'unixepoch'))`),
    db
      .select({
        day: sql<string>`strftime('%Y-%m-%d', datetime(${feedback.createdAt}, 'unixepoch'))`,
        total: count(),
      })
      .from(feedback)
      .where(and(eq(feedback.tenantId, tenant.id), gte(feedback.createdAt, since)))
      .groupBy(sql`strftime('%Y-%m-%d', datetime(${feedback.createdAt}, 'unixepoch'))`),
    db
      .select({
        outcome: feedback.outcome,
        total: count(),
      })
      .from(feedback)
      .where(and(eq(feedback.tenantId, tenant.id), gte(feedback.createdAt, since)))
      .groupBy(feedback.outcome),
  ]);

  const funnel = funnelRows[0] ?? {
    total: 0,
    viewed: 0,
    clickedGoogle: 0,
    submittedFeedback: 0,
    bounced: 0,
    avgDuration: null,
  };

  const totalVisits = Number(funnel.viewed ?? 0);
  const totalClicks = Number(funnel.clickedGoogle ?? 0);
  const totalFeedback = Number(funnel.submittedFeedback ?? 0);
  const totalBounced = Number(funnel.bounced ?? 0);

  const ctr = totalVisits > 0 ? ((totalClicks + totalFeedback) / totalVisits) * 100 : 0;
  const feedbackRate = totalVisits > 0 ? (totalFeedback / totalVisits) * 100 : 0;
  const googleRate = totalVisits > 0 ? (totalClicks / totalVisits) * 100 : 0;
  const bounceRate = totalVisits > 0 ? (totalBounced / totalVisits) * 100 : 0;

  // Sentiment (from feedback.outcome)
  const sentPositive = Number(sentimentBreakdown.find((s) => s.outcome === "positive")?.total ?? 0);
  const sentNeutral = Number(sentimentBreakdown.find((s) => s.outcome === "neutral")?.total ?? 0);
  const sentNegative = Number(sentimentBreakdown.find((s) => s.outcome === "negative")?.total ?? 0);
  const totalSentiment = sentPositive + sentNeutral + sentNegative;
  const positivePct = totalSentiment > 0 ? (sentPositive / totalSentiment) * 100 : 0;
  const negativePct = totalSentiment > 0 ? (sentNegative / totalSentiment) * 100 : 0;

  // Branch breakdown
  const branchStats = await Promise.all(
    branchList.map(async (b) => {
      const [v] = await db
        .select({ total: count() })
        .from(visits)
        .where(and(eq(visits.branchId, b.id), gte(visits.createdAt, since)));
      const [f] = await db
        .select({ total: count() })
        .from(feedback)
        .where(and(eq(feedback.branchId, b.id), gte(feedback.createdAt, since)));
      return { id: b.id, name: b.name, slug: b.slug, visits: Number(v?.total ?? 0), feedback: Number(f?.total ?? 0) };
    })
  );

  // Build daily series
  const days: string[] = [];
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    days.push(d.toISOString().slice(0, 10));
  }
  const visitMap = new Map(dailyVisits.map((r) => [r.day, Number(r.total)]));
  const feedbackMap = new Map(dailyFeedback.map((r) => [r.day, Number(r.total)]));
  const series = days.map((d) => ({
    day: d,
    label: new Date(d).toLocaleDateString("id-ID", { weekday: "short", day: "numeric" }),
    visits: visitMap.get(d) ?? 0,
    feedback: feedbackMap.get(d) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analitik</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pantau kunjungan, sentimen, dan konversi review.
          </p>
        </div>
        <RangePicker current={range} tenantSlug={tenant_slug} />
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Eye className="w-5 h-5" />}
          label="Total Kunjungan"
          value={totalVisits}
          sub="Pengunjung halaman feedback"
          accent="sky"
        />
        <StatCard
          icon={<MousePointerClick className="w-5 h-5" />}
          label="Klik Google"
          value={totalClicks}
          sub={`${googleRate.toFixed(1)}% dari kunjungan`}
          accent="emerald"
        />
        <StatCard
          icon={<MessageSquareWarning className="w-5 h-5" />}
          label="Feedback Masuk"
          value={totalFeedback}
          sub={`${feedbackRate.toFixed(1)}% dari kunjungan`}
          accent="amber"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="CTR"
          value={`${ctr.toFixed(1)}%`}
          sub={`Bounce ${bounceRate.toFixed(1)}%`}
          accent="violet"
        />
      </div>

      {/* Funnel chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold mb-1">Funnel Konversi</h2>
        <p className="text-sm text-slate-500 mb-4">
          Dari pengunjung yang melihat, berapa yang beraksi.
        </p>
        <FunnelBar
          steps={[
            { label: "Melihat halaman", value: totalVisits, color: "bg-sky-500" },
            { label: "Klik Google Review", value: totalClicks, color: "bg-emerald-500" },
            { label: "Kirim feedback", value: totalFeedback, color: "bg-amber-500" },
          ]}
        />
      </div>

      {/* Daily chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold mb-1">Tren {range} Hari</h2>
        <p className="text-sm text-slate-500 mb-4">
          Kunjungan vs feedback per hari.
        </p>
        <AnalyticsCharts data={series} />
      </div>

      {/* Sentiment split */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold mb-1">Rasio Sentimen</h2>
          <p className="text-sm text-slate-500 mb-4">
            Dari feedback yang punya rating.
          </p>
          {totalSentiment === 0 ? (
            <EmptyHint text="Belum ada feedback dengan rating. Submit feedback dari halaman publik untuk lihat datanya." />
          ) : (
            <div className="space-y-3">
              <SentimentRow
                icon={<ThumbsUp className="w-4 h-4" />}
                label="Puas (4-5 bintang)"
                value={sentPositive}
                pct={positivePct}
                color="bg-emerald-500"
                textColor="text-emerald-700"
              />
              <SentimentRow
                icon={<Minus className="w-4 h-4" />}
                label="Netral (3 bintang)"
                value={sentNeutral}
                pct={100 - positivePct - negativePct}
                color="bg-slate-400"
                textColor="text-slate-600"
              />
              <SentimentRow
                icon={<ThumbsDown className="w-4 h-4" />}
                label="Kecewa (1-2 bintang)"
                value={sentNegative}
                pct={negativePct}
                color="bg-rose-500"
                textColor="text-rose-700"
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold mb-1">Per Cabang</h2>
          <p className="text-sm text-slate-500 mb-4">
            Kunjungan dan feedback tiap cabang.
          </p>
          {branchStats.length === 0 ? (
            <EmptyHint text="Belum ada cabang. Tambah cabang di Settings → Cabang." />
          ) : (
            <div className="space-y-3">
              {branchStats.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <Link
                    href={`/app/${tenant_slug}/feedback?branch=${b.slug}`}
                    className="text-slate-700 hover:text-sky-600 font-medium"
                  >
                    {b.name}
                  </Link>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500">{b.visits} visit</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-700 font-medium">{b.feedback} feedback</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub: string;
  accent: "sky" | "emerald" | "amber" | "violet";
}) {
  const colors: Record<string, string> = {
    sky: "bg-sky-50 text-sky-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[accent]}`}>{icon}</div>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}

function FunnelBar({
  steps,
}: {
  steps: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <div className="space-y-3">
      {steps.map((s, i) => {
        const pct = (s.value / max) * 100;
        return (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600">{s.label}</span>
              <span className="font-medium text-slate-900">{s.value}</span>
            </div>
            <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
              <div
                className={`h-full ${s.color} transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SentimentRow({
  icon,
  label,
  value,
  pct,
  color,
  textColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  pct: number;
  color: string;
  textColor: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center text-sm mb-1">
        <span className={`flex items-center gap-1.5 ${textColor}`}>
          {icon} {label}
        </span>
        <span className="font-medium">
          {value} <span className="text-slate-400 text-xs">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RangePicker({ current, tenantSlug }: { current: number; tenantSlug: string }) {
  const opts = [
    { v: 1, label: "24 jam" },
    { v: 7, label: "7 hari" },
    { v: 30, label: "30 hari" },
  ];
  return (
    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg text-sm">
      {opts.map((o) => (
        <Link
          key={o.v}
          href={`/app/${tenantSlug}/analytics?range=${o.v === 7 ? "" : o.v + "d"}`}
          className={`px-3 py-1.5 rounded-md font-medium ${
            current === o.v
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-sm text-slate-500">{text}</p>;
}
