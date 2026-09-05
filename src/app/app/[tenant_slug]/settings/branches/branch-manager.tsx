"use client";
import { useState } from "react";
import { Plus, Trash2, Edit2, Check, X, MapPin, ExternalLink, Lock } from "lucide-react";
import { addBranch, updateBranch, deleteBranch } from "./actions";
import Link from "next/link";

type Branch = { id: string; name: string; slug: string; address: string | null; googlePlaceId: string | null };

export default function BranchManager({ tenantId, plan, branches, canAddMore }: {
  tenantId: string; plan: "free" | "basic" | "pro"; branches: Branch[]; canAddMore: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", address: "", googlePlaceId: "" });

  function resetForm() {
    setForm({ name: "", slug: "", address: "", googlePlaceId: "" });
    setShowAddForm(false);
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.slug.trim() || busy) return;
    setBusy(true);
    const result = await addBranch(tenantId, form.name, form.slug, form.address, form.googlePlaceId);
    setBusy(false);
    if (result?.error) {
      alert(result.error);
    } else {
      resetForm();
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus cabang "${name}"? Feedback dari cabang ini akan ikut terhapus.`)) return;
    setBusy(true);
    await deleteBranch(id);
    setBusy(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Cabang</h1>
          <p className="text-slate-600 text-sm mt-1">
            Kelola cabang bisnis Anda. Setiap cabang punya URL form publik sendiri.
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            disabled={!canAddMore}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
            title={!canAddMore ? `Limit ${plan} tercapai` : ""}
          >
            {!canAddMore && <Lock className="w-4 h-4" />}
            <Plus className="w-4 h-4" /> Tambah Cabang
          </button>
        )}
      </div>

      {!canAddMore && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-sm text-amber-800">
          Anda sudah mencapai limit cabang untuk plan <strong>{plan.toUpperCase()}</strong>.
          <Link href="/pricing" className="ml-1 font-medium underline">Upgrade plan</Link> untuk tambah cabang.
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <h3 className="font-semibold mb-3">Cabang Baru</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nama Cabang *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Cabang Sudirman"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-sky-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug (untuk URL) *</label>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                placeholder="sudirman"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-sky-500 outline-none font-mono text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">Akan jadi: bamboy.my.id/f/{form.slug || "slug"}</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Alamat</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Jl. Sudirman No. 1, Jakarta"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-sky-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Google Place ID <span className="text-slate-400">(opsional, untuk QR review)</span>
              </label>
              <input
                value={form.googlePlaceId}
                onChange={(e) => setForm({ ...form, googlePlaceId: e.target.value })}
                placeholder="ChIJ... (dari Google Maps)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-sky-500 outline-none font-mono text-sm"
              />
              <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener" className="text-xs text-sky-600 hover:underline mt-1 inline-flex items-center gap-1">
                Cara cari Place ID <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAdd}
              disabled={busy || !form.name.trim() || !form.slug.trim()}
              className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              Simpan Cabang
            </button>
            <button onClick={resetForm} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">
              Batal
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {branches.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <MapPin className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p>Belum ada cabang. Tambah cabang pertama Anda di atas.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {branches.map((b) => (
              <li key={b.id} className="px-5 py-4">
                {editingId === b.id ? (
                  <EditBranchForm
                    branch={b}
                    onSave={async (data) => {
                      setBusy(true);
                      const { updateBranch } = await import("./actions");
                      await updateBranch(b.id, data.name, data.slug, data.address, data.googlePlaceId);
                      setBusy(false);
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                    busy={busy}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {b.name}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">{b.address || "—"}</p>
                      <div className="flex flex-wrap gap-2 mt-2 text-xs">
                        <Link
                          href={`/f/${b.slug}`}
                          target="_blank"
                          className="text-sky-600 hover:underline bg-sky-50 px-2 py-0.5 rounded"
                        >
                          /f/{b.slug} ↗
                        </Link>
                        {b.googlePlaceId && (
                          <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
                            Place: {b.googlePlaceId.slice(0, 12)}…
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => setEditingId(b.id)}
                        className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id, b.name)}
                        disabled={busy}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EditBranchForm({ branch, onSave, onCancel, busy }: {
  branch: Branch;
  onSave: (data: { name: string; slug: string; address: string; googlePlaceId: string }) => Promise<void>;
  onCancel: () => void;
  busy: boolean;
}) {
  const [data, setData] = useState({
    name: branch.name,
    slug: branch.slug,
    address: branch.address || "",
    googlePlaceId: branch.googlePlaceId || "",
  });
  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <input
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
          placeholder="Nama"
          className="px-3 py-2 border border-slate-300 rounded-lg outline-none"
        />
        <input
          value={data.slug}
          onChange={(e) => setData({ ...data, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
          placeholder="slug"
          className="px-3 py-2 border border-slate-300 rounded-lg outline-none font-mono text-sm"
        />
        <input
          value={data.address}
          onChange={(e) => setData({ ...data, address: e.target.value })}
          placeholder="Alamat"
          className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg outline-none"
        />
        <input
          value={data.googlePlaceId}
          onChange={(e) => setData({ ...data, googlePlaceId: e.target.value })}
          placeholder="Google Place ID"
          className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg outline-none font-mono text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave(data)}
          disabled={busy}
          className="bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1"
        >
          <Check className="w-4 h-4" /> Simpan
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1">
          <X className="w-4 h-4" /> Batal
        </button>
      </div>
    </div>
  );
}
