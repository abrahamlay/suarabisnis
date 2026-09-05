"use client";

import { useState, useTransition } from "react";
import {
  Eye,
  Download,
  Power,
  Trash2,
  Plus,
  Star,
  AlertTriangle,
} from "lucide-react";
import QrPreview from "./qr-preview";
import {
  toggleReviewQr,
  deleteReviewQr,
} from "./actions";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  token: string;
  label: string | null;
  active: number;
  googlePlaceId: string;
  branchName: string;
  totalScans: number;
  scansLast7: number;
  scansLast30: number;
};

type Branch = { id: string; name: string };

type Props = {
  tenantId: string;
  tenantPlan: string;
  rows: Row[];
  branches: Branch[];
};

export default function ReviewsClient({ tenantId, tenantPlan, rows, branches }: Props) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [previewToken, setPreviewToken] = useState<{ token: string; placeId: string; label: string | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [rowError, setRowError] = useState<string | null>(null);

  const canUseReviewQr = tenantPlan === "basic" || tenantPlan === "pro";

  async function handleDownload(token: string, placeId: string, label: string | null) {
    try {
      const res = await fetch(`/api/qr-download?token=${encodeURIComponent(token)}`);
      // Use the same server action to get data URL
      const { getQrPngDataUrl } = await import("./actions");
      const dataUrl = await getQrPngDataUrl(token);
      if (!dataUrl) return;
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `qr-review-${label || token}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      void res; // unused
    } catch (e) {
      setRowError("Gagal download QR");
    }
  }

  function handleToggle(id: string, active: number) {
    startTransition(async () => {
      setRowError(null);
      const res = await toggleReviewQr(id, active === 1 ? false : true);
      if (res.error) setRowError(res.error);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      setRowError(null);
      const res = await deleteReviewQr(id);
      if (res.error) setRowError(res.error);
      else setConfirmDelete(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-slate-600">
          Generate QR per-cabang untuk boost review Google. Pelanggan scan → otomatis
          terbuka halaman review.
        </p>
        <button
          type="button"
          onClick={() => {
            if (!canUseReviewQr) {
              setRowError("Upgrade ke Basic/Pro untuk pakai modul ini");
              return;
            }
            if (branches.length === 0) {
              setRowError("Tambah cabang dulu sebelum generate QR");
              return;
            }
            setFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" /> Generate QR Baru
        </button>
      </div>

      {rowError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{rowError}</span>
        </div>
      )}

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <Star className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-700 font-medium">Belum ada QR</p>
          <p className="text-sm text-slate-500 mt-1">
            Generate QR pertama Anda untuk mulai tracking scan.
          </p>
          {canUseReviewQr && branches.length > 0 && (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center gap-2 mt-4 text-sky-600 hover:underline text-sm"
            >
              <Plus className="w-4 h-4" /> Generate QR pertama
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {rows.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Cabang</th>
                  <th className="text-left px-4 py-3 font-medium">Label</th>
                  <th className="text-left px-4 py-3 font-medium">Token</th>
                  <th className="text-right px-4 py-3 font-medium">Total Scan</th>
                  <th className="text-right px-4 py-3 font-medium">7 hari</th>
                  <th className="text-right px-4 py-3 font-medium">30 hari</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{r.branchName}</td>
                    <td className="px-4 py-3 text-slate-700">{r.label || <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {r.token.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{r.totalScans}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{r.scansLast7}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{r.scansLast30}</td>
                    <td className="px-4 py-3">
                      {r.active === 1 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewToken({
                              token: r.token,
                              placeId: r.googlePlaceId,
                              label: r.label,
                            })
                          }
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-sky-50 text-sky-700 hover:bg-sky-100"
                          aria-label="Lihat QR"
                          title="Lihat QR"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Lihat</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(r.token, r.googlePlaceId, r.label)}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
                          aria-label="Download QR"
                          title="Download QR"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Download</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggle(r.id, r.active)}
                          disabled={pending}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                          aria-label={r.active === 1 ? "Nonaktifkan" : "Aktifkan"}
                          title={r.active === 1 ? "Nonaktifkan" : "Aktifkan"}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">
                            {r.active === 1 ? "Nonaktifkan" : "Aktifkan"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(r.id)}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
                          aria-label="Hapus"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plan gating notice */}
      {!canUseReviewQr && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Modul Google Review QR tersedia di paket <strong>Basic</strong> dan{" "}
            <strong>Pro</strong>. Upgrade untuk mulai tracking scan.
          </span>
        </div>
      )}

      {/* Modals */}
      {formOpen && (
        <PreviewModal title="QR Review Baru" onClose={() => setFormOpen(false)}>
          <CreateQrForm
            tenantId={tenantId}
            branches={branches}
            onCreated={() => {
              setFormOpen(false);
              router.refresh();
            }}
          />
        </PreviewModal>
      )}

      {previewToken && (
        <PreviewModal onClose={() => setPreviewToken(null)}>
          <QrPreview
            token={previewToken.token}
            googlePlaceId={previewToken.placeId}
            label={previewToken.label}
          />
        </PreviewModal>
      )}

      {confirmDelete && (
        <PreviewModal onClose={() => setConfirmDelete(null)} title="Hapus QR ini?">
          <p className="text-sm text-slate-600 mb-5">
            QR yang dihapus tidak dapat dipulihkan. Semua data scan terkait juga akan terhapus.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => handleDelete(confirmDelete)}
              disabled={pending}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "Menghapus..." : "Ya, Hapus"}
            </button>
          </div>
        </PreviewModal>
      )}
    </div>
  );
}

function PreviewModal({
  title,
  children,
  onClose,
}: {
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-50 rounded-2xl shadow-xl w-full max-w-md my-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-900 text-sm"
            >
              Tutup
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/**
 * Create QR via paste-link flow (single path, replaces the old Place-ID form).
 * Owner pastes their Google Maps Share link; the server action extracts the
 * identifier + name and stores the original link verbatim as redirect target.
 */
function CreateQrForm({
  tenantId,
  branches,
  onCreated,
}: {
  tenantId: string;
  branches: Branch[];
  onCreated: () => void;
}) {
  const router = useRouter();
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ token: string; placeId: string; label: string | null } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { createReviewQr } = await import("./actions");
      // createReviewQr parses URLs, Place IDs and Feature IDs internally
      const res = await createReviewQr(tenantId, branchId, mapsLink, label);
      if (res.error) {
        setError(res.error);
        setSubmitting(false);
        return;
      }
      if (res.success && res.token) {
        setCreated({ token: res.token, placeId: mapsLink.trim(), label: label.trim() || null });
        setSubmitting(false);
      }
    } catch (err) {
      setError("Gagal membuat QR. Coba lagi.");
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div>
        <QrPreview token={created.token} googlePlaceId={created.placeId} label={created.label} />
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              onCreated();
              router.refresh();
            }}
            className="w-full text-white py-2.5 rounded-lg font-medium bg-slate-900 hover:bg-slate-800 text-sm"
          >
            Selesai
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Cabang <span className="text-red-500">*</span>
        </label>
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          required
          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none text-sm"
        >
          <option value="">Pilih cabang...</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Label <span className="text-slate-400 font-normal">(opsional)</span>
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="QR Meja 1, QR Kasir, dll."
          maxLength={60}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Link Google Maps <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={mapsLink}
          onChange={(e) => setMapsLink(e.target.value)}
          placeholder="https://maps.app.goo.gl/... atau Place ID (ChIJ...)"
          required
          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none text-sm"
        />
        <p className="text-xs text-slate-500 mt-1.5">
          Buka bisnis Anda di Google Maps → tombol <strong>Bagikan</strong> → <strong>Salin link</strong> → paste di sini.
          Place ID (ChIJ...) juga bisa.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !branchId || !mapsLink.trim()}
        className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? (
          "Membuat QR..."
        ) : (
          <>
            <Plus className="w-4 h-4" /> Generate QR
          </>
        )}
      </button>
    </form>
  );
}
