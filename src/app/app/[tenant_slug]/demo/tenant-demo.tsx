"use client";

import Link from "next/link";
import { MessageSquare, Star, ArrowRight } from "lucide-react";

export default function TenantDemo({ tenantName, tenantSlug }: { tenantName: string; tenantSlug: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Tenant branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <span className="text-white font-bold text-2xl">{tenantName[0]}</span>
          </div>
          <h1 className="text-3xl font-bold mb-1">{tenantName}</h1>
          <p className="text-slate-600 text-sm">Pilih role untuk explore demo</p>
        </div>

        {/* Role cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <Link
            href={`/f/warung-demo`}
            className="bg-white p-8 rounded-xl border-2 border-slate-200 hover:border-sky-500 transition group"
          >
            <MessageSquare className="w-10 h-10 text-sky-500 mb-4" />
            <h2 className="font-bold text-lg mb-2">Sebagai Customer</h2>
            <p className="text-sm text-slate-600 mb-4">Kirim kritik & saran via form publik (mirip pengalaman scan QR di warung).</p>
            <span className="text-sky-600 text-sm font-medium group-hover:underline inline-flex items-center gap-1">
              Buka Form <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
          <Link
            href={`/app/${tenantSlug}/login`}
            className="bg-white p-8 rounded-xl border-2 border-slate-200 hover:border-sky-500 transition group"
          >
            <Star className="w-10 h-10 text-sky-500 mb-4" />
            <h2 className="font-bold text-lg mb-2">Sebagai Owner</h2>
            <p className="text-sm text-slate-600 mb-4">Lihat dashboard admin: tiket masuk, filter, balas, ubah status.</p>
            <span className="text-sky-600 text-sm font-medium group-hover:underline inline-flex items-center gap-1">
              Login Owner <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <Link href={`/app/${tenantSlug}/pricing`} className="text-sm text-slate-500 hover:text-slate-900">
            ← Lihat pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
