import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, MapPin, CheckCircle2, Phone, Clock, AlertCircle, UserPlus, Truck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useUpdateOrderStatus } from "@shared/hooks/useOrders";
import { formatPrice, timeAgo, cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
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
    order_number: "381047",
    status: "preparing", // Available for riders to claim
    customer_name: "Grace Auma",
    customer_phone: "+256700123456",
    customer_location: "3rd Floor, Office 302",
    payment_method: "cash",
    payment_status: "pending",
    momo_transaction_id: null,
    subtotal: 35000,
    delivery_fee: 5000,
    total: 40000,
    special_instructions: null,
    source: "kiosk",
    created_at: new Date(Date.now() - 20 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60000).toISOString(),
    prepared_at: new Date(Date.now() - 10 * 60000).toISOString(),
    ready_at: new Date(Date.now() - 5 * 60000).toISOString(),
    delivered_at: null,
    rider_id: null,
    assigned_at: null,
    picked_up_at: null,
    picked_up_by: null,
    scheduled_for: null,
    is_scheduled: false,
    location_id: null,
    items: [
      { id: "d1-item-1", order_id: "delivery-1", type: "combo", main_dishes: ["Matooke", "Rice"], sauce_name: "Chicken Stew", sauce_preparation: null, sauce_size: "Regular", side_dish: "Cabbage", extras: null, quantity: 1, unit_price: 35000, total_price: 35000 },
    ],
  },
  {
    id: "delivery-2",
    order_number: "592184",
    status: "out_for_delivery",
    customer_name: "David Ochieng",
    customer_phone: "+256700789012",
    customer_location: "Reception Desk",
    payment_method: "mobile_money",
    payment_status: "paid",
    momo_transaction_id: "TXN789012",
    subtotal: 22000,
    delivery_fee: 5000,
    total: 27000,
    special_instructions: "Call when at reception",
    source: "kiosk",
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 60000).toISOString(),
    prepared_at: new Date(Date.now() - 15 * 60000).toISOString(),
    ready_at: new Date(Date.now() - 8 * 60000).toISOString(),
    delivered_at: null,
    rider_id: null,
    assigned_at: null,
    picked_up_at: null,
    picked_up_by: null,
    scheduled_for: null,
    is_scheduled: false,
    location_id: null,
    items: [
      { id: "d2-item-1", order_id: "delivery-2", type: "single", main_dishes: [], sauce_name: "G-Nuts", sauce_preparation: null, sauce_size: "Regular", side_dish: null, extras: null, quantity: 1, unit_price: 15000, total_price: 15000 },
      { id: "d2-item-2", order_id: "delivery-2", type: "single", main_dishes: [], sauce_name: null, sauce_preparation: null, sauce_size: null, side_dish: null, extras: null, quantity: 1, unit_price: 5000, total_price: 5000 },
    ],
  },
  {
    id: "delivery-3",
    order_number: "847293",
    status: "arrived",
    customer_name: "Fatuma Nantongo",
    customer_phone: "+256700345678",
    customer_location: "2nd Floor, Room 210",
    payment_method: "pay_at_counter",
    payment_status: "paid",
    momo_transaction_id: null,
    subtotal: 28000,
    delivery_fee: 5000,
    total: 33000,
    special_instructions: null,
    source: "kiosk",
    created_at: new Date(Date.now() - 90 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 60 * 60000).toISOString(),
    prepared_at: new Date(Date.now() - 80 * 60000).toISOString(),
    ready_at: new Date(Date.now() - 70 * 60000).toISOString(),
    delivered_at: new Date(Date.now() - 60 * 60000).toISOString(),
    rider_id: "mock-rider-1",
    assigned_at: new Date(Date.now() - 65 * 60000).toISOString(),
    picked_up_at: null,
    picked_up_by: null,
    scheduled_for: null,
    is_scheduled: false,
    location_id: null,
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

function DeliveryStatCard({ 
  label, 
  value, 
  icon: Icon, 
  color, 
  isActive, 
  onClick, 
  delay = 0 
}: { 
  label: string; 
  value: number; 
  icon: typeof Package; 
  color: string;
  isActive: boolean;
  onClick: () => void;
  delay?: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className={cn(
        "flex-1 text-left rounded-2xl border p-3 md:p-4 transition-all relative overflow-hidden group",
        isActive 
          ? "bg-white border-primary shadow-md ring-1 ring-primary/20" 
          : "bg-slate-50/50 border-slate-100 hover:bg-white hover:border-slate-200"
      )}
    >
      {isActive && (
        <motion.div 
          layoutId="active-bg"
          className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" 
        />
      )}
      <div className="flex items-center justify-between mb-2 relative z-10">
        <p className={cn(
          "text-[8px] md:text-[10px] font-black uppercase tracking-widest leading-none",
          isActive ? "text-primary" : "text-slate-400"
        )}>
          {label}
        </p>
        <div className={cn(
          "w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
          isActive ? color : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
        )}>
          <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </div>
      </div>
      <p className={cn(
        "text-xl md:text-2xl font-black tracking-tight leading-none relative z-10",
        isActive ? "text-primary" : "text-slate-400"
      )}>
        {value}
      </p>
    </motion.button>
  );
}

export default function MyDeliveries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const updateStatus = useUpdateOrderStatus();
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<"available" | "mine" | "delivered">("available");

  // Fetch available orders (preparing status - ready to be claimed by riders)
  const { data: availableOrders, isLoading: loadingAvailable } = useQuery<Order[]>({
    queryKey: ["deliveries", "available"],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        // Show preparing orders that don't have a rider assigned yet
        return mockDeliveriesStore.filter(o => o.status === "preparing" && !o.rider_id);
      }
      
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*, items:order_items(*)")
          .eq("status", "preparing")
          .is("rider_id", null)
          .order("created_at", { ascending: true })
          .limit(50);
        
        if (error) {
          console.error("Available orders query error:", error);
          throw error;
        }
        
        console.log(`📦 Deliveries: ${data?.length || 0} orders being prepared (available to claim)`);
        return data || [];
      } catch (err) {
        console.warn("Failed to fetch available orders:", err);
        return [];
      }
    },
    refetchInterval: 10_000,
  });

  // Fetch my assigned orders
  const { data: myOrders, isLoading: loadingMine } = useQuery<Order[]>({
    queryKey: ["deliveries", "mine", user?.id],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        return mockDeliveriesStore.filter(o => o.rider_id === user?.id && o.status !== "arrived");
      }
      
      if (!user?.id) return [];
      
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*, items:order_items(*)")
          .eq("rider_id", user.id)
          .in("status", ["out_for_delivery", "preparing"])
          .order("assigned_at", { ascending: false })
          .limit(50);
        
        if (error) {
          console.error("My orders query error:", error);
          throw error;
        }
        
        console.log(`📦 Deliveries: ${data?.length || 0} orders assigned to me`);
        return data || [];
      } catch (err) {
        console.warn("Failed to fetch my orders:", err);
        return [];
      }
    },
    enabled: !!user?.id,
    refetchInterval: 15_000,
  });

  // Fetch my delivered orders today
  const { data: deliveredOrders, isLoading: loadingDelivered } = useQuery<Order[]>({
    queryKey: ["deliveries", "delivered", user?.id],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        return mockDeliveriesStore.filter(o => o.status === "arrived");
      }
      
      if (!user?.id) return [];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*, items:order_items(*)")
          .eq("rider_id", user.id)
          .eq("status", "arrived")
          .gte("delivered_at", today.toISOString())
          .order("delivered_at", { ascending: false })
          .limit(50);
        
        if (error) {
          console.error("Delivered orders query error:", error);
          throw error;
        }
        
        console.log(`📦 Deliveries: ${data?.length || 0} orders delivered today`);
        return data || [];
      } catch (err) {
        console.warn("Failed to fetch delivered orders:", err);
        return [];
      }
    },
    enabled: !!user?.id,
    refetchInterval: 30_000,
  });

  // Claim order mutation - moves order to out_for_delivery and assigns rider
  const claimOrder = useMutation({
    mutationFn: async (orderId: string) => {
      if (USE_MOCK_DATA) {
        const order = mockDeliveriesStore.find(o => o.id === orderId);
        if (order) {
          order.status = "out_for_delivery";
          order.rider_id = user?.id || null;
          order.assigned_at = new Date().toISOString();
          order.ready_at = new Date().toISOString();
        }
        return order;
      }

      // First try the RPC function, fall back to direct update
      try {
        const { data, error } = await supabase.rpc("claim_order", { p_order_id: orderId });
        if (error) throw error;
        return data;
      } catch {
        // Fallback: direct update if RPC doesn't exist
        const { error } = await supabase
          .from("orders")
          .update({
            status: "out_for_delivery",
            rider_id: user?.id,
            assigned_at: new Date().toISOString(),
            ready_at: new Date().toISOString(),
          })
          .eq("id", orderId)
          .eq("status", "preparing"); // Only claim if still preparing
        if (error) throw error;
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] }); // Refresh kanban board too
      toast.success("Order claimed! It's now out for delivery.");
    },
    onError: () => {
      toast.error("Couldn't claim order. It may have been taken.");
    },
  });

  const handleDeliver = async (order: Order) => {
    try {
      await updateStatus.mutateAsync({
        orderId: order.id,
        status: "arrived",
      });
      
      // Update mock store in mock mode
      if (USE_MOCK_DATA) {
        const mockOrder = mockDeliveriesStore.find(o => o.id === order.id);
        if (mockOrder) {
          mockOrder.status = "arrived";
          mockOrder.delivered_at = new Date().toISOString();
        }
      }
      
      setConfirmOrder(null);
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      toast.success(`${order.order_number} marked as arrived`);
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
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl md:text-2xl font-black text-primary uppercase tracking-tight flex items-center gap-2 mb-6">
          <Truck className="w-6 h-6 md:w-7 md:h-7" />
          My Deliveries
        </h1>
        
        <div className="flex gap-2 md:gap-4">
          <DeliveryStatCard
            label="Available"
            value={availableOrders?.length || 0}
            icon={Package}
            color="bg-primary/10 text-primary"
            isActive={activeTab === "available"}
            onClick={() => setActiveTab("available")}
            delay={0.1}
          />
          <DeliveryStatCard
            label="Mine"
            value={myOrders?.length || 0}
            icon={Truck}
            color="bg-secondary/10 text-secondary"
            isActive={activeTab === "mine"}
            onClick={() => setActiveTab("mine")}
            delay={0.2}
          />
          <DeliveryStatCard
            label="Today"
            value={deliveredOrders?.length || 0}
            icon={CheckCircle2}
            color="bg-green-100 text-green-600"
            isActive={activeTab === "delivered"}
            onClick={() => setActiveTab("delivered")}
            delay={0.3}
          />
        </div>
      </div>

      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === "available" && (
            <motion.div
              key="available-list"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <AvailableList orders={availableOrders || []} claimOrder={claimOrder} />
            </motion.div>
          )}

          {activeTab === "mine" && (
            <motion.div
              key="mine-list"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <MineList 
                orders={myOrders || []} 
                setConfirmOrder={setConfirmOrder} 
                isPending={updateStatus.isPending} 
              />
            </motion.div>
          )}

          {activeTab === "delivered" && (
            <motion.div
              key="delivered-list"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <DeliveredList orders={deliveredOrders || []} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog 
        confirmOrder={confirmOrder} 
        setConfirmOrder={setConfirmOrder} 
        handleDeliver={handleDeliver} 
      />
    </div>
  );
}

/* ─── Shared Components ─── */

function ConfirmationDialog({ confirmOrder, setConfirmOrder, handleDeliver }: any) {
  return (
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
  );
}
/* ─── Sub-components for better organization ─── */

function AvailableList({ orders, claimOrder }: { orders: Order[], claimOrder: any }) {
  if (orders.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200"
      >
        <Package className="w-12 h-12 mx-auto mb-4 text-slate-200" />
        <h3 className="text-lg font-black text-primary uppercase tracking-tight">No orders ready</h3>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">New deliveries will appear here as they are prepared</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {orders.map((order, idx) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: Math.min(idx * 0.05, 0.4) }}
            className="bg-white rounded-[2rem] border border-slate-100 p-5 shadow-sm overflow-hidden"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-black text-primary text-lg tracking-tight leading-none mb-1">{order.order_number}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  {order.customer_name} • {timeAgo(order.created_at)}
                </p>
              </div>
              <StatusBadge status={order.status} className="rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest" />
            </div>

            <div className="space-y-3 mb-5">
              {order.customer_location && (
                <div className="flex items-start gap-2.5 min-w-0">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-slate-600 leading-snug">{order.customer_location}</p>
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-primary shrink-0" />
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <span>{order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} items</span>
                  <span className="w-1 h-1 rounded-full bg-slate-200" />
                  <span className="text-primary">{formatPrice(order.total)}</span>
                </div>
                {order.payment_status === "pending" && (
                  <div className="ml-auto px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[8px] font-black uppercase tracking-widest border border-secondary/20">
                    Cash Collection
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={() => claimOrder.mutate(order.id)}
              disabled={claimOrder.isPending}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-md transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {claimOrder.isPending ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Claim Delivery
                </>
              )}
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function MineList({ orders, setConfirmOrder, isPending }: { orders: Order[], setConfirmOrder: any, isPending: boolean }) {
  if (orders.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200"
      >
        <Truck className="w-12 h-12 mx-auto mb-4 text-slate-200" />
        <h3 className="text-lg font-black text-primary uppercase tracking-tight">No active deliveries</h3>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Claim orders from the Available tab to start delivering</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order, idx) => {
        const waitTime = getWaitTime(order.ready_at);
        const urgent = isUrgent(order.ready_at);
        return (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className={cn(
              "bg-white rounded-[2rem] border p-5 shadow-sm overflow-hidden transition-colors",
              urgent ? "border-red-200 bg-red-50/10" : "border-slate-100"
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-black text-primary text-lg tracking-tight leading-none">{order.order_number}</p>
                  {urgent && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[8px] font-black uppercase tracking-widest animate-pulse">
                      <AlertCircle className="w-2.5 h-2.5" />
                      Urgent
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  {order.customer_name} • {timeAgo(order.created_at)}
                </p>
              </div>
              <StatusBadge status={order.status} className="rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest" />
            </div>

            <div className="space-y-3 mb-5">
              {waitTime && (
                <div className={cn(
                  "flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest",
                  urgent ? "text-red-600" : "text-secondary"
                )}>
                  <Clock className="w-4 h-4 shrink-0" />
                  {waitTime}
                </div>
              )}

              {order.customer_location && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-slate-600 leading-snug">{order.customer_location}</p>
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-primary shrink-0" />
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <span>{order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} items</span>
                  <span className="w-1 h-1 rounded-full bg-slate-200" />
                  <span className="text-primary">{formatPrice(order.total)}</span>
                </div>
                {order.payment_status === "pending" && (
                  <div className="ml-auto px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[8px] font-black uppercase tracking-widest border border-secondary/20">
                    Cash Collection
                  </div>
                )}
              </div>
            </div>

            {order.special_instructions && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-5">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                   <AlertCircle className="w-3 h-3 text-secondary" />
                   Special Instructions
                 </p>
                 <p className="text-sm font-bold text-slate-600 leading-relaxed italic">"{order.special_instructions}"</p>
              </div>
            )}

            <div className="flex gap-2">
              {order.customer_phone && (
                <Button
                  variant="outline"
                  onClick={() => handleCallCustomer(order.customer_phone)}
                  className="h-12 w-12 rounded-2xl border-slate-100 bg-white shadow-sm shrink-0 flex items-center justify-center p-0"
                >
                  <Phone className="w-5 h-5 text-primary" />
                </Button>
              )}
              <Button
                onClick={() => setConfirmOrder(order)}
                disabled={isPending}
                className={cn(
                  "flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-md transition-all active:scale-[0.98] disabled:opacity-70",
                  urgent ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"
                )}
              >
                {isPending ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete Delivery
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function DeliveredList({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200"
      >
        <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-slate-200" />
        <h3 className="text-lg font-black text-primary uppercase tracking-tight">No completions yet</h3>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Finished deliveries for today will appear here</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order, idx) => (
        <motion.div 
          key={order.id} 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: idx * 0.03 }}
          className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-black text-primary text-sm tracking-tight leading-none truncate block mb-1">{order.order_number}</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                {order.customer_name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-primary">{formatPrice(order.total)}</span>
              <StatusBadge status={order.status} className="rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

