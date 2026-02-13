import { useNavigate } from "react-router-dom";
import { Clock, User, Package, ChevronRight, X } from "lucide-react";
import { cn, formatPrice, timeAgo } from "@shared/lib/utils";
import { useUpdateOrderStatus, useCancelOrder } from "@shared/hooks/useOrders";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "@shared/types/orders";
import StatusBadge from "./StatusBadge";
import type { Order, OrderStatus } from "@shared/types/orders";
import { toast } from "sonner";

interface OrderCardProps {
  order: Order;
  isNew?: boolean;
}

export default function OrderCard({ order, isNew }: OrderCardProps) {
  const navigate = useNavigate();
  const updateStatus = useUpdateOrderStatus();
  const cancelOrder = useCancelOrder();

  const currentIdx = ORDER_STATUS_FLOW.indexOf(order.status);
  const nextStatus: OrderStatus | null =
    currentIdx >= 0 && currentIdx < ORDER_STATUS_FLOW.length - 1
      ? ORDER_STATUS_FLOW[currentIdx + 1]
      : null;

  const handleAdvance = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!nextStatus) return;
    try {
      await updateStatus.mutateAsync({
        orderId: order.id,
        status: nextStatus,
      });
      toast.success(`Order moved to ${ORDER_STATUS_LABELS[nextStatus]}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update order status";
      toast.error(message);
    }
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await cancelOrder.mutateAsync(order.id);
      toast.success("Order cancelled");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel order";
      toast.error(message);
    }
  };

  const canModify = order.status !== "delivered" && order.status !== "cancelled";

  return (
    <div
      onClick={() => navigate(`/orders/${order.order_number}`)}
      className={cn(
        "bg-card rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow",
        isNew && "new-order-pulse border-secondary"
      )}
      draggable={canModify}
      data-order-id={order.id}
      data-order-status={order.status}
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

      {/* Quick actions */}
      {canModify && (
        <div className="mt-3 pt-2 border-t flex gap-2">
          {nextStatus && (
            <button
              onClick={handleAdvance}
              disabled={updateStatus.isPending}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium bg-secondary text-white rounded-lg hover:bg-secondary/90 disabled:opacity-50 transition-colors"
            >
              {updateStatus.isPending ? (
                <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <ChevronRight className="w-3 h-3" />
                  {ORDER_STATUS_LABELS[nextStatus]}
                </>
              )}
            </button>
          )}
          <button
            onClick={handleCancel}
            disabled={cancelOrder.isPending}
            className="px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
            title="Cancel Order"
          >
            {cancelOrder.isPending ? (
              <span className="animate-spin w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full" />
            ) : (
              <X className="w-3 h-3" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
