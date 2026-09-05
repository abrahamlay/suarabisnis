"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X, Loader2, CreditCard, Shield, Lock } from "lucide-react";
import { mockActivateAction } from "./actions";
import { PLANS } from "@/lib/modules";
import type { Plan } from "@/db/schema";
import { formatDate } from "@/lib/helpers";

export default function MockCheckoutClient() {
  const router = useRouter();
  const params = useSearchParams();
  const tenant = params.get("tenant") ?? "";
  const plan = (params.get("plan") ?? "basic") as Plan;
  const returnUrl = params.get("return") ?? "/";

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const planInfo = PLANS[plan as keyof typeof PLANS];

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function handlePay() {
    setError(null);
    setBusy(true);
    startTransition(async () => {
      const res = await mockActivateAction(tenant, plan);
      setBusy(false);
      if (!res.success) {
        setError(res.error ?? "Aktivasi gagal");
        return;
      }
      showToast("Langganan aktif!");
      setTimeout(() => {
        router.push(returnUrl);
      }, 800);
    });
  }

  function handleCancel() {
    router.push("/pricing");
  }

  // Mock order summary numbers
  const subtotal = plan === "pro" ? 299000 : 99000;
  const tax = Math.round(subtotal * 0.11);
  const total = subtotal + tax;
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <Check className="w-5 h-5" />
          <span className="font-medium">{toast}</span>
        </div>
      )}

      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-6">
        {/* Left: Stripe-like order summary */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span className="font-semibold">Stripe Checkout</span>
            <span className="ml-auto text-xs text-slate-400">🔒 Secure (mock)</span>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Order Summary</p>
              <h2 className="text-xl font-bold">{planInfo.name} Plan</h2>
              <p className="text-sm text-slate-600">{planInfo.features[0]}</p>
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium">Rp {subtotal.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">PPN 11%</span>
                <span className="font-medium">Rp {tax.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-200">
                <span>Total hari ini</span>
                <span>Rp {total.toLocaleString("id-ID")}</span>
              </div>
            </div>

            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-sm text-sky-900">
              <p className="font-medium mb-1">Periode langganan</p>
              <p className="text-xs">
                {formatDate(new Date(), { dateStyle: "long" })} → {formatDate(periodEnd, { dateStyle: "long" })}
              </p>
            </div>

            <div className="text-xs text-slate-500 space-y-1">
              <p className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> Pembayaran aman (mock)</p>
              <p className="flex items-center gap-1.5"><CreditCard className="w-3 h-3" /> Kami tidak menyimpan data kartu</p>
            </div>
          </div>
        </div>

        {/* Right: Payment form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-semibold mb-4">Metode Pembayaran (Simulasi)</h3>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Nomor Kartu</label>
              <input
                disabled
                value="4242 4242 4242 4242"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Masa Berlaku</label>
                <input
                  disabled
                  value="12/34"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">CVC</label>
                <input
                  disabled
                  value="•••"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Nama Pemegang Kartu</label>
              <input
                disabled
                value="DEMO USER"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 text-sm"
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 mb-4">
            ⚠️ <strong>Mode Demo:</strong> Ini adalah simulasi Stripe. Tidak ada pembayaran aktual.
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handlePay}
              disabled={busy}
              className="w-full bg-sky-500 text-white py-3 rounded-lg font-semibold hover:bg-sky-600 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
              ) : (
                <>Bayar & Aktivasi</>
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={busy}
              className="w-full bg-white border border-slate-300 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" /> Batal
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-500 text-center">
            Dengan mengklik Bayar & Aktivasi, Anda menyetujui Syarat Layanan SuaraBisnis.
          </p>
        </div>
      </div>
    </div>
  );
}