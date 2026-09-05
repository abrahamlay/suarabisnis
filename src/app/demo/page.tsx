import Link from "next/link";
import { MessageSquare, Star } from "lucide-react";

export default function DemoIndex() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Demo SuaraBisnis</h1>
          <p className="text-slate-600">Pilih role untuk explore</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/f/warung-demo" className="bg-white p-8 rounded-xl border-2 border-slate-200 hover:border-sky-500 transition group">
            <MessageSquare className="w-10 h-10 text-sky-500 mb-4" />
            <h2 className="font-bold text-lg mb-2">Sebagai Customer</h2>
            <p className="text-sm text-slate-600 mb-4">Kirim kritik & saran via form publik (mirip pengalaman scan QR di warung).</p>
            <span className="text-sky-600 text-sm font-medium group-hover:underline">Buka Form →</span>
          </Link>
          <Link href="/admin/warung-demo" className="bg-white p-8 rounded-xl border-2 border-slate-200 hover:border-sky-500 transition group">
            <Star className="w-10 h-10 text-sky-500 mb-4" />
            <h2 className="font-bold text-lg mb-2">Sebagai Owner</h2>
            <p className="text-sm text-slate-600 mb-4">Lihat dashboard admin: tiket masuk, filter, balas, ubah status.</p>
            <span className="text-sky-600 text-sm font-medium group-hover:underline">Buka Dashboard →</span>
          </Link>
        </div>
        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">← Kembali ke landing page</Link>
        </div>
      </div>
    </div>
  );
}
