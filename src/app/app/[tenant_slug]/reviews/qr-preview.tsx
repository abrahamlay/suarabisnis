"use client";

import { useEffect, useState } from "react";
import { Download, Copy, Printer, Star } from "lucide-react";
import { getQrPngDataUrl } from "./actions";

type Props = {
  token: string;
  googlePlaceId: string;
  label: string | null;
};

export default function QrPreview({ token, googlePlaceId, label }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = await getQrPngDataUrl(token);
        if (!cancelled) setDataUrl(url);
      } catch (e) {
        if (!cancelled) setError("Gagal membuat QR");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function handleDownload() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-review-${label || token}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function handleCopy() {
    const link = `${window.location.origin}/r/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // best-effort; ignore clipboard errors
    }
  }

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full mx-auto">
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> Beri Review di Google
        </div>
        {label && <p className="text-xs text-slate-500 mt-1">{label}</p>}
      </div>

      <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-center min-h-[280px]">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR Code untuk ${label ?? "review"}`}
            className="w-64 h-64 object-contain"
            width={256}
            height={256}
          />
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <p className="text-sm text-slate-500">Membuat QR...</p>
        )}
      </div>

      <p className="text-[10px] text-slate-400 text-center mt-2 break-all">
        Place ID: {googlePlaceId}
      </p>

      <div className="grid grid-cols-3 gap-2 mt-5 print:hidden">
        <button
          type="button"
          onClick={handleDownload}
          disabled={!dataUrl}
          className="flex flex-col items-center justify-center gap-1 py-3 rounded-lg bg-sky-500 text-white text-xs font-medium hover:bg-sky-600 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Download PNG
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="flex flex-col items-center justify-center gap-1 py-3 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200"
        >
          <Copy className="w-4 h-4" />
          {copied ? "Tersalin!" : "Copy Link"}
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="flex flex-col items-center justify-center gap-1 py-3 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>

      <p className="text-[10px] text-center text-slate-400 mt-4 print:hidden">
        Scan QR dengan kamera HP → otomatis terbuka Google review
      </p>
    </div>
  );
}
