import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, User, MapPin, CreditCard, Phone } from "lucide-react";
import { useOrderByNumber } from "@shared/hooks/useOrders";
import { useUpdateOrderStatus, useCancelOrder } from "@shared/hooks/useOrders";
import { formatPrice, timeAgo } from "@shared/lib/utils";
import {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "@shared/types/orders";
import type { OrderStatus } from "@shared/types/orders";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import StatusBadge from "../components/StatusBadge";
import OrderTimeline from "../components/OrderTimeline";
import PrintReceipt from "../components/PrintReceipt";
import { toast } from "sonner";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useOrderByNumber(id || null);
  const updateStatus = useUpdateOrderStatus();
  const cancelOrder = useCancelOrder();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-secondary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground mb-4">Order not found</p>
        <Button onClick={() => navigate("/orders")}>Back to Orders</Button>
      </div>
    );
  }

  const currentIdx = ORDER_STATUS_FLOW.indexOf(order.status);
  const nextStatus: OrderStatus | null =
    currentIdx >= 0 && currentIdx < ORDER_STATUS_FLOW.length - 1
      ? ORDER_STATUS_FLOW[currentIdx + 1]
      : null;

  const handleAdvance = async () => {
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

  const handleCancel = async () => {
    try {
      await cancelOrder.mutateAsync(order.id);
      toast.success("Order cancelled");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel order";
      toast.error(message);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/orders")}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{order.order_number}</h1>
          <p className="text-muted-foreground">{timeAgo(order.created_at)}</p>
        </div>
        <PrintReceipt order={order} />
        <StatusBadge status={order.status} />
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-card rounded-xl border p-4 space-y-3">
          <h3 className="font-semibold text-lg">Customer</h3>
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            {order.customer_name}
          </div>
          {order.customer_phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              {order.customer_phone}
            </div>
          )}
          {order.customer_location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              {order.customer_location}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            {order.payment_method.replace("_", " ")}
            <Badge variant={order.payment_status === "paid" ? "default" : "secondary"}>
              {order.payment_status}
            </Badge>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-4">
          <h3 className="font-semibold text-lg mb-3">Timeline</h3>
          <OrderTimeline order={order} />
        </div>
      </div>

      {/* Items */}
      <div className="bg-card rounded-xl border p-4 mb-6">
        <h3 className="font-semibold text-lg mb-3">Items</h3>
        {order.items?.map((item) => {
          // Build a descriptive name for the item
          const itemName = item.type === "combo" 
            ? (item.sauce_name ? `${item.sauce_name} Lusaniya` : "Combo Meal")
            : (item.sauce_name || "Item");
          
          return (
            <div key={item.id} className="flex justify-between py-2 border-b last:border-b-0">
              <div>
                <p className="font-medium">
                  {itemName} x{item.quantity}
                </p>
                {item.main_dishes && item.main_dishes.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {item.main_dishes.join(", ")}
                  </p>
                )}
                {item.sauce_preparation && (
                  <p className="text-sm text-muted-foreground">
                    {item.sauce_preparation}
                    {item.sauce_size && ` — ${item.sauce_size}`}
                  </p>
                )}
                {item.side_dish && (
                  <p className="text-sm text-muted-foreground">Side: {item.side_dish}</p>
                )}
              </div>
              <span className="font-semibold">{formatPrice(item.total_price)}</span>
            </div>
          );
        })}
        {order.special_instructions && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm font-medium">Special Instructions:</p>
            <p className="text-sm text-muted-foreground">{order.special_instructions}</p>
          </div>
        )}
        <div className="flex justify-between py-3 mt-2 font-bold text-lg border-t">
          <span>Total</span>
          <span className="text-secondary">{formatPrice(order.total)}</span>
        </div>
      </div>

      {/* Actions */}
      {order.status !== "delivered" && order.status !== "cancelled" && (
        <div className="flex gap-3">
          {nextStatus && (
            <Button
              className="flex-1 bg-secondary hover:bg-secondary/90"
              onClick={handleAdvance}
              disabled={updateStatus.isPending}
            >
              Move to {ORDER_STATUS_LABELS[nextStatus]}
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelOrder.isPending}
          >
            Cancel Order
          </Button>
        </div>
      )}
    </div>
  );
}
