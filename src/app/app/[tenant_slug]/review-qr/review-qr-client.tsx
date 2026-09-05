"use client";
import { useState, useEffect, useRef } from "react";
import { Download, Copy, Check, Plus, ExternalLink, BarChart3, X, MapPin, Search, Link2, Loader2, AlertCircle, Star } from "lucide-react";
import { useRouter } from "next/navigation";

type Branch = { id: string; name: string; slug: string };
type Token = {
  id: string;
  token: string;
  label: string | null;
  branchName: string;
  branchSlug: string | null;
  active: boolean;
  scansLast30d: number;
  createdAt: Date;
  googlePlaceId: string;
  googlePlaceName: string | null;
};

type NominatimResult = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  importance?: number;
};

export default function ReviewQrClient({
  tenantSlug,
  tenantName,
  branches,
  tokens: initialTokens,
  baseUrl,
}: {
  tenantSlug: string;
  tenantName: string;
  branches: Branch[];
  tokens: Token[];
  baseUrl: string;
}) {
  const router = useRouter();
  const [tokens, setTokens] = useState(initialTokens);
  const [showCreate, setShowCreate] = useState(false);
  const [size, setSize] = useState<256 | 512 | 1024 | 2048>(1024);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          {tokens.length} QR untuk {branches.length} cabang
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" /> QR Baru
        </button>
      </div>

      {tokens.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M14 14h2v2h-2zM18 14h3v3h-3zM14 18h3v3h-3z" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-1">Belum ada QR</h3>
          <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
            Generate QR pertama untuk mulai tracking scan review. Tiap cabang bisa punya QR sendiri.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600"
          >
            <Plus className="w-4 h-4" /> Generate QR Pertama
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tokens.map((t) => (
            <QrCard
              key={t.id}
              token={t}
              size={size}
              baseUrl={baseUrl}
              onSizeChange={setSize}
            />
          ))}
        </div>
      )}

      {/* Size selector */}
      {tokens.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-medium mb-2">Resolusi Download</p>
          <p className="text-xs text-slate-500 mb-3">
            256-512px untuk tampilan digital. 1024-2048px untuk cetak (kartu nama, stiker, banner).
          </p>
          <div className="flex gap-2 flex-wrap">
            {[256, 512, 1024, 2048].map((s) => (
              <button
                key={s}
                onClick={() => setSize(s as 256 | 512 | 1024 | 2048)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  size === s
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {s}px
              </button>
            ))}
          </div>
        </div>
      )}

      {showCreate && (
        <CreateQrModal
          tenantSlug={tenantSlug}
          branches={branches}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function QrCard({
  token,
  size,
  baseUrl,
  onSizeChange,
}: {
  token: Token;
  size: 256 | 512 | 1024 | 2048;
  baseUrl: string;
  onSizeChange: (s: 256 | 512 | 1024 | 2048) => void;
}) {
  const [copied, setCopied] = useState(false);
  const qrUrl = `${baseUrl}/r/${token.token}?utm_source=qr_card&utm_medium=qr&utm_campaign=review`;
  const downloadUrl = `/api/qr/${token.token}?size=${size}&source=download`;
  const previewUrl = `/api/qr/${token.token}?size=256&source=preview`;

  function copyLink() {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{token.branchName}</h3>
          {token.label && <p className="text-xs text-slate-500 truncate">{token.label}</p>}
        </div>
        <span
          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold shrink-0 ${
            token.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {token.active ? "Aktif" : "Non-aktif"}
        </span>
      </div>

      <div className="aspect-square bg-slate-50 rounded-xl mb-3 overflow-hidden flex items-center justify-center">
        <img src={previewUrl} alt="QR Code" className="w-full h-full object-contain" />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1">
          <BarChart3 className="w-3 h-3" /> {token.scansLast30d} scan (30 hari)
        </span>
        <a
          href={qrUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-600 hover:underline flex items-center gap-0.5"
        >
          Test <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="space-y-2">
        <a
          href={downloadUrl}
          download={`qr-${size}px-${token.branchName.replace(/\s+/g, "-")}.png`}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
        >
          <Download className="w-4 h-4" /> Download {size}px
        </a>
        <button
          onClick={copyLink}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" /> Tersalin
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" /> Salin Link
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Location Picker with TWO modes:
 * 1. Search — uses OpenStreetMap Nominatim (free, no API key) to find places
 * 2. Paste — user pastes a Google Maps link or Place ID
 *
 * Both modes end with a preview map and "Open in Google Maps" button to verify
 * the location is correct before saving.
 */
function LocationPicker({
  selected,
  onSelect,
}: {
  selected: { placeId: string; name: string } | null;
  onSelect: (place: { placeId: string; name: string } | null) => void;
}) {
  const [mode, setMode] = useState<"search" | "paste">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search Nominatim (debounced)
  useEffect(() => {
    if (mode !== "search") return;
    if (query.trim().length < 3) {
      setResults([]);
      setSearchError(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const params = new URLSearchParams({
          q: query,
          format: "json",
          limit: "8",
          addressdetails: "1",
          countrycodes: "id", // Bias to Indonesia
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          headers: { "User-Agent": "SuaraBisnis/1.0 (contact@bamboy.my.id)" },
        });
        if (!res.ok) throw new Error("Search failed");
        const data = (await res.json()) as NominatimResult[];
        setResults(data);
        if (data.length === 0) {
          setSearchError("Tidak ada hasil. Coba kata kunci lain atau paste link Google Maps langsung.");
        }
      } catch (err) {
        setSearchError("Gagal mencari. Coba lagi atau paste link langsung.");
      } finally {
        setSearching(false);
      }
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, mode]);

  function pickResult(r: NominatimResult) {
    // Nominatim gives lat/lon but not Google Place ID.
    // Open Google Maps DIRECTLY at the place coordinates so it's already loaded.
    // User then clicks Share → Copy Link, pastes back in "Paste Link" tab.
    const name = r.name || r.display_name.split(",")[0];
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_ll=${r.lat},${r.lon}`;
    window.open(mapsUrl, "_blank", "noopener,noreferrer");
    // Switch to paste mode so user can paste the share link they just copied
    setMode("paste");
    setSearchError(
      "Google Maps terbuka. Klik bisnis Anda yang benar, lalu klik Share → Copy Link, lalu paste di bawah."
    );
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <button
          type="button"
          onClick={() => setMode("search")}
          className={`flex-1 px-3 py-2 text-sm font-medium flex items-center justify-center gap-1.5 ${
            mode === "search"
              ? "bg-white text-slate-900 border-b-2 border-sky-500"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Search className="w-3.5 h-3.5" /> Cari Tempat
        </button>
        <button
          type="button"
          onClick={() => setMode("paste")}
          className={`flex-1 px-3 py-2 text-sm font-medium flex items-center justify-center gap-1.5 ${
            mode === "paste"
              ? "bg-white text-slate-900 border-b-2 border-sky-500"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Link2 className="w-3.5 h-3.5" /> Paste Link
        </button>
      </div>

      <div className="p-3">
        {mode === "search" ? (
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari: Warung Bam, Cafe Sudirman, dst..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none text-sm"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
              )}
            </div>
            {searchError && (
              <p className="text-xs text-amber-600 mt-2 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{searchError}</span>
              </p>
            )}
            {results.length > 0 && (
              <div className="mt-3 max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {results.map((r) => (
                  <button
                    key={r.place_id}
                    type="button"
                    onClick={() => pickResult(r)}
                    className="w-full text-left px-3 py-2 hover:bg-sky-50 transition flex items-start gap-2"
                  >
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {r.name || r.display_name.split(",")[0]}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{r.display_name}</p>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-400 shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            )}
            {!searching && results.length === 0 && query.length === 0 && (
              <p className="text-xs text-slate-500 mt-2">
                Ketik nama bisnis atau tempat. Minimal 3 karakter.
              </p>
            )}
          </div>
        ) : (
          <PasteLinkMode
            selected={selected}
            onSelect={onSelect}
          />
        )}

        {/* Selected preview */}
        {selected && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-start gap-2 mb-2">
              <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-900 truncate">{selected.name}</p>
                <p className="text-xs text-emerald-700 truncate font-mono">{selected.placeId}</p>
              </div>
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="text-emerald-700 hover:text-emerald-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Google Maps preview (no API key needed) */}
            <div className="rounded overflow-hidden border border-emerald-200 bg-slate-100 aspect-video">
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(selected.name)}&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                title={`Map preview: ${selected.name}`}
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <a
                href={`https://www.google.com/maps/place/${encodeURIComponent(selected.name.replace(/\s+/g, "+"))}/data=!4m2!3m1!1s${encodeURIComponent(selected.placeId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 font-medium px-2 py-1.5 bg-white border border-emerald-200 rounded"
              >
                <ExternalLink className="w-3 h-3" /> Buka di Google Maps
              </a>
              <a
                href={`https://www.google.com/maps/place/${encodeURIComponent(selected.name.replace(/\s+/g, "+"))}/data=!4m2!3m1!1s${encodeURIComponent(selected.placeId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 font-medium px-2 py-1.5 rounded"
              >
                <Star className="w-3 h-3" /> Tulis Review
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PasteLinkMode({
  selected,
  onSelect,
}: {
  selected: { placeId: string; name: string } | null;
  onSelect: (p: { placeId: string; name: string } | null) => void;
}) {
  const [pasteValue, setPasteValue] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleParse() {
    if (!pasteValue.trim()) return;
    setParsing(true);
    setError(null);
    try {
      const { parseGoogleMapsLink } = await import("../reviews/actions");
      const result = await parseGoogleMapsLink(pasteValue);
      if (result.kind === "invalid") {
        setError(result.reason);
        return;
      }
      // If no name, ask user to provide one
      if (!result.name) {
        setError("Link valid tapi nama tempat tidak terbaca. Coba paste link dari Google Maps web (bukan app).");
        return;
      }
      onSelect({ placeId: result.value, name: result.name });
      setPasteValue("");
    } catch (err) {
      setError("Gagal parsing. Coba link lain atau paste Place ID langsung (ChIJ...).");
    } finally {
      setParsing(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={pasteValue}
          onChange={(e) => setPasteValue(e.target.value)}
          placeholder="Paste link Google Maps di sini..."
          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleParse();
            }
          }}
        />
        <button
          type="button"
          onClick={handleParse}
          disabled={parsing || !pasteValue.trim()}
          className="px-3 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 disabled:opacity-50 flex items-center gap-1.5"
        >
          {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Parse
        </button>
      </div>
      {error && (
        <p className="text-xs text-amber-600 mt-2 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}
      <p className="text-xs text-slate-500 mt-2">
        Buka <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">Google Maps</a>, cari bisnis Anda, klik Share → Copy link, paste di sini.
      </p>
    </div>
  );
}

function CreateQrModal({
  tenantSlug,
  branches,
  onClose,
  onCreated,
}: {
  tenantSlug: string;
  branches: Branch[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [picked, setPicked] = useState<{ placeId: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) {
      setError("Pilih lokasi dulu (cari atau paste link)");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Build a Google Maps URL (the canonical share format) and pass that
      // to the action so it extracts name + Place ID via parseGoogleMapsLink
      const mapsLink = `https://www.google.com/maps/place/${encodeURIComponent(picked.name.replace(/\s+/g, "+"))}/data=!4m2!3m1!1s${encodeURIComponent(picked.placeId)}`;
      const { createReviewQrForTenant } = await import("../reviews/actions");
      const result = await createReviewQrForTenant({
        tenantSlug,
        branchId,
        label: label || undefined,
        googlePlaceId: mapsLink,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">QR Review Baru</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Cabang *</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none"
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
            <label className="block text-sm font-medium mb-1">Label (opsional)</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={50}
              placeholder="Contoh: QR Meja 1, QR Struk, QR Kasir"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Lokasi Google Maps *
            </label>
            <LocationPicker selected={picked} onSelect={setPicked} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !picked || !branchId}
              className="flex-1 px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Membuat...
                </>
              ) : (
                "Generate"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
