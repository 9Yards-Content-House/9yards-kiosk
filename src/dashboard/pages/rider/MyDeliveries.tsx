import { useQuery } from "@tanstack/react-query";
import { Package, MapPin, CheckCircle2 } from "lucide-react";
import { supabase } from "@shared/lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useUpdateOrderStatus } from "@shared/hooks/useOrders";
import { formatPrice, timeAgo } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import StatusBadge from "../../components/StatusBadge";
import { toast } from "sonner";
import type { Order } from "@shared/types/orders";

export default function MyDeliveries() {
  const { user } = useAuth();
  const updateStatus = useUpdateOrderStatus();

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["deliveries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, items:order_items(*)")
        .in("status", ["ready", "delivered"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: 15_000,
  });

  const readyOrders = orders?.filter((o) => o.status === "ready") || [];
  const deliveredOrders = orders?.filter((o) => o.status === "delivered") || [];

  const handleDeliver = async (order: Order) => {
    try {
      await updateStatus.mutateAsync({
        orderId: order.id,
        status: "delivered",
      });
      toast.success(`${order.order_number} marked as delivered`);
    } catch {
      toast.error("Failed to update");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-yards-orange border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-2">My Deliveries</h1>
      <p className="text-muted-foreground mb-6">
        {readyOrders.length} ready for delivery | {deliveredOrders.length} delivered today
      </p>

      {/* Ready */}
      {readyOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold text-lg mb-3">Ready for Delivery</h2>
          <div className="space-y-3">
            {readyOrders.map((order) => (
              <div
                key={order.id}
                className="bg-card rounded-xl border p-4 new-order-pulse"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-lg">{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.customer_name} • {timeAgo(order.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                {order.customer_location && (
                  <div className="flex items-center gap-2 text-sm mb-3">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {order.customer_location}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Package className="w-4 h-4" />
                  {order.items?.length || 0} items • {formatPrice(order.total)}
                </div>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => handleDeliver(order)}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Delivered
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivered */}
      {deliveredOrders.length > 0 && (
        <div>
          <h2 className="font-semibold text-lg mb-3">Delivered Today</h2>
          <div className="space-y-2">
            {deliveredOrders.map((order) => (
              <div key={order.id} className="bg-card rounded-xl border p-3 opacity-60">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{order.order_number}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {order.customer_name}
                    </span>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {readyOrders.length === 0 && deliveredOrders.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No deliveries yet today
        </div>
      )}
    </div>
  );
}
