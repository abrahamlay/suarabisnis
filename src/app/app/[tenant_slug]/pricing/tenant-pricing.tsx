"use client";

import Link from "next/link";
import { Check, Sparkles, ArrowRight } from "lucide-react";

const PLANS = [
  {
    name: "Gratis",
    price: "Rp 0",
    period: "",
    desc: "Untuk coba-coba",
    features: ["1 cabang", "Modul Kritik & Saran", "Dashboard admin", "100 feedback/bulan"],
    cta: "Mulai Gratis",
    highlight: false,
  },
  {
    name: "Basic",
    price: "Rp 99rb",
    period: "/bulan",
    desc: "Untuk UMKM",
    features: ["3 cabang", "Semua modul Basic", "Email notifikasi", "1.000 feedback/bulan"],
    cta: "Pilih Plan",
    highlight: true,
  },
  {
    name: "Pro",
    price: "Rp 299rb",
    period: "/bulan",
    desc: "Untuk bisnis serius",
    features: ["Cabang unlimited", "Semua modul", "Custom branding", "Priority support", "Feedback unlimited"],
    cta: "Pilih Plan",
    highlight: false,
  },
];

const FAQ = [
  { q: "Apakah ada masa coba gratis?", a: "Ya! Plan Gratis bisa dipakai selamanya tanpa batas waktu. Anda bisa upgrade ke Basic atau Pro kapan saja." },
  { q: "Bagaimana cara pembayaran?", a: "Untuk MVP ini kami gunakan simulasi Stripe Checkout. Di versi produksi akan terintegrasi dengan payment gateway Indonesia seperti Midtrans atau Xendit." },
  { q: "Bisakah saya ganti plan nanti?", a: "Tentu. Anda bisa upgrade atau downgrade kapan saja dari halaman pengaturan. Tidak ada komitmen tahunan." },
  { q: "Apakah data saya aman?", a: "Sangat aman. Server berada di Indonesia, comply dengan UU PDP, dan kami menggunakan enkripsi end-to-end. Password di-hash dengan bcrypt, dan IP customer di-hash untuk privasi." },
  { q: "Berapa cabang yang bisa saya kelola?", a: "Tergantung plan: 1 cabang untuk Gratis, 3 cabang untuk Basic, dan unlimited untuk Pro. Anda bisa tambah cabang kapan saja dari dashboard." },
];

export default function TenantPricing({ tenantName, tenantSlug }: { tenantName: string; tenantSlug: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      {/* Nav */}
      <nav className="border-b border-slate-200/60 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">{tenantName[0]}</span>
            </div>
            <span className="font-bold text-lg">{tenantName}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/app/${tenantSlug}/demo`} className="text-sm text-slate-700 hover:text-slate-900">Demo</Link>
            <Link href={`/app/${tenantSlug}/login`} className="text-sm text-slate-700 hover:text-slate-900">Masuk</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-8 text-center">
        <div className="inline-block px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-medium mb-4">💎 Harga Sederhana</div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
          Pilih Plan untuk <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">{tenantName}</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">Mulai gratis, upgrade kapan saja. Tidak perlu kartu kredit untuk plan gratis.</p>
      </section>

      {/* Plans */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-7 rounded-2xl border-2 ${plan.highlight ? "border-sky-500 bg-white shadow-lg scale-[1.02]" : "border-slate-200 bg-white"}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Paling Populer
                </div>
              )}
              <h3 className="font-semibold text-lg">{plan.name}</h3>
              <p className="text-sm text-slate-500 mt-1">{plan.desc}</p>
              <div className="mt-5 mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-slate-500 text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-7">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/app/${tenantSlug}/login`}
                className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition ${
                  plan.highlight ? "bg-sky-500 text-white hover:bg-sky-600" : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {plan.cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Pertanyaan Umum</h2>
        <div className="space-y-3">
          {FAQ.map((item) => (
            <details key={item.q} className="group bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-slate-300 transition">
              <summary className="flex items-center gap-3 cursor-pointer list-none">
                <span className="font-medium flex-1">{item.q}</span>
                <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="mt-3 text-sm text-slate-600 pl-0">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-8">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>© 2026 {tenantName}. Ditenagai oleh SuaraBisnis.</p>
          <div className="flex gap-6">
            <Link href={`/app/${tenantSlug}/demo`} className="hover:text-slate-900">Demo</Link>
            <Link href={`/app/${tenantSlug}/login`} className="hover:text-slate-900">Masuk</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
