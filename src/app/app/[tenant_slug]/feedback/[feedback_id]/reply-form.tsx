"use client";
import { useState } from "react";
import { Send, CheckCircle2, X } from "lucide-react";
import { addReply, updateStatus } from "./actions";

export default function ReplyForm({
  feedbackId,
  tenantSlug,
  currentStatus,
}: {
  feedbackId: string;
  tenantSlug: string;
  currentStatus: "open" | "in_progress" | "closed";
}) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(currentStatus);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    if (message.trim()) await addReply(feedbackId, message, "Owner");
    if (status !== currentStatus) await updateStatus(feedbackId, status);
    setSubmitting(false);
    setDone(true);
    setMessage("");
  }

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-2" />
        <p className="font-medium text-green-900">Tersimpan!</p>
        <p className="text-sm text-green-700 mb-3">Balasan dan perubahan status sudah tersimpan.</p>
        <button onClick={() => setDone(false)} className="text-sm text-green-700 hover:underline">Kirim lagi</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <h3 className="font-semibold">Balas & Ubah Status</h3>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        placeholder="Tulis balasan untuk customer..."
        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none resize-none"
      />
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium">Status:</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
        >
          <option value="open">Belum Ditangani</option>
          <option value="in_progress">Sedang Diproses</option>
          <option value="closed">Selesai</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={submitting || (!message.trim() && status === currentStatus)}
        className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? "Menyimpan..." : (<><Send className="w-4 h-4" /> Simpan</>)}
      </button>
    </form>
  );
}
