"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Star,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  BarChart3,
  ImageIcon,
  QrCode,
} from "lucide-react";
import { MODULES, canUseModule, type ModuleSlug } from "@/lib/modules";
import type { Plan } from "@/db/schema";
import { logoutAction } from "@/app/app/actions";
import { cn } from "@/lib/utils";

// Map icon name strings → lucide components
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  Star,
};

export default function DashboardSidebar({
  tenantSlug,
  tenantName,
  plan,
  userName,
  userEmail,
}: {
  tenantSlug: string;
  tenantName: string;
  plan: Plan;
  userName: string | null;
  userEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleLogout() {
    if (!confirm("Yakin ingin keluar?")) return;
    startTransition(async () => {
      await logoutAction();
    });
  }

  const enabledModules = MODULES.filter((m) => canUseModule(plan, m.slug));

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 bg-white border border-slate-200 rounded-lg p-2 shadow-sm"
        aria-label="Buka menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay (mobile) */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 z-50 md:z-auto h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <Link href={`/app/${tenantSlug}`} className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{tenantName}</p>
              <p className="text-xs text-slate-500 truncate">/{tenantSlug}</p>
            </div>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden p-1 text-slate-400 hover:text-slate-900"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <SidebarLink
            href={`/app/${tenantSlug}`}
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="Dashboard"
            onClick={() => setOpen(false)}
          />
          <SidebarLink
            href={`/app/${tenantSlug}/analytics`}
            icon={<BarChart3 className="w-4 h-4" />}
            label="Analitik"
            onClick={() => setOpen(false)}
          />
          <SidebarLink
            href={`/app/${tenantSlug}/review-qr`}
            icon={<QrCode className="w-4 h-4" />}
            label="QR Review"
            onClick={() => setOpen(false)}
          />
          <SidebarLink
            href={`/app/${tenantSlug}/social-proof`}
            icon={<ImageIcon className="w-4 h-4" />}
            label="Social Proof"
            onClick={() => setOpen(false)}
          />
          <p className="px-2 pt-3 pb-1 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Modul
          </p>
          {enabledModules.length === 0 ? (
            <p className="px-2 text-xs text-slate-400 italic">Tidak ada modul aktif</p>
          ) : (
            enabledModules.map((m) => {
              const Icon = ICONS[m.icon] ?? MessageSquare;
              return (
                <SidebarLink
                  key={m.slug}
                  href={`/app/${tenantSlug}/feedback`}
                  icon={<Icon className="w-4 h-4" />}
                  label={m.name}
                  onClick={() => setOpen(false)}
                />
              );
            })
          )}
          <p className="px-2 pt-3 pb-1 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Lainnya
          </p>
          <SidebarLink
            href={`/app/${tenantSlug}/settings/general`}
            icon={<Settings className="w-4 h-4" />}
            label="Pengaturan"
            onClick={() => setOpen(false)}
          />
          <SidebarLink
            href={`/app/${tenantSlug}/settings/notifications`}
            icon={<Bell className="w-4 h-4" />}
            label="Notifikasi"
            onClick={() => setOpen(false)}
          />
        </nav>

        {/* User + logout */}
        <div className="border-t border-slate-200 px-3 py-3">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
              {(userName ?? userEmail)[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName ?? "Anda"}</p>
              <p className="text-xs text-slate-500 truncate">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={pending}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {pending ? "Keluar..." : "Keluar"}
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}