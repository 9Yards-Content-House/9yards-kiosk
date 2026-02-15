import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  GripVertical,
} from "lucide-react";
import type { Order, OrderStatus } from "@shared/types";
import { useAllOrders, useUpdateOrderStatus, useOrdersRealtime } from "@shared/hooks/useOrders";
import { cn } from "@shared/lib/utils";

// Status configurations matching Kanban colors (solid, no gradients)
const STATUS_CONFIG = {
  new: {
    label: "New Order",
    color: "bg-blue-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    headerBg: "bg-blue-500",
    icon: AlertTriangle,
  },
  preparing: {
    label: "Preparing",
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    headerBg: "bg-yellow-500",
    icon: Flame,
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "bg-purple-500",
    textColor: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    borderColor: "border-purple-200 dark:border-purple-800",
    headerBg: "bg-purple-500",
    icon: Check,
  },
} as const;

type KDSView = "all" | "new" | "preparing" | "out_for_delivery";

export default function KitchenDisplay() {
  // Use shared order hooks
  const { data: allOrders = [], isLoading, refetch } = useAllOrders();
  const updateOrderStatusMutation = useUpdateOrderStatus();
  useOrdersRealtime(); // Subscribe to realtime updates
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeView, setActiveView] = useState<KDSView>("all");
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);
  const prevOrderCountRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filter orders to only KDS-relevant statuses
  const orders = useMemo(() => {
    return allOrders.filter((order) =>
      ["new", "preparing", "out_for_delivery"].includes(order.status)
    );
  }, [allOrders]);

  // Play notification sound for new orders
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/new-order.mp3');
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Autoplay may be blocked, that's okay
      });
    } catch {
      // Audio not supported
    }
  }, [soundEnabled]);

  // Group orders by status
  const pendingOrders = orders.filter((o) => o.status === "new");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const outForDeliveryOrders = orders.filter((o) => o.status === "out_for_delivery");

  // Play sound when new orders arrive
  useEffect(() => {
    if (pendingOrders.length > prevOrderCountRef.current) {
      playNotificationSound();
    }
    prevOrderCountRef.current = pendingOrders.length;
  }, [pendingOrders.length, playNotificationSound]);

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
    updateOrderStatusMutation.mutate({ orderId, status: newStatus });
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
    refetch();
  };

  // Drag and drop handlers
  const handleDragStart = (order: Order) => {
    setDraggedOrder(order);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetStatus: OrderStatus) => {
    if (draggedOrder && draggedOrder.status !== targetStatus) {
      updateOrderStatus(draggedOrder.id, targetStatus);
    }
    setDraggedOrder(null);
  };

  const handleDragEnd = () => {
    setDraggedOrder(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b px-4 md:px-6 py-3 md:py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center justify-between md:justify-start gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-secondary">
                <ChefHat className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold">
                Kitchen Display
              </h1>
            </div>
            <div className="hidden md:flex items-center gap-2 text-muted-foreground">
              <div className="w-px h-6 bg-border"></div>
              <Clock className="w-5 h-5" />
              <span className="font-medium">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3">
            {/* Stats - horizontal on mobile */}
            <div className="flex items-center gap-2 md:gap-3 md:mr-4">
              <button
                onClick={() => setActiveView(activeView === "new" ? "all" : "new")}
                className={cn(
                  "text-center px-3 py-2 rounded-xl transition-all",
                  activeView === "new" 
                    ? "bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500" 
                    : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
                )}
              >
                <div className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">{pendingOrders.length}</div>
                <div className="text-xs text-muted-foreground font-medium">New</div>
              </button>
              <button
                onClick={() => setActiveView(activeView === "preparing" ? "all" : "preparing")}
                className={cn(
                  "text-center px-3 py-2 rounded-xl transition-all",
                  activeView === "preparing" 
                    ? "bg-yellow-100 dark:bg-yellow-900/30 ring-2 ring-yellow-500" 
                    : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
                )}
              >
                <div className="text-xl md:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{preparingOrders.length}</div>
                <div className="text-xs text-muted-foreground font-medium">Cooking</div>
              </button>
              <button
                onClick={() => setActiveView(activeView === "out_for_delivery" ? "all" : "out_for_delivery")}
                className={cn(
                  "text-center px-3 py-2 rounded-xl transition-all",
                  activeView === "out_for_delivery" 
                    ? "bg-purple-100 dark:bg-purple-900/30 ring-2 ring-purple-500" 
                    : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
                )}
              >
                <div className="text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400">{outForDeliveryOrders.length}</div>
                <div className="text-xs text-muted-foreground font-medium">Out</div>
              </button>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={refreshOrders}
                className="p-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 border border-border transition-all"
              >
                <RefreshCw className="w-5 h-5 text-muted-foreground" />
              </button>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={cn(
                  "p-2.5 rounded-xl border transition-all",
                  soundEnabled 
                    ? "bg-secondary/10 border-secondary text-secondary" 
                    : "bg-slate-200 dark:bg-slate-700 border-border text-muted-foreground"
                )}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleFullscreen}
                className="hidden md:block p-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 border border-border transition-all"
              >
                <Maximize2 className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View Tabs */}
      <div className="md:hidden flex border-b overflow-x-auto bg-white dark:bg-slate-800">
        <button
          onClick={() => setActiveView("all")}
          className={cn(
            "flex-1 min-w-[80px] px-4 py-3 text-sm font-medium transition-colors",
            activeView === "all" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground"
          )}
        >
          All
        </button>
        <button
          onClick={() => setActiveView("new")}
          className={cn(
            "flex-1 min-w-[80px] px-4 py-3 text-sm font-medium transition-colors",
            activeView === "new" ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "text-muted-foreground"
          )}
        >
          New ({pendingOrders.length})
        </button>
        <button
          onClick={() => setActiveView("preparing")}
          className={cn(
            "flex-1 min-w-[80px] px-4 py-3 text-sm font-medium transition-colors",
            activeView === "preparing" ? "text-yellow-600 border-b-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20" : "text-muted-foreground"
          )}
        >
          Cooking ({preparingOrders.length})
        </button>
        <button
          onClick={() => setActiveView("out_for_delivery")}
          className={cn(
            "flex-1 min-w-[80px] px-4 py-3 text-sm font-medium transition-colors",
            activeView === "out_for_delivery" ? "text-purple-600 border-b-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20" : "text-muted-foreground"
          )}
        >
          Out ({outForDeliveryOrders.length})
        </button>
      </div>

      {/* Order Grid - responsive columns with drag-drop */}
      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Column: New Orders */}
        {(activeView === "all" || activeView === "new") && (
          <div 
            className="space-y-4"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop("new")}
          >
            <h2 className="hidden md:flex text-lg font-semibold text-blue-600 dark:text-blue-400 items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <AlertTriangle className="w-4 h-4" />
              </div>
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
                    onDragStart={() => handleDragStart(order)}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedOrder?.id === order.id}
                  />
                ))}
              </AnimatePresence>
              {pendingOrders.length === 0 && (
                <div className="text-center py-12 text-muted-foreground bg-white dark:bg-slate-800 rounded-xl border border-dashed">
                  No new orders
                </div>
              )}
            </div>
          </div>
        )}

        {/* Column: Preparing */}
        {(activeView === "all" || activeView === "preparing") && (
          <div 
            className="space-y-4"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop("preparing")}
          >
            <h2 className="hidden md:flex text-lg font-semibold text-yellow-600 dark:text-yellow-400 items-center gap-2">
              <div className="p-1.5 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Flame className="w-4 h-4" />
              </div>
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
                    onMarkReady={() => updateOrderStatus(order.id, "out_for_delivery")}
                    onDragStart={() => handleDragStart(order)}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedOrder?.id === order.id}
                  />
                ))}
              </AnimatePresence>
              {preparingOrders.length === 0 && (
                <div className="text-center py-12 text-muted-foreground bg-white dark:bg-slate-800 rounded-xl border border-dashed">
                  No orders cooking
                </div>
              )}
            </div>
          </div>
        )}

        {/* Column: Out for Delivery */}
        {(activeView === "all" || activeView === "out_for_delivery") && (
          <div 
            className="space-y-4"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop("out_for_delivery")}
          >
            <h2 className="hidden md:flex text-lg font-semibold text-purple-600 dark:text-purple-400 items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Check className="w-4 h-4" />
              </div>
              Out for Delivery ({outForDeliveryOrders.length})
            </h2>
            <div className="space-y-4">
              <AnimatePresence>
                {outForDeliveryOrders.map((order) => (
                  <KDSOrderCard
                    key={order.id}
                    order={order}
                    status="out_for_delivery"
                    timeElapsed={getTimeElapsed(order.created_at)}
                    isUrgent={false}
                    onComplete={() => updateOrderStatus(order.id, "arrived")}
                    onDragStart={() => handleDragStart(order)}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedOrder?.id === order.id}
                  />
                ))}
              </AnimatePresence>
              {outForDeliveryOrders.length === 0 && (
                <div className="text-center py-12 text-muted-foreground bg-white dark:bg-slate-800 rounded-xl border border-dashed">
                  No orders out for delivery
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface KDSOrderCardProps {
  order: Order;
  status: "new" | "preparing" | "out_for_delivery";
  timeElapsed: string;
  isUrgent: boolean;
  onStartCooking?: () => void;
  onMarkReady?: () => void;
  onComplete?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

function KDSOrderCard({
  order,
  status,
  timeElapsed,
  isUrgent,
  onStartCooking,
  onMarkReady,
  onComplete,
  onDragStart,
  onDragEnd,
  isDragging,
}: KDSOrderCardProps) {
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: isDragging ? 1.02 : 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-xl border overflow-hidden bg-white dark:bg-slate-800 shadow-sm cursor-grab active:cursor-grabbing",
        isUrgent 
          ? "border-red-500 ring-2 ring-red-500/20" 
          : config.borderColor,
        isDragging && "opacity-50"
      )}
    >
      {/* Header */}
      <div className={cn("px-4 py-3 flex items-center justify-between text-white", config.headerBg)}>
        <div className="flex items-center gap-3">
          <GripVertical className="w-4 h-4 opacity-50" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight">#{order.order_number}</span>
            {order.customer_name && (
              <span className="text-xs font-medium opacity-80">{order.customer_name}</span>
            )}
          </div>
          {isUrgent && (
            <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-semibold">
              URGENT
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 bg-black/20 rounded-lg px-2.5 py-1">
          <Timer className="w-4 h-4" />
          <span className={cn("font-semibold text-sm", isUrgent && "text-red-200")}>{timeElapsed}</span>
        </div>
      </div>

      {/* Items */}
      <div className="p-4 space-y-3">
        {/* Special Instructions - Show prominently */}
        {order.special_instructions && (
          <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              {order.special_instructions}
            </span>
          </div>
        )}

        {order.items?.map((item) => (
          <div key={item.id} className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 border flex items-center justify-center font-bold text-lg">
              {item.quantity}
            </span>
            <div className="flex-1 min-w-0">
              <span className="font-medium block">
                {item.main_dishes?.length ? item.main_dishes.join(" + ") : "Item"}
              </span>
              {(item.sauce_name || item.side_dish) && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {item.sauce_name && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-muted-foreground text-xs">
                      Sauce: {item.sauce_name}
                    </span>
                  )}
                  {item.side_dish && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-muted-foreground text-xs">
                      Side: {item.side_dish}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <div className="px-4 pb-4">
        {status === "new" && onStartCooking && (
          <button
            onClick={onStartCooking}
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Flame className="w-5 h-5" />
            Start Cooking
          </button>
        )}
        {status === "preparing" && onMarkReady && (
          <button
            onClick={onMarkReady}
            className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Check className="w-5 h-5" />
            Mark Out for Delivery
          </button>
        )}
        {status === "out_for_delivery" && onComplete && (
          <button
            onClick={onComplete}
            className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Check className="w-5 h-5" />
            Mark Arrived
          </button>
        )}
      </div>
    </motion.div>
  );
}
