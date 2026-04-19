import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../cn";

const statusPillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
  {
    variants: {
      status: {
        open: "bg-[#ff2d2d]/10 text-[#ff2d2d]",
        triaged: "bg-[#ff7b1c]/10 text-[#ff7b1c]",
        dispatched: "bg-[#ffc93c]/10 text-[#ffc93c]",
        on_scene: "bg-[#3ddc84]/10 text-[#3ddc84]",
        resolved: "bg-[#888]/10 text-[#888]",
        cancelled: "bg-[#555]/10 text-[#555]",
      },
    },
    defaultVariants: {
      status: "open",
    },
  }
);

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  triaged: "Triaged",
  dispatched: "Dispatched",
  on_scene: "On Scene",
  resolved: "Resolved",
  cancelled: "Cancelled",
};

interface StatusPillProps extends VariantProps<typeof statusPillVariants> {
  className?: string;
}

export default function StatusPill({ status, className }: StatusPillProps) {
  return (
    <span className={cn(statusPillVariants({ status }), className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status ?? "open"]}
    </span>
  );
}
