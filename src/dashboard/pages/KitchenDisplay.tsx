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
import { Order, OrderItem } from "@shared/types/database";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { formatPrice } from "@shared/lib/utils";

// Status configurations
const STATUS_CONFIG = {
  pending: {
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
};

// Mock KDS orders for development
const generateMockKDSOrders = (): Order[] => {
  const statuses: ("pending" | "preparing" | "ready")[] = ["pending", "preparing", "ready"];
  const now = Date.now();
  
  return [
    {
      id: "kds-1",
      order_number: "A-001",
      status: "pending",
      total: 35000,
      payment_status: "pending",
      payment_method: "cash",
      order_type: "dine-in",
      created_at: new Date(now - 2 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        { id: "1", order_id: "kds-1", menu_item_id: "1", quantity: 2, unit_price: 15000, created_at: new Date().toISOString(), menu_item: { id: "1", name: "Chicken Pilao", category_id: "1", price: 15000, available: true, created_at: "", updated_at: "" } },
        { id: "2", order_id: "kds-1", menu_item_id: "2", quantity: 1, unit_price: 5000, created_at: new Date().toISOString(), menu_item: { id: "2", name: "Passion Juice", category_id: "3", price: 5000, available: true, created_at: "", updated_at: "" } },
      ],
    },
    {
      id: "kds-2",
      order_number: "A-002",
      status: "preparing",
      total: 45000,
      payment_status: "completed",
      payment_method: "mobile_money",
      order_type: "takeaway",
      created_at: new Date(now - 5 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        { id: "3", order_id: "kds-2", menu_item_id: "3", quantity: 1, unit_price: 45000, created_at: new Date().toISOString(), menu_item: { id: "3", name: "Whole Chicken Lusaniya", category_id: "2", price: 45000, available: true, created_at: "", updated_at: "" } },
      ],
    },
    {
      id: "kds-3",
      order_number: "A-003",
      status: "preparing",
      total: 25000,
      payment_status: "completed",
      payment_method: "cash",
      order_type: "dine-in",
      created_at: new Date(now - 8 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        { id: "4", order_id: "kds-3", menu_item_id: "4", quantity: 2, unit_price: 10000, created_at: new Date().toISOString(), menu_item: { id: "4", name: "Beef Stew", category_id: "1", price: 10000, available: true, created_at: "", updated_at: "" } },
        { id: "5", order_id: "kds-3", menu_item_id: "5", quantity: 1, unit_price: 5000, created_at: new Date().toISOString(), menu_item: { id: "5", name: "Kachumbari", category_id: "4", price: 5000, available: true, created_at: "", updated_at: "" } },
      ],
    },
    {
      id: "kds-4",
      order_number: "A-004",
      status: "ready",
      total: 20000,
      payment_status: "completed",
      payment_method: "mobile_money",
      order_type: "takeaway",
      created_at: new Date(now - 12 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        { id: "6", order_id: "kds-4", menu_item_id: "6", quantity: 2, unit_price: 10000, created_at: new Date().toISOString(), menu_item: { id: "6", name: "Rice", category_id: "4", price: 10000, available: true, created_at: "", updated_at: "" } },
      ],
    },
    {
      id: "kds-5",
      order_number: "A-005",
      status: "pending",
      total: 55000,
      payment_status: "pending",
      payment_method: "cash",
      order_type: "dine-in",
      created_at: new Date(now - 1 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        { id: "7", order_id: "kds-5", menu_item_id: "7", quantity: 1, unit_price: 45000, created_at: new Date().toISOString(), menu_item: { id: "7", name: "Half Chicken Lusaniya", category_id: "2", price: 45000, available: true, created_at: "", updated_at: "" } },
        { id: "8", order_id: "kds-5", menu_item_id: "8", quantity: 2, unit_price: 5000, created_at: new Date().toISOString(), menu_item: { id: "8", name: "Mango Juice", category_id: "3", price: 5000, available: true, created_at: "", updated_at: "" } },
      ],
    },
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
          items:order_items(*, menu_item:menu_items(*))
        `)
        .in("status", ["pending", "preparing", "ready"])
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
  const pendingOrders = orders.filter((o) => o.status === "pending");
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
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (USE_MOCK_DATA) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as Order["status"] } : o))
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
                  status="pending"
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
                  onComplete={() => updateOrderStatus(order.id, "completed")}
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
  status: "pending" | "preparing" | "ready";
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
          {order.order_type === "takeaway" && (
            <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-medium">
              TAKEAWAY
            </span>
          )}
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
                {item.menu_item?.name || "Unknown Item"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <div className="px-4 pb-4">
        {status === "pending" && onStartCooking && (
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
