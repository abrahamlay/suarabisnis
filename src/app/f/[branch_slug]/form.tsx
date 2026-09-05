"use client";
import { useState, useEffect } from "react";
import { Star, Send, Check, ChevronLeft, MessageSquareWarning, Heart, MapPin } from "lucide-react";
import { submitFeedback } from "./actions";

type Props = {
  tenant: {
    id: string;
    name: string;
    logoUrl: string | null;
    primaryColor: string | null;
    greetingText: string | null;
    thankYouText: string | null;
  };
  branch: {
    id: string;
    name: string;
    slug: string;
    googlePlaceLat: number | null;
    googlePlaceLng: number | null;
    googlePlaceName: string | null;
    address: string | null;
  };
  categories: { id: string; name: string }[];
  reviewToken: string | null;
  visitId: string | null;
};

type Outcome = "positive" | "neutral" | "negative" | null;

function ratingToOutcome(r: number): Outcome {
  if (r === 0) return null;
  if (r <= 2) return "negative";
  if (r === 3) return "neutral";
  return "positive";
}

function getRatingLabel(r: number): string {
  if (r === 5) return "Luar biasa";
  if (r === 4) return "Bagus";
  if (r === 3) return "Cukup";
  if (r === 2) return "Kurang";
  if (r === 1) return "Kecewa";
  return "";
}

export default function FeedbackForm({
  tenant,
  branch,
  categories,
  reviewToken,
  visitId,
}: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageLoadTime] = useState(() => Date.now());
  // Inline quick review for positive flow (optional fallback if user doesn't want to log in to Google)
  const [quickReview, setQuickReview] = useState("");
  const [showGoogleHelp, setShowGoogleHelp] = useState(false);

  const primaryColor = tenant.primaryColor || "#0ea5e9";

  // Track visit + bounce on unmount
  useEffect(() => {
    if (!visitId) return;
    return () => {
      const duration = Date.now() - pageLoadTime;
      // Fire and forget - track bounce
      fetch("/api/visits/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId, action: "bounced", durationMs: duration }),
        keepalive: true,
      }).catch(() => {});
    };
  }, [visitId, pageLoadTime]);

  function pickRating(n: number) {
    setRating(n);
    const o = ratingToOutcome(n);
    setOutcome(o);
    if (visitId) {
      // Track "clicked_google" if user picks 4-5
      if (o === "positive" && reviewToken) {
        fetch("/api/visits/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitId, action: "clicked_google" }),
        }).catch(() => {});
      }
    }
  }

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    formData.set("tenantId", tenant.id);
    formData.set("branchId", branch.id);
    formData.set("rating", String(rating));
    formData.set("outcome", outcome ?? "");
    const result = await submitFeedback(formData);
    if (visitId) {
      fetch("/api/visits/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId, action: "submitted_feedback" }),
      }).catch(() => {});
    }
    setSubmitting(false);
    if (result?.success) setSubmitted(true);
  }

  /**
   * Positive flow: save the rating as feedback immediately (category/message
   * optional), then offer the Google review button on the thank-you screen.
   * Happy customers shouldn't fill a long form before reaching Google.
   */
  async function handlePositiveSubmit() {
    setSubmitting(true);
    const fd = new FormData();
    fd.set("tenantId", tenant.id);
    fd.set("branchId", branch.id);
    fd.set("rating", String(rating));
    fd.set("outcome", "positive");
    const result = await submitFeedback(fd);
    if (visitId) {
      fetch("/api/visits/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId, action: "submitted_feedback" }),
      }).catch(() => {});
    }
    setSubmitting(false);
    if (result?.success) setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}08 0%, #fff 50%, ${primaryColor}10 100%)`,
        }}
      >
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-sm text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${primaryColor}1a` }}
          >
            <Check className="w-8 h-8" style={{ color: primaryColor }} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Terima kasih</h2>
          <p className="text-slate-600 mb-6">
            {tenant.thankYouText ||
              `Feedback Anda sudah kami terima. Tim ${tenant.name} akan meninjaunya dan menghubungi Anda jika diperlukan.`}
          </p>
          <div
            className="rounded-lg p-4 text-sm mb-6"
            style={{ backgroundColor: `${primaryColor}0d`, color: "#334155" }}
          >
            <strong>Estimasi respon:</strong> 1×24 jam (Senin–Sabtu)
          </div>
          <a
            href={`/f/${branch.slug}`}
            className="inline-flex items-center justify-center gap-2 w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" /> Beri Feedback Lain
          </a>
        </div>
      </div>
    );
  }

  // Positive flow: rating 4-5 → save rating instantly, offer Google review
  if (outcome === "positive" && reviewToken) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}08 0%, #fff 50%, ${primaryColor}10 100%)`,
        }}
      >
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-sm text-center">
          {tenant.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt={tenant.name}
              className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)`,
              }}
            >
              {tenant.name[0]}
            </div>
          )}
          <div className="flex justify-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`w-7 h-7 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}`}
              />
            ))}
          </div>
          {/* Rating saved instantly — happy customer goes straight to Google */}
          <h2 className="text-2xl font-bold mb-2" style={{ color: primaryColor }}>
            {getRatingLabel(rating)}! Terima kasih
          </h2>
          <p className="text-slate-600 mb-6">
            Rating {rating} bintang sudah tersimpan. Mau bagikan pengalaman Anda di Google?
            Ini bantu banget untuk kami dan calon pelanggan lain.
          </p>
          <button
            type="button"
            onClick={async () => {
              // Save the rating first, then open Google Maps (via /r with go=1)
              await handlePositiveSubmit();
              const win = window.open(`/r/${reviewToken}?go=1&utm_source=positive`, "_blank", "noopener,noreferrer");
              if (win) win.focus();
              setShowGoogleHelp(true);
            }}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 w-full text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
            {submitting ? "Menyimpan..." : "Beri Review di Google"}
          </button>

          {/* Short guidance shown after Google Maps opens */}
          {showGoogleHelp && (
            <div className="mt-3 text-left bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-amber-900 mb-1">
                Google Maps terbuka di tab baru.
              </p>
              <p className="text-xs text-amber-800">
                Di aplikasi Maps, klik tombol bintang / <strong>&quot;Tulis ulasan&quot;</strong> langsung di halaman
                bisnis — biasanya muncul di bagian bawah layar. Di web: scroll ke bagian ulasan, klik{" "}
                <strong>&quot;Tulis ulasan&quot;</strong>, pilih bintang, lalu <strong>&quot;Posting&quot;</strong>.
              </p>
              <p className="text-xs text-amber-700 border-t border-amber-200 pt-2">
                💡 Tidak mau login Google? Kasih review di sini juga boleh (opsional):
              </p>
              <textarea
                value={quickReview}
                onChange={(e) => setQuickReview(e.target.value)}
                placeholder={`Apa yang paling Anda suka dari ${tenant.name}?`}
                maxLength={500}
                rows={2}
                className="mt-2 w-full px-2 py-1.5 text-sm rounded border border-amber-300 outline-none focus:border-amber-500 bg-white"
              />
              <button
                type="button"
                onClick={async () => {
                  if (quickReview.trim().length < 3) {
                    setShowGoogleHelp(false);
                    setSubmitted(true);
                    return;
                  }
                  setSubmitting(true);
                  try {
                    const fd = new FormData();
                    fd.set("tenantId", tenant.id);
                    fd.set("branchId", branch.id);
                    fd.set("rating", String(rating));
                    fd.set("outcome", "positive");
                    fd.set("message", quickReview);
                    fd.set("customerName", "");
                    await submitFeedback(fd);
                    setQuickReview("");
                    setShowGoogleHelp(false);
                    setSubmitted(true);
                  } catch (e) {
                    setError("Gagal kirim review");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={submitting || quickReview.trim().length < 3}
                className="mt-2 w-full text-sm px-3 py-1.5 bg-amber-600 text-white rounded disabled:opacity-50 hover:bg-amber-700"
              >
                {submitting ? "Mengirim..." : "Kirim Review ke SuaraBisnis"}
              </button>
            </div>
          )}

          <p className="mt-2 text-xs text-slate-500 text-center">
            Anda akan diarahkan ke Google Maps untuk {tenant.name}
          </p>
          <button
            type="button"
            onClick={() => {
              handlePositiveSubmit();
            }}
            disabled={submitting}
            className="mt-3 text-sm text-slate-500 hover:text-slate-700"
          >
            {submitting ? "Menyimpan..." : "Tidak, cukup rating saja"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}08 0%, #fff 50%, ${primaryColor}10 100%)`,
      }}
    >
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          {tenant.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt={tenant.name}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)`,
              }}
            >
              {tenant.name[0]}
            </div>
          )}
          <div>
            <h1 className="font-bold text-sm">{tenant.name}</h1>
            <p className="text-xs text-slate-500">{branch.name}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form action={handleSubmit} className="max-w-md mx-auto p-6 space-y-6">
        {/* Embedded location map (shows customer the location before reviewing) */}
        {/* Google Maps has deprecated output=embed and X-Frame-Options blocks iframes,
            so we use OpenStreetMap which allows embedding and has no API key. */}
        {branch.googlePlaceLat != null && branch.googlePlaceLng != null && (
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
            <div className="aspect-video w-full relative">
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${branch.googlePlaceLng - 0.005}%2C${branch.googlePlaceLat - 0.005}%2C${branch.googlePlaceLng + 0.005}%2C${branch.googlePlaceLat + 0.005}&layer=mapnik&marker=${branch.googlePlaceLat}%2C${branch.googlePlaceLng}`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                title={`Peta lokasi ${branch.googlePlaceName || branch.name}`}
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="px-3 py-2 bg-white border-t border-slate-200 flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: primaryColor }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {branch.googlePlaceName || branch.name}
                </p>
                {branch.address && (
                  <p className="text-xs text-slate-500 truncate">{branch.address}</p>
                )}
              </div>
              <a
                href={`https://www.google.com/maps/place/${encodeURIComponent((branch.googlePlaceName || branch.name).replace(/\s+/g, "+"))}/@${branch.googlePlaceLat},${branch.googlePlaceLng},17z`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-sky-600 hover:underline shrink-0"
              >
                Buka di Maps
              </a>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold mb-1">
            {tenant.greetingText || "Kritik & Saran"}
          </h2>
          <p className="text-slate-600 text-sm">
            {outcome === "negative"
              ? "Mohon maaf atas pengalamannya. Bantu kami perbaiki dengan cerita di bawah."
              : "Bantu kami menjadi lebih baik. Feedback Anda berharga."}
          </p>
        </div>

        {/* Rating */}
        <div>
          <label className="block text-sm font-medium mb-2">Bagaimana pengalaman Anda?</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => pickRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform active:scale-95"
                aria-label={`Rating ${n} dari 5`}
              >
                <Star
                  className={`w-10 h-10 ${n <= (hoverRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-xs text-slate-500 mt-2">{getRatingLabel(rating)}</p>
          )}
        </div>

        {/* Negative flow banner */}
        {outcome === "negative" && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <MessageSquareWarning className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <strong>Masukan Anda penting.</strong> Isi detail di bawah, dan tim kami akan menghubungi Anda.
            </div>
          </div>
        )}

        {/* Kategori */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Kategori <span className="text-red-500">*</span>
          </label>
          <select
            name="categoryId"
            required
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 outline-none"
            style={{ borderColor: outcome ? primaryColor : undefined }}
          >
            <option value="">Pilih kategori...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Pesan */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {outcome === "negative" ? "Apa yang perlu diperbaiki?" : "Pesan"}{" "}
            <span className="text-red-500">*</span>
          </label>
          <textarea
            name="message"
            required
            rows={outcome === "negative" ? 5 : 4}
            maxLength={500}
            placeholder={
              outcome === "negative"
                ? "Ceritakan apa yang kurang, dan saran perbaikan..."
                : "Ceritakan pengalaman atau saran Anda..."
            }
            className="w-full px-4 py-3 rounded-lg border border-slate-300 outline-none resize-none focus:ring-2"
            style={{ borderColor: outcome ? primaryColor : undefined }}
          />
          <p className="text-xs text-slate-500 mt-1">Maks. 500 karakter</p>
        </div>

        {/* Optional contact - surfaced for negative flow */}
        <div className={`border-t border-slate-200 pt-4 ${outcome === "negative" ? "bg-amber-50 -mx-6 px-6 pb-4 rounded-lg" : ""}`}>
          <p className="text-xs text-slate-500 mb-3">
            {outcome === "negative"
              ? "Boleh isi kontak di bawah agar kami bisa follow up dan follow-up masalah Anda"
              : "Opsional — isi jika ingin kami hubungi balik"}
          </p>
          <div className="space-y-3">
            <input
              name="customerName"
              placeholder="Nama"
              required={outcome === "negative"}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 outline-none text-sm"
              style={{ borderColor: outcome ? primaryColor : undefined }}
            />
            <input
              name="customerContact"
              placeholder="Email atau No. WhatsApp"
              required={outcome === "negative"}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 outline-none text-sm"
              style={{ borderColor: outcome ? primaryColor : undefined }}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || rating === 0}
          className="w-full text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: primaryColor }}
        >
          {submitting ? (
            "Mengirim..."
          ) : outcome === "negative" ? (
            <>
              <Heart className="w-4 h-4" /> Kirim dan Minta Follow Up
            </>
          ) : (
            <>
              <Send className="w-4 h-4" /> Kirim Feedback
            </>
          )}
        </button>

        <p className="text-xs text-center text-slate-400">
          Feedback Anda aman dan hanya dilihat oleh tim {tenant.name}.
        </p>
      </form>
    </div>
  );
}
