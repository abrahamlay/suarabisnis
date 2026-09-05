import Link from "next/link";
import { MessageSquare, Star, Shield, BarChart3, Check, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      {/* Nav */}
      <nav className="border-b border-slate-200/60 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">SuaraBisnis</span>
          </div>
          <div className="hidden md:flex gap-8 text-sm text-slate-600">
            <a href="#fitur" className="hover:text-slate-900">Fitur</a>
            <a href="#harga" className="hover:text-slate-900">Harga</a>
            <a href="#demo" className="hover:text-slate-900">Demo</a>
          </div>
          <Link href="/demo" className="text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800">
            Coba Demo
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block mb-4 px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-medium">
          🇮🇩 Dibuat untuk UMKM Indonesia
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6">
          Dengar Suara Pelanggan,<br />
          <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
            Tingkatkan Bisnis Anda
          </span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-8">
          Platform kritik & saran modern dengan QR code. Pelanggan tinggal scan, kirim feedback, dan Anda langsung bisa tindak lanjuti dari dashboard.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/demo" className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800">
            Lihat Demo Langsung <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/f/warung-demo" className="inline-flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-medium hover:border-slate-400">
            Coba Form Customer
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-500">Gratis untuk dicoba • Tanpa daftar • Data demo</p>
      </section>

      {/* Fitur */}
      <section id="fitur" className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<MessageSquare className="w-6 h-6" />}
            title="Form Kritik & Saran"
            description="Customer tinggal scan QR, pilih kategori, tulis pesan. Otomatis masuk ke dashboard Anda."
          />
          <FeatureCard
            icon={<Star className="w-6 h-6" />}
            title="Google Review QR"
            description="Generate QR code unik per cabang untuk boost review Google bisnis Anda."
          />
          <FeatureCard
            icon={<BarChart3 className="w-6 h-6" />}
            title="Dashboard Analitik"
            description="Lihat semua feedback dalam satu tempat. Filter per cabang, kategori, dan status."
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Data di Indonesia"
            description="Server di Indonesia, comply dengan UU PDP. Data bisnis Anda tetap aman."
          />
          <FeatureCard
            icon={<Check className="w-6 h-6" />}
            title="SLA Tracking"
            description="Auto-track deadline respons per prioritas. Jangan sampai feedback terlewat."
          />
          <FeatureCard
            icon={<MessageSquare className="w-6 h-6" />}
            title="Multi-Cabang"
            description="Punya banyak cabang? Semua feedback masuk terorganisir per lokasi."
          />
        </div>
      </section>

      {/* Harga */}
      <section id="harga" className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Harga Sederhana, Tanpa Biaya Tersembunyi</h2>
          <p className="text-slate-600">Mulai gratis, upgrade kapan saja</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <PriceCard
            tier="Basic"
            price="Rp 99rb"
            period="/bulan"
            features={["1 cabang", "Modul Kritik & Saran", "Dashboard admin", "Email notifikasi"]}
            cta="Mulai Gratis 14 Hari"
          />
          <PriceCard
            tier="Pro"
            price="Rp 299rb"
            period="/bulan"
            features={["Unlimited cabang", "Semua modul", "Google Review QR", "Priority support", "Custom branding"]}
            cta="Mulai Gratis 14 Hari"
            highlight
          />
        </div>
      </section>

      {/* Demo CTA */}
      <section id="demo" className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Lihat Demo Sekarang</h2>
          <p className="text-slate-300 mb-8 max-w-xl mx-auto">
            Coba langsung sebagai customer (kirim kritik & saran) atau sebagai owner (lihat dashboard admin).
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/f/warung-demo" className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-lg font-medium hover:bg-slate-100">
              📱 Coba sebagai Customer
            </Link>
            <Link href="/admin/warung-demo" className="inline-flex items-center justify-center gap-2 bg-sky-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-sky-600">
              � Coba sebagai Owner
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-sm text-slate-500">
          © 2026 SuaraBisnis. Made with ❤️ in Indonesia.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-sky-300 transition">
      <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
  );
}

function PriceCard({ tier, price, period, features, cta, highlight = false }: { tier: string; price: string; period: string; features: string[]; cta: string; highlight?: boolean }) {
  return (
    <div className={`p-8 rounded-2xl border-2 ${highlight ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white"} relative`}>
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-xs px-3 py-1 rounded-full">
          Paling Populer
        </div>
      )}
      <h3 className="font-semibold text-lg mb-1">{tier}</h3>
      <div className="mb-6">
        <span className="text-4xl font-bold">{price}</span>
        <span className="text-slate-500 text-sm">{period}</span>
      </div>
      <ul className="space-y-3 mb-6">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button className={`w-full py-3 rounded-lg font-medium ${highlight ? "bg-sky-500 text-white hover:bg-sky-600" : "bg-slate-900 text-white hover:bg-slate-800"}`}>
        {cta}
      </button>
    </div>
  );
}
