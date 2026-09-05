"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  MapPin,
  CreditCard,
  Check,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Star,
  AlertCircle,
} from "lucide-react";
import {
  updateTenantProfile,
  addBranch,
  choosePlan,
} from "./actions";
import { PLANS } from "@/lib/modules";
import { slugify } from "@/lib/helpers";
import type { Plan } from "@/db/schema";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
};

export default function OnboardingWizard({
  tenant,
  hasBranches,
}: {
  tenant: Tenant;
  hasBranches: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pending, startTransition] = useTransition();

  // Step 1 state
  const [name, setName] = useState(tenant.name);
  const [slug, setSlug] = useState(tenant.slug);
  const [logoUrl, setLogoUrl] = useState(tenant.logoUrl ?? "");
  const [step1Err, setStep1Err] = useState<string | null>(null);

  // Step 2 state
  const [branchName, setBranchName] = useState("");
  const [branchSlug, setBranchSlug] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [step2Err, setStep2Err] = useState<string | null>(null);
  const [branchAdded, setBranchAdded] = useState(hasBranches);

  // Step 3 state
  const [step3Err, setStep3Err] = useState<string | null>(null);

  const slugPreview = slugify(name || "bisnis-anda");

  function handleStep1Submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStep1Err(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateTenantProfile(
        tenant.id,
        String(fd.get("name") ?? ""),
        String(fd.get("slug") ?? "")
      );
      if (result?.error) {
        setStep1Err(result.error);
        return;
      }
      setStep(2);
    });
  }

  function handleStep2Submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStep2Err(null);
    startTransition(async () => {
      const result = await addBranch(
        tenant.id,
        branchName,
        branchSlug,
        branchAddress
      );
      if (result?.error) {
        setStep2Err(result.error);
        return;
      }
      setBranchAdded(true);
      setStep(3);
    });
  }

  function handleChoosePlan(plan: Plan) {
    setStep3Err(null);
    startTransition(async () => {
      if (plan === "free") {
        // Skip directly to dashboard
        router.push(`/app/${tenant.slug}`);
        return;
      }
      const result = await choosePlan(tenant.id, plan);
      if ("error" in result && result.error) {
        setStep3Err(result.error);
        return;
      }
      if ("url" in result) {
        router.push(result.url);
      }
    });
  }

  const stepNames = ["Profil Bisnis", "Cabang Pertama", "Pilih Plan"];
  const stepIcons = [Building2, MapPin, CreditCard];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <div className="max-w-3xl mx-auto p-6 pt-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Selamat Datang! 🎉</h1>
          <p className="text-slate-600">Mari setup bisnis Anda dalam 3 langkah mudah</p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            {stepNames.map((label, idx) => {
              const stepNum = idx + 1;
              const Icon = stepIcons[idx];
              const isActive = step === stepNum;
              const isComplete = step > stepNum;
              return (
                <div key={label} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition ${
                        isActive
                          ? "bg-sky-500 border-sky-500 text-white"
                          : isComplete
                          ? "bg-green-500 border-green-500 text-white"
                          : "bg-white border-slate-300 text-slate-400"
                      }`}
                    >
                      {isComplete ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <p
                      className={`mt-2 text-xs font-medium ${
                        isActive || isComplete ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {label}
                    </p>
                  </div>
                  {idx < stepNames.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 mb-6 transition ${
                        step > stepNum ? "bg-green-500" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
          {step === 1 && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">Profil Bisnis</h2>
                <p className="text-slate-600 text-sm">Beri tahu kami tentang bisnis Anda</p>
              </div>
              {step1Err && (
                <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{step1Err}</p>
                </div>
              )}
              <form onSubmit={handleStep1Submit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Nama Bisnis</label>
                  <input
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Warung Pak Tio"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">URL Bisnis</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 whitespace-nowrap">suarabisnis.id/app/</span>
                    <input
                      name="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      required
                      placeholder={slugPreview}
                      className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none font-mono text-sm"
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Slug ini akan jadi URL dashboard Anda
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Logo URL <span className="text-slate-400">(opsional)</span>
                  </label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-60"
                  >
                    {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : <>Lanjut <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">Cabang Pertama</h2>
                <p className="text-slate-600 text-sm">Tambahkan minimal 1 cabang untuk mulai terima feedback</p>
              </div>
              {step2Err && (
                <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{step2Err}</p>
                </div>
              )}
              {branchAdded ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="font-medium mb-1">Cabang sudah ditambahkan</p>
                  <p className="text-sm text-slate-500 mb-6">Anda bisa tambah cabang lagi nanti dari dashboard</p>
                  <button
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-slate-800"
                  >
                    Lanjut Pilih Plan <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleStep2Submit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Nama Cabang</label>
                    <input
                      value={branchName}
                      onChange={(e) => {
                        setBranchName(e.target.value);
                        if (!branchSlug) setBranchSlug(slugify(e.target.value));
                      }}
                      required
                      placeholder="Cabang Pusat"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">URL Cabang</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 whitespace-nowrap">suarabisnis.id/f/</span>
                      <input
                        value={branchSlug}
                        onChange={(e) => setBranchSlug(e.target.value)}
                        required
                        placeholder="cabang-pusat"
                        className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none font-mono text-sm"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Customer akan akses form via URL ini</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Alamat <span className="text-slate-400">(opsional)</span></label>
                    <textarea
                      value={branchAddress}
                      onChange={(e) => setBranchAddress(e.target.value)}
                      rows={2}
                      placeholder="Jl. Sudirman No. 1, Jakarta"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none resize-none"
                    />
                  </div>
                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      disabled={pending}
                      className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-5 py-2.5 rounded-lg font-medium hover:bg-slate-50"
                    >
                      <ArrowLeft className="w-4 h-4" /> Kembali
                    </button>
                    <button
                      type="submit"
                      disabled={pending}
                      className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-60"
                    >
                      {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : <>Simpan & Lanjut <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">Pilih Plan Anda</h2>
                <p className="text-slate-600 text-sm">Mulai gratis, upgrade kapan saja</p>
              </div>
              {step3Err && (
                <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{step3Err}</p>
                </div>
              )}
              <div className="grid md:grid-cols-3 gap-3">
                {(["free", "basic", "pro"] as Plan[]).map((p) => {
                  const info = PLANS[p];
                  const isHighlight = p === "basic";
                  return (
                    <button
                      key={p}
                      onClick={() => handleChoosePlan(p)}
                      disabled={pending}
                      className={`text-left p-5 rounded-xl border-2 transition relative ${
                        isHighlight
                          ? "border-sky-500 bg-sky-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {isHighlight && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                          Populer
                        </div>
                      )}
                      <p className="font-semibold">{info.name}</p>
                      <p className="text-lg font-bold mt-1">{info.price}</p>
                      <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                        {info.features.map((f) => (
                          <li key={f} className="flex items-start gap-1.5">
                            <Check className="w-3 h-3 text-sky-600 mt-0.5 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 text-xs font-medium text-sky-600 flex items-center gap-1">
                        {p === "free" ? "Pilih Gratis →" : "Pilih Plan →"}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 text-center">
                <button
                  onClick={() => setStep(2)}
                  disabled={pending}
                  className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Kembali
                </button>
              </div>
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Star className="w-3 h-3" />
                <span>Tidak perlu kartu kredit untuk plan gratis</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}