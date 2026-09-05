import bcrypt from "bcryptjs";
import type { Plan } from "@/db/schema";

export type ModuleSlug = "feedback" | "review-qr";

export type ModuleDef = {
  slug: ModuleSlug;
  name: string;
  description: string;
  icon: string; // lucide icon name
  requiredPlan: Plan;
  publicPath?: string;
};

export const MODULES: ModuleDef[] = [
  {
    slug: "feedback",
    name: "Kritik & Saran",
    description: "Form publik untuk kumpulkan feedback customer",
    icon: "MessageSquare",
    requiredPlan: "free",
    publicPath: "/f/",
  },
  {
    slug: "review-qr",
    name: "Google Review QR",
    description: "Generate QR untuk boost review Google per cabang",
    icon: "Star",
    requiredPlan: "basic",
    publicPath: "/r/",
  },
];

export const PLANS: Record<Plan, { name: string; price: string; features: string[]; modules: ModuleSlug[]; maxBranches: number }> = {
  free: {
    name: "Gratis",
    price: "Rp 0",
    features: ["1 cabang", "Modul Kritik & Saran", "Dashboard admin", "100 feedback/bulan"],
    modules: ["feedback"],
    maxBranches: 1,
  },
  basic: {
    name: "Basic",
    price: "Rp 99rb/bulan",
    features: ["3 cabang", "Semua modul Basic", "Email notifikasi", "1.000 feedback/bulan"],
    modules: ["feedback", "review-qr"],
    maxBranches: 3,
  },
  pro: {
    name: "Pro",
    price: "Rp 299rb/bulan",
    features: ["Cabang unlimited", "Semua modul", "Custom branding", "Priority support", "Feedback unlimited"],
    modules: ["feedback", "review-qr"],
    maxBranches: 999,
  },
};

export function canUseModule(plan: Plan, moduleSlug: ModuleSlug): boolean {
  return PLANS[plan].modules.includes(moduleSlug);
}

export function canAddBranch(plan: Plan, currentBranches: number): boolean {
  return currentBranches < PLANS[plan].maxBranches;
}

export function isUpgradeNeeded(currentPlan: Plan, requiredPlan: Plan): boolean {
  const order: Plan[] = ["free", "basic", "pro"];
  return order.indexOf(currentPlan) < order.indexOf(requiredPlan);
}
