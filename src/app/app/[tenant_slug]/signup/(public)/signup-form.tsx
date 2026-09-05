"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Store, AlertCircle, Loader2, ArrowLeft, MessageSquare } from "lucide-react";
import { tenantSignupAction } from "./actions";

type Props = {
  tenantSlug: string;
  tenantName: string;
  tenantLogo: string | null;
};

export default function TenantSignupForm({ tenantSlug, tenantName, tenantLogo }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await tenantSignupAction(tenantSlug, fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Tenant branding */}
        <div className="text-center mb-6">
          {tenantLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenantLogo}
              alt={tenantName}
              className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 border-2 border-white shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Store className="w-8 h-8 text-white" />
            </div>
          )}
          <h1 className="text-xl font-bold text-slate-900">{tenantName}</h1>
          <p className="text-slate-500 text-sm mt-0.5">Buat Akun Owner Baru</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-1">Daftar</h2>
            <p className="text-slate-600 text-sm">Buat akun owner untuk {tenantName}</p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1.5">Nama Anda</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Pak Budi"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="owner@bisnis.com"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">Kata Sandi</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1.5">Konfirmasi Kata Sandi</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Ulangi kata sandi"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Membuat akun...</> : "Daftar"}
            </button>
          </form>
        </div>

        {/* Helper links */}
        <div className="mt-6 space-y-2 text-center text-sm">
          <p className="text-slate-600">
            Sudah punya akun?{" "}
            <Link href={`/app/${tenantSlug}/login`} className="text-sky-600 hover:underline font-medium">
              Masuk
            </Link>
          </p>
          <p className="text-xs text-slate-500">
            <Link href={`/app/${tenantSlug}/pricing`} className="hover:text-slate-900 inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Lihat pricing dulu
            </Link>
          </p>
        </div>

        {/* SaaS branding */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
          <MessageSquare className="w-3 h-3" />
          <span>Ditenagai oleh SuaraBisnis</span>
        </div>
      </div>
    </div>
  );
}
