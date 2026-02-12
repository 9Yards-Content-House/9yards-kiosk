import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  ChefHat,
  Check,
  AlertTriangle,
  Volume2,
  VolumeX,
  Maximize2,
  RefreshCw,
  Timer,
  Flame,
} from "lucide-react";
import type { Order, OrderItem, OrderStatus, PaymentStatus } from "@shared/types";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { formatPrice } from "@shared/lib/utils";

// Status configurations
const STATUS_CONFIG = {
  new: {
    label: "New Order",
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    icon: AlertTriangle,
  },
  preparing: {
    label: "Preparing",
    color: "bg-blue-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: Flame,
  },
  ready: {
    label: "Ready",
    color: "bg-green-500",
    textColor: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: Check,
  },
} as const;

// Mock KDS orders for development
const generateMockKDSOrders = (): Order[] => {
  const now = Date.now();

  const makeItem = (partial: Partial<OrderItem> & { id: string; order_id: string }): OrderItem => ({
    id: partial.id,
    order_id: partial.order_id,
    type: partial.type ?? "single",
    main_dishes: partial.main_dishes ?? [],
    sauce_name: partial.sauce_name ?? null,
    sauce_preparation: partial.sauce_preparation ?? null,
    sauce_size: partial.sauce_size ?? null,
    side_dish: partial.side_dish ?? null,
    extras: partial.extras ?? null,
    quantity: partial.quantity ?? 1,
    unit_price: partial.unit_price ?? 0,
    total_price: partial.total_price ?? 0,
  });

  const makeOrder = (partial: {
    id: string;
    order_number: string;
    status: OrderStatus;
    createdAtMsAgo: number;
    total: number;
    payment_status: PaymentStatus;
    items: OrderItem[];
  }): Order => {
    const created_at = new Date(now - partial.createdAtMsAgo).toISOString();
    const updated_at = new Date().toISOString();
    return {
      id: partial.id,
      order_number: partial.order_number,
      status: partial.status,
      customer_name: "Walk-in",
      customer_phone: null,
      customer_location: null,
      payment_method: "cash",
      payment_status: partial.payment_status,
      momo_transaction_id: null,
      subtotal: partial.total,
      total: partial.total,
      special_instructions: null,
      source: "kiosk",
      created_at,
      updated_at,
      prepared_at: null,
      ready_at: null,
      delivered_at: null,
      items: partial.items,
    };
  };

  return [
    makeOrder({
      id: "kds-1",
      order_number: "9Y-101",
      status: "new",
      createdAtMsAgo: 2 * 60 * 1000,
      total: 35000,
      payment_status: "pending",
      items: [
        makeItem({
          id: "1",
          order_id: "kds-1",
          quantity: 1,
          unit_price: 35000,
          total_price: 35000,
          type: "combo",
          main_dishes: ["Chicken Pilao"],
          side_dish: "Kachumbari",
        }),
      ],
    }),
    makeOrder({
      id: "kds-2",
      order_number: "9Y-102",
      status: "preparing",
      createdAtMsAgo: 5 * 60 * 1000,
      total: 45000,
      payment_status: "paid",
      items: [
        makeItem({
          id: "2",
          order_id: "kds-2",
          quantity: 1,
          unit_price: 45000,
          total_price: 45000,
          type: "single",
          main_dishes: ["Whole Chicken Lusaniya"],
        }),
      ],
    }),
    makeOrder({
      id: "kds-3",
      order_number: "9Y-103",
      status: "preparing",
      createdAtMsAgo: 8 * 60 * 1000,
      total: 25000,
      payment_status: "paid",
      items: [
        makeItem({
          id: "3",
          order_id: "kds-3",
          quantity: 1,
          unit_price: 25000,
          total_price: 25000,
          type: "combo",
          main_dishes: ["Beef Stew"],
          sauce_name: "Stew",
        }),
      ],
    }),
    makeOrder({
      id: "kds-4",
      order_number: "9Y-104",
      status: "ready",
      createdAtMsAgo: 12 * 60 * 1000,
      total: 20000,
      payment_status: "paid",
      items: [
        makeItem({
          id: "4",
          order_id: "kds-4",
          quantity: 2,
          unit_price: 10000,
          total_price: 20000,
          type: "single",
          main_dishes: ["Rice"],
        }),
      ],
    }),
    makeOrder({
      id: "kds-5",
      order_number: "9Y-105",
      status: "new",
      createdAtMsAgo: 1 * 60 * 1000,
      total: 55000,
      payment_status: "pending",
      items: [
        makeItem({
          id: "5",
          order_id: "kds-5",
          quantity: 1,
          unit_price: 45000,
          total_price: 45000,
          type: "single",
          main_dishes: ["Half Chicken Lusaniya"],
        }),
        makeItem({
          id: "6",
          order_id: "kds-5",
          quantity: 2,
          unit_price: 5000,
          total_price: 10000,
          type: "single",
          main_dishes: ["Mango Juice"],
        }),
      ],
    }),
  ];
};

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load orders
  useEffect(() => {
    if (USE_MOCK_DATA) {
      setOrders(generateMockKDSOrders());
      return;
    }

    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select(`
          *,
          items:order_items(*)
        `)
        .in("status", ["new", "preparing", "ready"])
        .order("created_at", { ascending: true });

      if (data) {
        setOrders(data);
      }
    };

    fetchOrders();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("kds-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Group orders by status
  const pendingOrders = orders.filter((o) => o.status === "new");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");

  // Calculate time elapsed
  const getTimeElapsed = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes === 1) return "1 min";
    return `${minutes} mins`;
  };

  // Check if order is urgent (> 10 mins)
  const isUrgent = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    return diff > 10 * 60 * 1000;
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (USE_MOCK_DATA) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      return;
    }

    await supabase
      .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", orderId);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Refresh orders
  const refreshOrders = () => {
    if (USE_MOCK_DATA) {
      setOrders(generateMockKDSOrders());
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ChefHat className="w-8 h-8 text-secondary" />
              <h1 className="text-2xl font-bold">Kitchen Display</h1>
            </div>
            <div className="text-gray-400">|</div>
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="w-5 h-5" />
              <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="flex items-center gap-4 mr-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">{pendingOrders.length}</div>
                <div className="text-xs text-gray-400">New</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{preparingOrders.length}</div>
                <div className="text-xs text-gray-400">Cooking</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{readyOrders.length}</div>
                <div className="text-xs text-gray-400">Ready</div>
              </div>
            </div>

            {/* Controls */}
            <button
              onClick={refreshOrders}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Order Grid */}
      <div className="p-6 grid grid-cols-3 gap-6">
        {/* Column: New Orders */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-yellow-500 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            New Orders ({pendingOrders.length})
          </h2>
          <div className="space-y-4">
            <AnimatePresence>
              {pendingOrders.map((order) => (
                <KDSOrderCard
                  key={order.id}
                  order={order}
                  status="new"
                  timeElapsed={getTimeElapsed(order.created_at)}
                  isUrgent={isUrgent(order.created_at)}
                  onStartCooking={() => updateOrderStatus(order.id, "preparing")}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Column: Preparing */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-blue-500 flex items-center gap-2">
            <Flame className="w-5 h-5" />
            Preparing ({preparingOrders.length})
          </h2>
          <div className="space-y-4">
            <AnimatePresence>
              {preparingOrders.map((order) => (
                <KDSOrderCard
                  key={order.id}
                  order={order}
                  status="preparing"
                  timeElapsed={getTimeElapsed(order.created_at)}
                  isUrgent={isUrgent(order.created_at)}
                  onMarkReady={() => updateOrderStatus(order.id, "ready")}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Column: Ready */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-green-500 flex items-center gap-2">
            <Check className="w-5 h-5" />
            Ready ({readyOrders.length})
          </h2>
          <div className="space-y-4">
            <AnimatePresence>
              {readyOrders.map((order) => (
                <KDSOrderCard
                  key={order.id}
                  order={order}
                  status="ready"
                  timeElapsed={getTimeElapsed(order.created_at)}
                  isUrgent={false}
                  onComplete={() => updateOrderStatus(order.id, "delivered")}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

interface KDSOrderCardProps {
  order: Order;
  status: "new" | "preparing" | "ready";
  timeElapsed: string;
  isUrgent: boolean;
  onStartCooking?: () => void;
  onMarkReady?: () => void;
  onComplete?: () => void;
}

function KDSOrderCard({
  order,
  status,
  timeElapsed,
  isUrgent,
  onStartCooking,
  onMarkReady,
  onComplete,
}: KDSOrderCardProps) {
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`rounded-xl border-2 overflow-hidden ${
        isUrgent ? "border-red-500 animate-pulse" : "border-gray-700"
      } ${config.bgColor.replace("bg-", "bg-gray-800/")}`}
    >
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${config.color}`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">#{order.order_number}</span>
        </div>
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4" />
          <span className={`font-medium ${isUrgent ? "text-red-200" : ""}`}>{timeElapsed}</span>
        </div>
      </div>

      {/* Items */}
      <div className="p-4 space-y-2">
        {order.items?.map((item) => (
          <div key={item.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center font-bold text-lg">
                {item.quantity}
              </span>
              <span className="font-medium text-white">
                {[
                  ...(item.main_dishes?.length ? [item.main_dishes.join(" + ")] : []),
                  ...(item.sauce_name ? [`Sauce: ${item.sauce_name}`] : []),
                  ...(item.side_dish ? [`Side: ${item.side_dish}`] : []),
                ].join(" • ") || "Item"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <div className="px-4 pb-4">
        {status === "new" && onStartCooking && (
          <button
            onClick={onStartCooking}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Flame className="w-5 h-5" />
            Start Cooking
          </button>
        )}
        {status === "preparing" && onMarkReady && (
          <button
            onClick={onMarkReady}
            className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Check className="w-5 h-5" />
            Mark Ready
          </button>
        )}
        {status === "ready" && onComplete && (
          <button
            onClick={onComplete}
            className="w-full py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Check className="w-5 h-5" />
            Complete & Clear
          </button>
        )}
      </div>
    </motion.div>
  );
}
