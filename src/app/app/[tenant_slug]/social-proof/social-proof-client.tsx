"use client";
import { useState, useTransition } from "react";
import { Star, Download, Trash2, Sparkles, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { generateSocialProofImage, deleteSocialProofImage } from "./actions";

type Candidate = {
  id: string;
  rating: number;
  message: string;
  customerName: string | null;
  createdAt: Date;
};
type Image = {
  id: string;
  template: string;
  dataUrl: string;
  width: number;
  height: number;
  createdAt: Date;
};

type Template = "star-five" | "star-quote" | "minimal-card";

const TEMPLATES: { id: Template; label: string; description: string; gradient: string }[] = [
  {
    id: "star-five",
    label: "Star Five",
    description: "Background warna brand, 5 bintang besar, quote besar",
    gradient: "from-sky-500 to-blue-600",
  },
  {
    id: "star-quote",
    label: "Quote Cream",
    description: "Background cream, tanda kutip besar, elegan",
    gradient: "from-amber-100 to-amber-200",
  },
  {
    id: "minimal-card",
    label: "Minimal",
    description: "Putih bersih, logo di atas, formal",
    gradient: "from-slate-100 to-white border",
  },
];

export default function SocialProofClient({
  tenantSlug,
  primaryColor,
  candidates,
  recentImages,
}: {
  tenantSlug: string;
  primaryColor: string;
  candidates: Candidate[];
  recentImages: Image[];
}) {
  const router = useRouter();
  const [selectedFb, setSelectedFb] = useState<Candidate | null>(
    candidates[0] ?? null
  );
  const [template, setTemplate] = useState<Template>("star-five");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<Image | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!selectedFb) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateSocialProofImage({
        tenantSlug,
        feedbackId: selectedFb.id,
        template,
      });
      if ("error" in result) {
        setError(result.error ?? "Gagal generate");
        return;
      }
      setGenerated({
        id: result.id,
        template,
        dataUrl: result.dataUrl,
        width: result.width,
        height: result.height,
        createdAt: new Date(),
      });
      router.refresh();
    } finally {
      setGenerating(false);
    }
  }

  function downloadImage(image: Image) {
    const link = document.createElement("a");
    link.href = image.dataUrl;
    link.download = `social-proof-${image.template}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Left: pick feedback + template */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" /> Pilih Review
          </h2>
          {candidates.length === 0 ? (
            <p className="text-sm text-slate-500">
              Belum ada review bintang 4-5 dalam 90 hari terakhir. Submit feedback dari halaman publik untuk lihat di sini.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedFb(c)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition ${
                    selectedFb?.id === c.id
                      ? "border-sky-500 bg-sky-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        {Array.from({ length: c.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <p className="text-sm text-slate-700 line-clamp-2">{c.message}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {c.customerName || "Anonim"} ·{" "}
                        {new Date(c.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold mb-3">Pilih Template</h2>
          <div className="space-y-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplate(t.id)}
                className={`w-full text-left p-3 rounded-lg border-2 transition ${
                  template === t.id
                    ? "border-sky-500 bg-sky-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-br ${t.gradient} flex items-center justify-center text-lg`}
                  >
                    {t.id === "star-five" ? "⭐" : t.id === "star-quote" ? "❝" : "✨"}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t.label}</p>
                    <p className="text-xs text-slate-500">{t.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!selectedFb || generating}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-medium hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" /> Generate Gambar
            </>
          )}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Right: preview + history */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold mb-3">Preview</h2>
          {generated ? (
            <div>
              <div className="rounded-xl overflow-hidden border border-slate-200 mb-3">
                <img
                  src={generated.dataUrl}
                  alt="Generated"
                  className="w-full h-auto"
                />
              </div>
              <button
                onClick={() => downloadImage(generated)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800"
              >
                <Download className="w-4 h-4" /> Download PNG
              </button>
            </div>
          ) : selectedFb ? (
            <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
              Klik <strong>Generate Gambar</strong> untuk membuat preview.
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
              Pilih review dan template dulu.
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold mb-3">Riwayat ({recentImages.length})</h2>
          {recentImages.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada gambar.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {recentImages.map((img) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.dataUrl}
                    alt=""
                    className="w-full h-auto rounded-lg border border-slate-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center gap-2">
                    <button
                      onClick={() => downloadImage(img)}
                      className="p-1.5 bg-white rounded text-slate-900"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <DeleteBtn id={img.id} onDeleted={() => router.refresh()} />
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

function DeleteBtn({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!confirm("Hapus gambar ini?")) return;
        startTransition(async () => {
          await deleteSocialProofImage(id);
          onDeleted();
        });
      }}
      disabled={pending}
      className="p-1.5 bg-white rounded text-red-600 disabled:opacity-50"
      title="Hapus"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  );
}
