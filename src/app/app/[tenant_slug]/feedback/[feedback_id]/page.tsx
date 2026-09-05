import { db } from "@/db";
import { feedback, feedbackReplies, feedbackNotes, categories } from "@/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Phone, Star } from "lucide-react";
import StatusBadge from "@/components/status-badge";
import { requireSession } from "@/lib/auth";
import ReplyForm from "./reply-form";
import FeedbackNotes from "./feedback-notes";

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ tenant_slug: string; feedback_id: string }>;
}) {
  const { tenant_slug, feedback_id } = await params;
  const session = await requireSession().catch(() => redirect("/login"));
  if (session.tenantSlug !== tenant_slug) redirect(`/app/${session.tenantSlug}`);

  const item = await db.query.feedback.findFirst({
    where: and(eq(feedback.id, feedback_id), eq(feedback.tenantId, session.tenantId)),
  });
  if (!item) notFound();

  const category = item.categoryId
    ? await db.query.categories.findFirst({ where: eq(categories.id, item.categoryId) })
    : null;
  const replies = await db.query.feedbackReplies.findMany({
    where: eq(feedbackReplies.feedbackId, feedback_id),
    orderBy: [asc(feedbackReplies.createdAt)],
  });
  const notes = await db.query.feedbackNotes.findMany({
    where: eq(feedbackNotes.feedbackId, feedback_id),
    orderBy: [desc(feedbackNotes.createdAt)],
  });

  const created = item.createdAt instanceof Date ? item.createdAt : new Date((item.createdAt as any) * 1000);

  return (
    <div>
      <div className="mb-6">
        <Link href={`/app/${tenant_slug}/feedback`} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> Kembali ke daftar feedback
        </Link>
      </div>

      <div className="space-y-6">
        {/* Original message */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={item.status as any} />
              {category && (
                <span className="text-xs px-2 py-0.5 bg-slate-100 rounded">{category.name}</span>
              )}
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

        {/* Internal Notes (Phase 2) */}
        <FeedbackNotes
          feedbackId={item.id}
          currentUserId={session.userId}
          notes={notes.map((n) => ({
            id: n.id,
            authorName: n.authorName,
            note: n.note,
            createdAt: n.createdAt,
            userId: n.userId,
          }))}
        />

        {/* Reply form */}
        <ReplyForm feedbackId={item.id} tenantSlug={tenant_slug} currentStatus={item.status as any} />
      </div>
    </div>
  );
}
