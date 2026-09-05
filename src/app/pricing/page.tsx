import Link from "next/link";
import { Check, MessageSquare, ArrowRight, Sparkles, HelpCircle } from "lucide-react";
import { PLANS } from "@/lib/modules";
import type { Plan } from "@/db/schema";
import { getSession } from "@/lib/auth";

export default async function PricingPage() {
  const session = await getSession();
  const planOrder: Plan[] = ["free", "basic", "pro"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      {/* Nav */}
      <nav className="border-b border-slate-200/60 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">SuaraBisnis</span>
          </Link>
          <div className="flex items-center gap-3">
            {session ? (
              <Link
                href={`/app/${session.tenantSlug}`}
                className="text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-slate-700 hover:text-slate-900">
                  Masuk
                </Link>
                <Link
                  href="/signup"
                  className="text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800"
                >
                  Daftar
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-8 text-center">
        <div className="inline-block px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-medium mb-4">
          💎 Harga Sederhana
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
          Harga Sederhana,<br />
          <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
            Tanpa Biaya Tersembunyi
          </span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Mulai gratis, upgrade kapan saja. Tidak perlu kartu kredit untuk plan gratis.
        </p>
      </section>

      {/* Pricing cards */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-6">
          {planOrder.map((planKey) => {
            const plan = PLANS[planKey as keyof typeof PLANS];
            const highlight = planKey === "basic";
            return (
              <div
                key={planKey}
                className={`relative p-7 rounded-2xl border-2 ${
                  highlight
                    ? "border-sky-500 bg-white shadow-lg scale-[1.02]"
                    : "border-slate-200 bg-white"
                }`}
              >
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Paling Populer
                  </div>
                )}
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {planKey === "free"
                    ? "Untuk coba-coba"
                    : planKey === "basic"
                    ? "Untuk UMKM"
                    : "Untuk bisnis serius"}
                </p>
                <div className="mt-5 mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
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
                  href={session ? `/onboarding` : `/signup`}
                  className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition ${
                    highlight
                      ? "bg-sky-500 text-white hover:bg-sky-600"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  {planKey === "free" ? "Mulai Gratis" : "Pilih Plan"}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          Semua plan termasuk dashboard, SLA tracking, dan support email.
        </p>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Pertanyaan Umum</h2>
          <p className="text-slate-600">Yang sering ditanya calon owner</p>
        </div>
        <div className="space-y-3">
          <Faq
            q="Apakah ada masa coba gratis?"
            a="Ya! Plan Gratis bisa dipakai selamanya tanpa batas waktu. Anda bisa upgrade ke Basic atau Pro kapan saja."
          />
          <Faq
            q="Bagaimana cara pembayaran?"
            a="Untuk MVP ini kami gunakan simulasi Stripe Checkout. Di versi produksi akan terintegrasi dengan payment gateway Indonesia seperti Midtrans atau Xendit."
          />
          <Faq
            q="Bisakah saya ganti plan nanti?"
            a="Tentu. Anda bisa upgrade atau downgrade kapan saja dari halaman pengaturan. Tidak ada komitmen tahunan."
          />
          <Faq
            q="Apakah data saya aman?"
            a="Sangat aman. Server berada di Indonesia, comply dengan UU PDP, dan kami menggunakan enkripsi end-to-end. Password di-hash dengan bcrypt, dan IP customer di-hash untuk privasi."
          />
          <Faq
            q="Berapa cabang yang bisa saya kelola?"
            a="Tergantung plan: 1 cabang untuk Gratis, 3 cabang untuk Basic, dan unlimited untuk Pro. Anda bisa tambah cabang kapan saja dari dashboard."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-10 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Siap Dengar Suara Pelanggan?</h2>
          <p className="text-slate-300 mb-6">
            Mulai gratis, tidak perlu kartu kredit. Setup dalam 5 menit.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-sky-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-sky-600"
          >
            Daftar Gratis <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-8">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>© 2026 SuaraBisnis. Made with ❤️ in Indonesia.</p>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-slate-900">Beranda</Link>
            <Link href="/signup" className="hover:text-slate-900">Daftar</Link>
            <Link href="/login" className="hover:text-slate-900">Masuk</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-slate-300 transition">
      <summary className="flex items-center gap-3 cursor-pointer list-none">
        <HelpCircle className="w-5 h-5 text-sky-600 shrink-0" />
        <span className="font-medium flex-1">{q}</span>
        <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
      </summary>
      <p className="mt-3 text-sm text-slate-600 pl-8">{a}</p>
    </details>
  );
}