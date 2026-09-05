"use client";
import { useState } from "react";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { addCategory, updateCategory, deleteCategory, toggleCategory } from "./actions";

type Category = { id: string; name: string; icon: string | null; order: number; active: number };

export default function CategoryManager({ tenantId, categories }: { tenantId: string; categories: Category[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (!newName.trim() || busy) return;
    setBusy(true);
    await addCategory(tenantId, newName.trim());
    setNewName("");
    setBusy(false);
  }

  async function handleUpdate(id: string) {
    if (!editName.trim() || busy) return;
    setBusy(true);
    await updateCategory(id, editName.trim());
    setEditingId(null);
    setBusy(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus kategori ini? Feedback dengan kategori ini akan menjadi 'Tanpa Kategori'.")) return;
    setBusy(true);
    await deleteCategory(id);
    setBusy(false);
  }

  async function handleToggle(id: string, currentActive: number) {
    setBusy(true);
    await toggleCategory(id, currentActive ? 0 : 1);
    setBusy(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Kategori Feedback</h1>
          <p className="text-slate-600 text-sm mt-1">Kelola kategori yang muncul di form customer</p>
        </div>
      </div>

      {/* Add new */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <label className="block text-sm font-medium mb-2">Tambah Kategori Baru</label>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Contoh: Pelayanan, Produk, Kebersihan"
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
            disabled={busy}
          />
          <button
            onClick={handleAdd}
            disabled={busy || !newName.trim()}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {categories.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p>Belum ada kategori. Tambah kategori pertama Anda di atas.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {categories.map((c) => (
              <li key={c.id} className="px-4 py-3 flex items-center gap-3">
                {editingId === c.id ? (
                  <>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdate(c.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg focus:border-sky-500 outline-none"
                    />
                    <button onClick={() => handleUpdate(c.id)} disabled={busy} className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-medium">{c.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${c.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {c.active ? "Aktif" : "Nonaktif"}
                    </span>
                    <button
                      onClick={() => handleToggle(c.id, c.active)}
                      disabled={busy}
                      className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1"
                    >
                      {c.active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button
                      onClick={() => { setEditingId(c.id); setEditName(c.name); }}
                      className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={busy}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
