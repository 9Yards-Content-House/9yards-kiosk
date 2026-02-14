import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, MapPin, CheckCircle2, Phone, Clock, AlertCircle, UserPlus, Truck } from "lucide-react";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useUpdateOrderStatus } from "@shared/hooks/useOrders";
import { formatPrice, timeAgo } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@shared/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
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
    rider_id: null,
    assigned_at: null,
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
    rider_id: null,
    assigned_at: null,
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
    rider_id: "mock-rider-1",
    assigned_at: new Date(Date.now() - 65 * 60000).toISOString(),
    items: [
      { id: "d3-item-1", order_id: "delivery-3", type: "combo", main_dishes: ["Posho"], sauce_name: "Beef Stew", sauce_preparation: "Fried", sauce_size: "Regular", side_dish: "Beans", extras: null, quantity: 1, unit_price: 28000, total_price: 28000 },
    ],
  },
];

// In-memory store for mock mode
const mockDeliveriesStore = [...MOCK_DELIVERIES];

// Calculate wait time since order was ready
const getWaitTime = (readyAt: string | null) => {
  if (!readyAt) return null;
  const minutes = Math.floor((Date.now() - new Date(readyAt).getTime()) / 60000);
  if (minutes < 1) return "Just ready";
  if (minutes === 1) return "1 min waiting";
  return `${minutes} mins waiting`;
};

// Check if order is urgent (waiting > 10 mins)
const isUrgent = (readyAt: string | null) => {
  if (!readyAt) return false;
  return (Date.now() - new Date(readyAt).getTime()) > 10 * 60 * 1000;
};

const handleCallCustomer = (phone: string | null) => {
  if (phone) {
    window.location.href = `tel:${phone}`;
  }
};

export default function MyDeliveries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const updateStatus = useUpdateOrderStatus();
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<"available" | "mine" | "delivered">("available");

  // Fetch available (unassigned ready) orders
  const { data: availableOrders, isLoading: loadingAvailable } = useQuery<Order[]>({
    queryKey: ["deliveries", "available"],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        return mockDeliveriesStore.filter(o => o.status === "ready" && !o.rider_id);
      }
      
      const { data, error } = await supabase
        .from("orders")
        .select("*, items:order_items(*)")
        .eq("status", "ready")
        .is("rider_id", null)
        .order("ready_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: 10_000,
  });

  // Fetch my assigned orders
  const { data: myOrders, isLoading: loadingMine } = useQuery<Order[]>({
    queryKey: ["deliveries", "mine", user?.id],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        return mockDeliveriesStore.filter(o => o.rider_id === user?.id && o.status !== "delivered");
      }
      
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*, items:order_items(*)")
        .eq("rider_id", user.id)
        .in("status", ["ready", "preparing"])
        .order("assigned_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 15_000,
  });

  // Fetch my delivered orders today
  const { data: deliveredOrders, isLoading: loadingDelivered } = useQuery<Order[]>({
    queryKey: ["deliveries", "delivered", user?.id],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        return mockDeliveriesStore.filter(o => o.status === "delivered");
      }
      
      if (!user?.id) return [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from("orders")
        .select("*, items:order_items(*)")
        .eq("rider_id", user.id)
        .eq("status", "delivered")
        .gte("delivered_at", today.toISOString())
        .order("delivered_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 30_000,
  });

  // Claim order mutation
  const claimOrder = useMutation({
    mutationFn: async (orderId: string) => {
      if (USE_MOCK_DATA) {
        const order = mockDeliveriesStore.find(o => o.id === orderId);
        if (order) {
          order.rider_id = user?.id || null;
          order.assigned_at = new Date().toISOString();
        }
        return order;
      }

      const { data, error } = await supabase.rpc("claim_order", { p_order_id: orderId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      toast.success("Order claimed! It's now your delivery.");
    },
    onError: () => {
      toast.error("Couldn't claim order. It may have been taken.");
    },
  });

  // Calculate wait time since order was ready
  const getWaitTime = (readyAt: string | null) => {
    if (!readyAt) return null;
    const minutes = Math.floor((Date.now() - new Date(readyAt).getTime()) / 60000);
    if (minutes < 1) return "Just ready";
    if (minutes === 1) return "1 min waiting";
    return `${minutes} mins waiting`;
  };

  // Check if order is urgent (waiting > 10 mins)
  const isUrgent = (readyAt: string | null) => {
    if (!readyAt) return false;
    return (Date.now() - new Date(readyAt).getTime()) > 10 * 60 * 1000;
  };

  const handleCallCustomer = (phone: string | null) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

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
      
      setConfirmOrder(null);
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      toast.success(`${order.order_number} marked as delivered`);
    } catch {
      toast.error("Failed to update");
    }
  };

  const isLoading = loadingAvailable || loadingMine || loadingDelivered;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-secondary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">My Deliveries</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Package className="w-4 h-4" />
            {availableOrders?.length || 0} available
          </span>
          <span className="flex items-center gap-1">
            <Truck className="w-4 h-4" />
            {myOrders?.length || 0} in progress
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            {deliveredOrders?.length || 0} delivered today
          </span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="mb-4">
          <TabsTrigger value="available" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Available ({availableOrders?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="mine" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            My Deliveries ({myOrders?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="delivered" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Completed ({deliveredOrders?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Available Orders */}
        <TabsContent value="available">
          {availableOrders && availableOrders.length > 0 ? (
            <div className="space-y-3">
              {availableOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-card rounded-xl border p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-lg">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.customer_name} • Ready {timeAgo(order.ready_at || order.created_at)}
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
                    {order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} items • {formatPrice(order.total)}
                    {order.payment_status === "pending" && (
                      <span className="ml-2 px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-medium">
                        Collect {formatPrice(order.total)}
                      </span>
                    )}
                  </div>

                  <Button
                    onClick={() => claimOrder.mutate(order.id)}
                    disabled={claimOrder.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Claim This Delivery
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-xl">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No orders available for pickup</p>
              <p className="text-sm">New ready orders will appear here</p>
            </div>
          )}
        </TabsContent>

        {/* My Deliveries */}
        <TabsContent value="mine">
          {myOrders && myOrders.length > 0 ? (
            <div className="space-y-3">
              {myOrders.map((order) => {
                const waitTime = getWaitTime(order.ready_at);
                const urgent = isUrgent(order.ready_at);
                return (
                  <div
                    key={order.id}
                    className={`bg-card rounded-xl border p-4 ${urgent ? "border-red-500/50" : ""}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg">{order.order_number}</p>
                          {urgent && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                              <AlertCircle className="w-3 h-3" />
                              Urgent
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.customer_name} • {timeAgo(order.created_at)}
                        </p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>

                    {waitTime && (
                      <div className={`flex items-center gap-2 text-sm mb-3 ${urgent ? "text-red-600" : "text-amber-600"}`}>
                        <Clock className="w-4 h-4" />
                        {waitTime}
                      </div>
                    )}

                    {order.customer_location && (
                      <div className="flex items-center gap-2 text-sm mb-3">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {order.customer_location}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Package className="w-4 h-4" />
                      {order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} items • {formatPrice(order.total)}
                      {order.payment_status === "pending" && (
                        <span className="ml-2 px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-medium">
                          Collect {formatPrice(order.total)}
                        </span>
                      )}
                    </div>

                    {order.special_instructions && (
                      <div className="bg-muted/50 rounded-lg p-2 mb-3 text-sm">
                        <span className="font-medium">Note:</span> {order.special_instructions}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {order.customer_phone && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleCallCustomer(order.customer_phone)}
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Call
                        </Button>
                      )}
                      <Button
                        className={`flex-1 ${urgent ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
                        onClick={() => setConfirmOrder(order)}
                        disabled={updateStatus.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Mark Delivered
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-xl">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No active deliveries</p>
              <p className="text-sm">Claim orders from the Available tab</p>
            </div>
          )}
        </TabsContent>

        {/* Delivered */}
        <TabsContent value="delivered">
          {deliveredOrders && deliveredOrders.length > 0 ? (
            <div className="space-y-2">
              {deliveredOrders.map((order) => (
                <div key={order.id} className="bg-card rounded-xl border p-3 opacity-70">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{order.order_number}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {order.customer_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatPrice(order.total)}</span>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-xl">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No deliveries completed today</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmOrder} onOpenChange={(open) => !open && setConfirmOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delivery</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark order <span className="font-semibold">{confirmOrder?.order_number}</span> as delivered to {confirmOrder?.customer_name}?
              {confirmOrder?.payment_status === "pending" && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Remember to collect {formatPrice(confirmOrder?.total || 0)} (Cash)
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmOrder && handleDeliver(confirmOrder)}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirm Delivered
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
