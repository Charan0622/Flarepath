import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../cn";

const severityBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      severity: {
        critical: "bg-[#ff2d2d]/20 text-[#ff2d2d]",
        high: "bg-[#ff7b1c]/20 text-[#ff7b1c]",
        medium: "bg-[#ffc93c]/20 text-[#ffc93c]",
        low: "bg-[#3ddc84]/20 text-[#3ddc84]",
      },
    },
    defaultVariants: {
      severity: "medium",
    },
  }
);

interface SeverityBadgeProps extends VariantProps<typeof severityBadgeVariants> {
  className?: string;
}

export default function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span className={cn(severityBadgeVariants({ severity }), className)}>
      {severity}
    </span>
  );
}
