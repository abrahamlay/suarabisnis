import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-slate-300 mb-2">404</h1>
        <p className="text-slate-600 mb-6">Halaman tidak ditemukan</p>
        <Link href="/" className="text-sky-600 hover:underline">← Kembali ke beranda</Link>
      </div>
    </div>
  );
}
