"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

export default function FilterBar({ branches, categories, currentStatus, currentBranch, currentCategory, currentQuery }: {
  branches: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  currentStatus?: string;
  currentBranch?: string;
  currentCategory?: string;
  currentQuery: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(currentQuery);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== currentQuery) {
        const params = new URLSearchParams(searchParams.toString());
        if (query) params.set("q", query); else params.delete("q");
        params.delete("page");
        router.push(`?${params.toString()}`);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, currentQuery, searchParams, router]);

  function setFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  function clearAll() {
    setQuery("");
    router.push("?");
  }

  const hasFilters = currentStatus || currentBranch || currentCategory || currentQuery;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("status", undefined)}
          className={`px-3 py-1.5 rounded-lg text-sm ${!currentStatus ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
        >
          Semua Status
        </button>
        <button
          onClick={() => setFilter("status", "open")}
          className={`px-3 py-1.5 rounded-lg text-sm ${currentStatus === "open" ? "bg-red-500 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
        >
          Belum
        </button>
        <button
          onClick={() => setFilter("status", "in_progress")}
          className={`px-3 py-1.5 rounded-lg text-sm ${currentStatus === "in_progress" ? "bg-amber-500 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
        >
          Proses
        </button>
        <button
          onClick={() => setFilter("status", "closed")}
          className={`px-3 py-1.5 rounded-lg text-sm ${currentStatus === "closed" ? "bg-green-500 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
        >
          Selesai
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari pesan atau nama customer..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:border-sky-500 outline-none text-sm"
          />
        </div>

        {/* Branch filter */}
        <select
          value={currentBranch || ""}
          onChange={(e) => setFilter("branch", e.target.value || undefined)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="">Semua Cabang</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        {/* Category filter */}
        <select
          value={currentCategory || ""}
          onChange={(e) => setFilter("category", e.target.value || undefined)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="">Semua Kategori</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {hasFilters && (
          <button
            onClick={clearAll}
            className="px-3 py-2 text-slate-600 hover:text-slate-900 text-sm flex items-center gap-1"
          >
            <X className="w-4 h-4" /> Reset
          </button>
        )}
      </div>
    </div>
  );
}
