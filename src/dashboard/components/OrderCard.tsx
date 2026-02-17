import { useNavigate } from "react-router-dom";
import { Clock, User, Package, ChevronRight, X, AlertTriangle, Printer, CreditCard, Smartphone, Banknote } from "lucide-react";
import { cn, formatPrice, timeAgo, formatPaymentMethod } from "@shared/lib/utils";
import { useUpdateOrderStatus, useCancelOrder } from "@shared/hooks/useOrders";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "@shared/types/orders";
import StatusBadge from "./StatusBadge";
import type { Order, OrderStatus } from "@shared/types/orders";
import { toast } from "sonner";
import { Badge } from "@shared/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@shared/components/ui/alert-dialog";
import PrintReceipt from "./PrintReceipt";

interface OrderCardProps {
  order: Order;
  isNew?: boolean;
  onAdvance?: (order: Order, nextStatus: OrderStatus) => void;
}

const PaymentIcon = ({ method }: { method: string }) => {
  switch (method) {
    case "mobile_money": return <Smartphone className="w-3.5 h-3.5" />;
    case "cash": return <Banknote className="w-3.5 h-3.5" />;
    case "card": return <CreditCard className="w-3.5 h-3.5" />;
    default: return <CreditCard className="w-3.5 h-3.5" />;
  }
};

export default function OrderCard({ order, isNew, onAdvance }: OrderCardProps) {
  const navigate = useNavigate();
  const updateStatus = useUpdateOrderStatus();
  const cancelOrder = useCancelOrder();

  const currentIdx = ORDER_STATUS_FLOW.indexOf(order.status);
  const nextStatus: OrderStatus | null =
    currentIdx >= 0 && currentIdx < ORDER_STATUS_FLOW.length - 1
      ? ORDER_STATUS_FLOW[currentIdx + 1]
      : null;

  // Check for urgency (orders older than 15 mins in 'new' or 'preparing')
  const isUrgent = 
    (order.status === 'new' || order.status === 'preparing') && 
    (Date.now() - new Date(order.created_at).getTime() > 15 * 60 * 1000);

  const handleAdvance = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!nextStatus) return;

    // If parent provides a callback, let it handle the logic (e.g. showing rider modal)
    if (onAdvance) {
      onAdvance(order, nextStatus);
      return;
    }

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

  const executeCancel = async () => {
    try {
      await cancelOrder.mutateAsync(order.id);
      toast.success("Order cancelled");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel order";
      toast.error(message);
    }
  };

  const canModify = order.status !== "arrived" && order.status !== "cancelled";

  return (
    <div
      onClick={() => navigate(`/orders/${order.order_number}`)}
      className={cn(
        "bg-card rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden",
        isNew && "border-secondary",
        isUrgent && "border-red-400 bg-red-50/30 dark:bg-red-900/10"
      )}
      draggable={canModify}
      data-order-id={order.id}
      data-order-status={order.status}
    >
      {isUrgent && (
        <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-bl-full md:w-3 md:h-3" title="Urgent: Over 15 mins" />
      )}
      
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <p className="font-bold">{order.order_number}</p>
          {isUrgent && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Overdue</Badge>}
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="w-3.5 h-3.5" />
          {order.customer_name}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Package className="w-3.5 h-3.5" />
          {order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} items • {formatPrice(order.total)}
        </div>
        <div className={cn("flex items-center gap-2 text-muted-foreground transition-colors", isUrgent && "text-red-600 font-medium")}>
          <Clock className="w-3.5 h-3.5" />
          {timeAgo(order.created_at)}
        </div>
      </div>
      
      {order.special_instructions && (
        <div className="mt-2 text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-2 py-1.5 rounded-md flex items-start gap-1.5 border border-yellow-100 dark:border-yellow-900/30">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="line-clamp-2">{order.special_instructions}</span>
        </div>
      )}

      <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5" title={formatPaymentMethod(order.payment_method)}>
          <PaymentIcon method={order.payment_method} />
          <span className="capitalize">{formatPaymentMethod(order.payment_method)}</span>
        </div>
        <span className="capitalize">{order.payment_status}</span>
      </div>

      {/* Quick actions */}
      {canModify && (
        <div className="mt-3 pt-2 border-t flex gap-2">
          {nextStatus && (
            <button
              onClick={handleAdvance}
              disabled={updateStatus.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 min-h-[44px] text-sm font-medium bg-secondary text-white rounded-lg hover:bg-secondary/90 active:scale-[0.98] disabled:opacity-50 transition-all whitespace-nowrap"
            >
              {updateStatus.isPending ? (
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <ChevronRight className="w-4 h-4" />
                  {nextStatus === 'out_for_delivery' ? 'Start Delivery' : ORDER_STATUS_LABELS[nextStatus]}
                </>
              )}
            </button>
          )}

          <PrintReceipt
            order={order}
            trigger={
              <button
                className="px-3 py-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg active:scale-[0.98] transition-all"
                title="Print Receipt"
              >
                <Printer className="w-4 h-4" />
              </button>
            }
          />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                disabled={cancelOrder.isPending}
                className="px-3 py-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 active:scale-[0.98] disabled:opacity-50 transition-all"
                title="Cancel Order"
              >
                {cancelOrder.isPending ? (
                  <span className="animate-spin w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to cancel order #{order.order_number}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Order</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={(e) => {
                    e.stopPropagation();
                    executeCancel();
                  }} 
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Yes, Cancel
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
