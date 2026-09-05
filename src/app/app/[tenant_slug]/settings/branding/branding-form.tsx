"use client";
import { useState, useTransition, useRef } from "react";
import { updateBranding } from "./actions";
import { Save, Upload, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Initial = {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  greetingText: string;
  thankYouText: string;
};

export default function BrandingForm({
  tenantSlug,
  initial,
}: {
  tenantSlug: string;
  initial: Initial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(initial.name);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor);
  const [accentColor, setAccentColor] = useState(initial.accentColor);
  const [greetingText, setGreetingText] = useState(initial.greetingText);
  const [thankYouText, setThankYouText] = useState(initial.thankYouText);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("File terlalu besar. Maks 2MB.");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
      setError("Format harus PNG, JPG, WebP, atau SVG.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/upload/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug, dataUrl, fileName: file.name, mimeType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload gagal");
        return;
      }
      setLogoUrl(data.url);
    } catch (err) {
      setError("Gagal upload logo. Coba lagi.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveLogo() {
    if (!confirm("Hapus logo? Anda bisa upload ulang kapan saja.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/upload/logo", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug }),
      });
      if (!res.ok) {
        setError("Gagal hapus logo");
        return;
      }
      setLogoUrl(null);
    } finally {
      setDeleting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    const fd = new FormData();
    fd.set("tenantSlug", tenantSlug);
    fd.set("name", name);
    fd.set("logoUrl", logoUrl ?? "");
    fd.set("primaryColor", primaryColor);
    fd.set("accentColor", accentColor);
    fd.set("greetingText", greetingText);
    fd.set("thankYouText", thankYouText);

    startTransition(async () => {
      const result = await updateBranding(fd);
      setSaving(false);
      if (result?.error) {
        setError(result.error);
      } else {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      {/* Logo */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold mb-1">Logo Bisnis</h2>
        <p className="text-sm text-slate-500 mb-4">
          Ditampilkan di header halaman publik. Format: PNG, JPG, WebP, atau SVG. Maks 2MB.
        </p>
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0"
            style={logoUrl ? undefined : { backgroundColor: primaryColor + "1a" }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                {name[0]?.toUpperCase() || "B"}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Mengupload...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Upload Logo
                </>
              )}
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}{" "}
                Hapus
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Business name */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold mb-1">Nama Bisnis</h2>
        <p className="text-sm text-slate-500 mb-3">
          Ditampilkan di header halaman publik dan dashboard.
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-100 outline-none"
        />
      </div>

      {/* Greeting + thank you */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold mb-1">Sapaan</h2>
        <p className="text-sm text-slate-500 mb-3">Teks di atas form feedback publik.</p>
        <input
          type="text"
          value={greetingText}
          onChange={(e) => setGreetingText(e.target.value)}
          maxLength={200}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-100 outline-none"
        />

        <h2 className="text-base font-semibold mt-5 mb-1">Pesan Terima Kasih</h2>
        <p className="text-sm text-slate-500 mb-3">
          Ditampilkan setelah pelanggan kirim feedback.
        </p>
        <textarea
          value={thankYouText}
          onChange={(e) => setThankYouText(e.target.value)}
          maxLength={300}
          rows={2}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-100 outline-none resize-none"
        />
      </div>

      {/* Colors */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold mb-1">Warna Utama</h2>
        <p className="text-sm text-slate-500 mb-3">
          Warna tombol dan elemen aksen di halaman publik.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="w-14 h-14 rounded-lg border border-slate-200 cursor-pointer"
          />
          <input
            type="text"
            value={primaryColor}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setPrimaryColor(v);
            }}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:border-slate-900 outline-none font-mono text-sm"
          />
        </div>

        <h2 className="text-base font-semibold mt-5 mb-1">Warna Aksen</h2>
        <p className="text-sm text-slate-500 mb-3">Untuk heading dan elemen sekunder.</p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            className="w-14 h-14 rounded-lg border border-slate-200 cursor-pointer"
          />
          <input
            type="text"
            value={accentColor}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setAccentColor(v);
            }}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:border-slate-900 outline-none font-mono text-sm"
          />
        </div>
      </div>

      {/* Live preview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold mb-1">Preview</h2>
        <p className="text-sm text-slate-500 mb-4">
          Begini tampilan halaman publik dengan setting di atas.
        </p>
        <div
          className="rounded-xl p-6 max-w-md"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}10 0%, #fff 50%, ${primaryColor}15 100%)`,
          }}
        >
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                {name[0]?.toUpperCase() || "B"}
              </div>
            )}
            <div>
              <p className="font-bold text-sm" style={{ color: accentColor }}>
                {name || "Nama Bisnis"}
              </p>
              <p className="text-xs text-slate-500">Cabang Sudirman</p>
            </div>
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: accentColor }}>
            {greetingText || "Halo! Beri kami kritik dan saran"}
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            Bantu kami menjadi lebih baik. Feedback Anda berharga.
          </p>
          <button
            type="button"
            disabled
            className="w-full text-white py-2.5 rounded-lg font-medium text-sm"
            style={{ backgroundColor: primaryColor, opacity: 0.8 }}
          >
            Kirim Feedback
          </button>
        </div>
      </div>

      {/* Error / saved */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}
      {saved && !error && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm">
          Perubahan tersimpan.
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={pending || saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving || pending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Simpan Branding
        </button>
      </div>
    </form>
  );
}
