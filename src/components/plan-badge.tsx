import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { PLANS } from "@/lib/modules";
import type { Plan } from "@/db/schema";
import { cn } from "@/lib/utils";

const BADGE_STYLES: Record<Plan, string> = {
  free: "bg-slate-100 text-slate-700",
  basic: "bg-sky-100 text-sky-700",
  pro: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
};

export default function PlanBadge({
  plan,
  showUpgrade = true,
  className,
}: {
  plan: Plan;
  showUpgrade?: boolean;
  className?: string;
}) {
  const info = PLANS[plan as keyof typeof PLANS];
  const isFree = plan === "free";

  return (
    <div className={cn("flex items-center gap-3 flex-wrap", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full",
          BADGE_STYLES[plan]
        )}
      >
        {isFree ? null : <Sparkles className="w-3 h-3" />}
        Plan {info.name}
      </span>
      {showUpgrade && (
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 hover:underline font-medium"
        >
          {isFree ? "Upgrade sekarang" : "Kelola plan"}
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}