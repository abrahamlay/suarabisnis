import { cn } from "@/lib/utils";

const styles = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-amber-100 text-amber-700",
  closed: "bg-green-100 text-green-700",
};

const labels = {
  open: "Belum",
  in_progress: "Proses",
  closed: "Selesai",
};

export default function StatusBadge({ status }: { status: "open" | "in_progress" | "closed" }) {
  return (
    <span className={cn("text-xs px-2 py-0.5 rounded font-medium", styles[status])}>
      {labels[status]}
    </span>
  );
}
