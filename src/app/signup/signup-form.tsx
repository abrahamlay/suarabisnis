"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MessageSquare, AlertCircle, Loader2 } from "lucide-react";
import { signupAction } from "./actions";
import { slugify } from "@/lib/helpers";

export default function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [businessName, setBusinessName] = useState("");
  const autoSlug = slugify(businessName);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await signupAction(fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl">SuaraBisnis</span>
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1">Mulai Bisnis Anda</h1>
            <p className="text-slate-600 text-sm">Gratis, tanpa kartu kredit</p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium mb-1.5">Nama Bisnis</label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Warung Pak Tio"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition"
              />
              {autoSlug && (
                <p className="mt-1.5 text-xs text-slate-500">
                  URL bisnis Anda: <span className="font-mono text-sky-600">suarabisnis.id/app/{autoSlug}</span>
                </p>
              )}
            </div>
            <div>
              <label htmlFor="ownerName" className="block text-sm font-medium mb-1.5">Nama Anda</label>
              <input
                id="ownerName"
                name="ownerName"
                type="text"
                required
                placeholder="Pak Tio"
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
              {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Membuat akun...</> : "Daftar & Mulai Gratis"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-sky-600 hover:underline font-medium">
              Masuk
            </Link>
          </p>
          <p className="mt-3 text-center text-xs text-slate-500">
            Dengan mendaftar, Anda menyetujui Syarat & Ketentuan kami.
          </p>
        </div>
      </div>
    </div>
  );
}