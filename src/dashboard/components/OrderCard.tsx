import { useNavigate } from "react-router-dom";
import { Clock, User, Package } from "lucide-react";
import { cn, formatPrice, timeAgo } from "@shared/lib/utils";
import StatusBadge from "./StatusBadge";
import type { Order } from "@shared/types/orders";

interface OrderCardProps {
  order: Order;
  isNew?: boolean;
}

export default function OrderCard({ order, isNew }: OrderCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/orders/${order.order_number}`)}
      className={cn(
        "bg-card rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow",
        isNew && "new-order-pulse border-secondary"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="font-bold">{order.order_number}</p>
        <StatusBadge status={order.status} />
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="w-3.5 h-3.5" />
          {order.customer_name}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Package className="w-3.5 h-3.5" />
          {order.items?.length || 0} items • {formatPrice(order.total)}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          {timeAgo(order.created_at)}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
        <span className="capitalize">{order.payment_method.replace("_", " ")}</span>
        <span className="capitalize">{order.payment_status}</span>
      </div>
    </div>
  );
}
