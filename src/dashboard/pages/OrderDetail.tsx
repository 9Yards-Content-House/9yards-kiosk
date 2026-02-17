import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, MapPin, CreditCard, Phone, FileEdit } from "lucide-react";
import { useOrderByNumber } from "@shared/hooks/useOrders";
import { useUpdateOrderStatus, useCancelOrder } from "@shared/hooks/useOrders";
import { formatPrice, timeAgo } from "@shared/lib/utils";
import {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
} from "@shared/types/orders";
import type { OrderStatus } from "@shared/types/orders";
import { Button } from "@shared/components/ui/button";
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
import StatusBadge from "../components/StatusBadge";
import OrderTimeline from "../components/OrderTimeline";
import PrintReceipt from "../components/PrintReceipt";
import EditOrderModal from "../components/EditOrderModal";
import { AssignRiderModal } from "../components/AssignRiderModal";
import { toast } from "sonner";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useOrderByNumber(id || null);
  const updateStatus = useUpdateOrderStatus();
  const cancelOrder = useCancelOrder();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

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

    if (nextStatus === "out_for_delivery") {
      setAssignModalOpen(true);
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

  const handleAssignRider = async (orderId: string, riderId: string) => {
    setIsAssigning(true);
    try {
      await updateStatus.mutateAsync({
        orderId: order.id,
        status: "out_for_delivery",
        riderId,
      });
      toast.success("Rider assigned! Order is out for delivery.");
      setAssignModalOpen(false);
    } catch (err) {
      toast.error("Failed to assign rider");
    } finally {
      setIsAssigning(false);
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

  return (
    <div className="p-4 md:p-6 max-w-3xl pb-24 md:pb-6 relative min-h-screen md:min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4 mb-6 flex-wrap">
        <button
          onClick={() => navigate("/orders")}
          className="w-11 h-11 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold truncate">{order.order_number}</h1>
          <p className="text-muted-foreground text-sm">{timeAgo(order.created_at)}</p>
        </div>
        {/* Edit button - only show for non-completed orders */}
        {order.status !== "arrived" && order.status !== "cancelled" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditModalOpen(true)}
            className="min-h-[44px] px-4"
          >
            <FileEdit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}
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
            {order.payment_method.replace(/_/g, " ")}
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

      {/* Actions - Sticky on mobile */}
      {order.status !== "arrived" && order.status !== "cancelled" && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t shadow-lg z-20 md:static md:p-0 md:bg-transparent md:border-t-0 md:shadow-none md:z-auto">
          <div className="flex gap-3 max-w-3xl mx-auto">
            {nextStatus && (
              <Button
                className="flex-1 bg-secondary hover:bg-secondary/90 min-h-[48px] text-base"
                onClick={handleAdvance}
                disabled={updateStatus.isPending}
              >
                Move to {ORDER_STATUS_LABELS[nextStatus]}
              </Button>
            )}
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={cancelOrder.isPending}
                  className="min-h-[48px]"
                >
                  Cancel Order
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel order #{order.order_number}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Order</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={executeCancel}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Yes, Cancel
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      <EditOrderModal
        order={order}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />

      {/* Rider Assignment Modal */}
      <AssignRiderModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        order={order}
        onAssign={handleAssignRider}
        isAssigning={isAssigning}
      />
    </div>
  );
}
