"use client";
import { useState } from "react";
import { updateTenantProfile } from "./actions";
import { Save } from "lucide-react";

export default function GeneralSettingsForm({
  tenantId, initialName, initialSlug, initialLogoUrl,
}: { tenantId: string; initialName: string; initialSlug: string; initialLogoUrl: string | null }) {
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave() {
    setBusy(true);
    setMsg(null);
    const result = await updateTenantProfile(tenantId, name, slug, logoUrl || null);
    setBusy(false);
    if (result?.error) setMsg({ type: "error", text: result.error });
    else setMsg({ type: "success", text: "Profil tersimpan!" });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Nama Bisnis</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-sky-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Slug (URL)</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">bamboy.my.id/</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:border-sky-500 outline-none font-mono text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Logo URL <span className="text-slate-400">(opsional)</span></label>
        <input
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-sky-500 outline-none"
        />
      </div>
      {msg && (
        <div className={`px-3 py-2 rounded-lg text-sm ${msg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}
      <button
        onClick={handleSave}
        disabled={busy || !name.trim() || !slug.trim()}
        className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
      >
        <Save className="w-4 h-4" /> {busy ? "Menyimpan..." : "Simpan"}
      </button>
    </div>
  );
}
