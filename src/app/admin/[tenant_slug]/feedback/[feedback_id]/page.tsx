import { db } from "@/db";
import { tenants, branches, feedback, feedbackReplies, categories } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, User, Phone, Star } from "lucide-react";
import StatusBadge from "@/components/status-badge";
import ReplyForm from "./reply-form";

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ tenant_slug: string; feedback_id: string }>;
}) {
  const { tenant_slug, feedback_id } = await params;

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, tenant_slug),
  });
  if (!tenant) notFound();

  const item = await db.query.feedback.findFirst({
    where: and(eq(feedback.id, feedback_id), eq(feedback.tenantId, tenant.id)),
  });
  if (!item) notFound();

  const branch = await db.query.branches.findFirst({ where: eq(branches.id, item.branchId) });
  const category = item.categoryId
    ? await db.query.categories.findFirst({ where: eq(categories.id, item.categoryId) })
    : null;
  const replies = await db.query.feedbackReplies.findMany({
    where: eq(feedbackReplies.feedbackId, feedback_id),
    orderBy: [asc(feedbackReplies.createdAt)],
  });

  const created = item.createdAt instanceof Date ? item.createdAt : new Date((item.createdAt as any) * 1000);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href={`/admin/${tenant.slug}`} className="text-slate-400 hover:text-slate-900">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold">Detail Feedback</h1>
            <p className="text-xs text-slate-500">#{item.id.slice(0, 8)}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Original message */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={item.status as any} />
              {category && (
                <span className="text-xs px-2 py-0.5 bg-slate-100 rounded">{category.name}</span>
              )}
              <span className="text-xs text-slate-500">{branch?.name}</span>
            </div>
            {item.rating && (
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < (item.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-slate-200"}`} />
                ))}
              </div>
            )}
          </div>
          <p className="text-slate-900 whitespace-pre-wrap mb-4">{item.message}</p>
          <div className="border-t border-slate-100 pt-3 space-y-1 text-sm text-slate-600">
            {item.customerName && (
              <p className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" />{item.customerName}</p>
            )}
            {item.customerContact && (
              <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" />{item.customerContact}</p>
            )}
            <p className="text-xs text-slate-400">{created.toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}</p>
          </div>
        </div>

        {/* Replies */}
        <div>
          <h3 className="font-semibold mb-3">Percakapan ({replies.length + 1})</h3>
          <div className="space-y-3">
            {replies.map((r) => {
              const rc = r.createdAt instanceof Date ? r.createdAt : new Date((r.createdAt as any) * 1000);
              return (
                <div key={r.id} className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 bg-sky-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {r.authorName[0]}
                    </div>
                    <span className="font-medium text-sm">{r.authorName}</span>
                    <span className="text-xs text-slate-500">• {rc.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{r.message}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reply form */}
        <ReplyForm feedbackId={item.id} tenantSlug={tenant.slug} currentStatus={item.status as any} />
      </main>
    </div>
  );
}
