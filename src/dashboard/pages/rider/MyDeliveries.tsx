import { useQuery } from "@tanstack/react-query";
import { Package, MapPin, CheckCircle2 } from "lucide-react";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useUpdateOrderStatus } from "@shared/hooks/useOrders";
import { formatPrice, timeAgo } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import StatusBadge from "../../components/StatusBadge";
import { toast } from "sonner";
import type { Order } from "@shared/types/orders";

// Mock delivery orders for development
const MOCK_DELIVERIES: Order[] = [
  {
    id: "delivery-1",
    order_number: "9Y-010",
    status: "ready",
    customer_name: "Grace Auma",
    customer_phone: "+256700123456",
    customer_location: "3rd Floor, Office 302",
    payment_method: "cash",
    payment_status: "pending",
    momo_transaction_id: null,
    subtotal: 35000,
    total: 35000,
    special_instructions: null,
    source: "kiosk",
    created_at: new Date(Date.now() - 20 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60000).toISOString(),
    prepared_at: new Date(Date.now() - 10 * 60000).toISOString(),
    ready_at: new Date(Date.now() - 5 * 60000).toISOString(),
    delivered_at: null,
    items: [
      { id: "d1-item-1", order_id: "delivery-1", type: "combo", main_dishes: ["Matooke", "Rice"], sauce_name: "Chicken Stew", sauce_preparation: null, sauce_size: "Regular", side_dish: "Cabbage", extras: null, quantity: 1, unit_price: 35000, total_price: 35000 },
    ],
  },
  {
    id: "delivery-2",
    order_number: "9Y-011",
    status: "ready",
    customer_name: "David Ochieng",
    customer_phone: "+256700789012",
    customer_location: "Reception Desk",
    payment_method: "mobile_money",
    payment_status: "paid",
    momo_transaction_id: "TXN789012",
    subtotal: 22000,
    total: 22000,
    special_instructions: "Call when at reception",
    source: "kiosk",
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 60000).toISOString(),
    prepared_at: new Date(Date.now() - 15 * 60000).toISOString(),
    ready_at: new Date(Date.now() - 8 * 60000).toISOString(),
    delivered_at: null,
    items: [
      { id: "d2-item-1", order_id: "delivery-2", type: "single", main_dishes: [], sauce_name: "G-Nuts", sauce_preparation: null, sauce_size: "Regular", side_dish: null, extras: null, quantity: 1, unit_price: 15000, total_price: 15000 },
      { id: "d2-item-2", order_id: "delivery-2", type: "single", main_dishes: [], sauce_name: null, sauce_preparation: null, sauce_size: null, side_dish: null, extras: null, quantity: 1, unit_price: 5000, total_price: 5000 },
    ],
  },
  {
    id: "delivery-3",
    order_number: "9Y-008",
    status: "delivered",
    customer_name: "Fatuma Nantongo",
    customer_phone: "+256700345678",
    customer_location: "2nd Floor, Room 210",
    payment_method: "pay_at_counter",
    payment_status: "paid",
    momo_transaction_id: null,
    subtotal: 28000,
    total: 28000,
    special_instructions: null,
    source: "kiosk",
    created_at: new Date(Date.now() - 90 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 60 * 60000).toISOString(),
    prepared_at: new Date(Date.now() - 80 * 60000).toISOString(),
    ready_at: new Date(Date.now() - 70 * 60000).toISOString(),
    delivered_at: new Date(Date.now() - 60 * 60000).toISOString(),
    items: [
      { id: "d3-item-1", order_id: "delivery-3", type: "combo", main_dishes: ["Posho"], sauce_name: "Beef Stew", sauce_preparation: "Fried", sauce_size: "Regular", side_dish: "Beans", extras: null, quantity: 1, unit_price: 28000, total_price: 28000 },
    ],
  },
];

// In-memory store for mock mode
const mockDeliveriesStore = [...MOCK_DELIVERIES];

export default function MyDeliveries() {
  const { user } = useAuth();
  const updateStatus = useUpdateOrderStatus();

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["deliveries"],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        console.log("📦 Mock mode: returning mock deliveries");
        return mockDeliveriesStore;
      }
      
      const { data, error } = await supabase
        .from("orders")
        .select("*, items:order_items(*)")
        .in("status", ["ready", "delivered"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: USE_MOCK_DATA ? 5_000 : 15_000,
  });

  const readyOrders = orders?.filter((o) => o.status === "ready") || [];
  const deliveredOrders = orders?.filter((o) => o.status === "delivered") || [];

  const handleDeliver = async (order: Order) => {
    try {
      await updateStatus.mutateAsync({
        orderId: order.id,
        status: "delivered",
      });
      
      // Update mock store in mock mode
      if (USE_MOCK_DATA) {
        const mockOrder = mockDeliveriesStore.find(o => o.id === order.id);
        if (mockOrder) {
          mockOrder.status = "delivered";
          mockOrder.delivered_at = new Date().toISOString();
        }
      }
      
      toast.success(`${order.order_number} marked as delivered`);
    } catch {
      toast.error("Failed to update");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-secondary border-t-transparent rounded-full" />
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
