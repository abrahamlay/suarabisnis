import { slaStatus } from "@/lib/utils";

export default function SLABadge({ createdAt, priority, status }: { createdAt: Date; priority: "low" | "medium" | "high"; status: string }) {
  if (status === "closed") return null;
  const { breached, remainingHours } = slaStatus(createdAt, priority, status);
  if (breached) {
    return <span className="text-xs px-2 py-0.5 rounded font-medium bg-red-600 text-white">⚠️ Lewat Deadline</span>;
  }
  if (remainingHours <= 4) {
    return <span className="text-xs px-2 py-0.5 rounded font-medium bg-amber-100 text-amber-700">⏰ {remainingHours} jam lagi</span>;
  }
  return null;
}
