import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// SLA logic: hours to deadline by priority
export const SLA_HOURS = { high: 4, medium: 24, low: 72 } as const;

export function slaDeadline(createdAt: Date, priority: "low" | "medium" | "high"): Date {
  const ms = SLA_HOURS[priority] * 60 * 60 * 1000;
  return new Date(createdAt.getTime() + ms);
}

export function slaStatus(createdAt: Date, priority: "low" | "medium" | "high", status: string): {
  breached: boolean;
  remainingHours: number;
} {
  if (status === "closed") return { breached: false, remainingHours: 0 };
  const deadline = slaDeadline(createdAt, priority);
  const now = Date.now();
  const remainingMs = deadline.getTime() - now;
  return {
    breached: remainingMs < 0,
    remainingHours: Math.max(0, Math.round(remainingMs / (60 * 60 * 1000))),
  };
}
