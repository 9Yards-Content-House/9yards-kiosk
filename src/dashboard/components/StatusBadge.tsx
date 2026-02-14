import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@shared/types/orders";
import type { OrderStatus } from "@shared/types/orders";
import { cn } from "@shared/lib/utils";

interface StatusBadgeProps {
  status: OrderStatus;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}

export default function StatusBadge({ status, size = "md", pulse }: StatusBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-0.5 text-xs",
    lg: "px-3 py-1 text-sm",
  };

  // Auto-pulse for "out_for_delivery" status to draw attention
  const shouldPulse = pulse ?? status === "out_for_delivery";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        ORDER_STATUS_COLORS[status],
        sizeClasses[size],
        shouldPulse && "animate-pulse"
      )}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
