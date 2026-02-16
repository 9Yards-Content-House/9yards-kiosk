import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RefreshCw, Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { useAllOrders, useOrdersRealtime } from "@shared/hooks/useOrders";
import { ORDER_STATUS_LABELS } from "@shared/types/orders";
import { useTranslation } from "@shared/context/LanguageContext";
import type { Order, OrderStatus } from "@shared/types/orders";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import { useSound } from "../hooks/useSound";

// Only show orders that are in progress - exclude "arrived" as they get auto-removed
const QUEUE_STATUSES: OrderStatus[] = ["new", "preparing", "out_for_delivery"];

// Status for ready orders (shown in a special "Ready" column)
const READY_STATUS: OrderStatus = "arrived";

// How long to show "arrived" orders before auto-removing (in ms)
const ARRIVED_DISPLAY_DURATION = 60000; // 60 seconds (industry standard)

// How long to show the ready banner before auto-dismiss (in ms)
const READY_BANNER_DURATION = 8000; // 8 seconds

// Auto-refresh interval as backup to realtime (in ms)
const AUTO_REFRESH_INTERVAL = 15000; // 15 seconds

// Simplified status colors - professional blue/purple theme
const STATUS_HEADER_COLORS: Record<OrderStatus, string> = {
  new: "bg-blue-600",
  preparing: "bg-indigo-600",
  out_for_delivery: "bg-violet-600",
  arrived: "bg-emerald-600",
  cancelled: "bg-gray-600",
};

const STATUS_TEXT_COLORS: Record<OrderStatus, string> = {
  new: "text-blue-600",
  preparing: "text-indigo-600",
  out_for_delivery: "text-violet-600",
  arrived: "text-emerald-600",
  cancelled: "text-gray-600",
};

export default function QueueDisplay() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: allOrders = [], isLoading, refetch } = useAllOrders();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showReadyBanner, setShowReadyBanner] = useState(false);
  const { play } = useSound();
  
  // Track which arrived orders we've already notified about
  const notifiedOrdersRef = useRef<Set<string>>(new Set());
  // Track when orders arrived to auto-remove them
  const [arrivedTimestamps, setArrivedTimestamps] = useState<Record<string, number>>({});

  // Subscribe to realtime updates
  useOrdersRealtime();

  // Auto-refresh as backup to realtime
  useEffect(() => {
    const interval = setInterval(() => {
      refetch().then(() => setLastRefresh(new Date()));
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [refetch]);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Filter and group orders by status
  const { ordersByStatus, arrivedOrders } = useMemo(() => {
    const grouped: Record<OrderStatus, Order[]> = {
      new: [],
      preparing: [],
      out_for_delivery: [],
      arrived: [],
      cancelled: [],
    };

    // Only show orders from today for queue display
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = Date.now();

    allOrders
      .filter((order) => {
        const orderDate = new Date(order.created_at);
        return orderDate >= today;
      })
      .forEach((order) => {
        // For arrived orders, check if they should still be shown
        if (order.status === READY_STATUS) {
          const arrivedAt = arrivedTimestamps[order.id];
          // If we haven't tracked when it arrived, it's still visible
          // If it arrived less than ARRIVED_DISPLAY_DURATION ago, show it
          if (!arrivedAt || (now - arrivedAt) < ARRIVED_DISPLAY_DURATION) {
            grouped[order.status].push(order);
          }
        } else if (QUEUE_STATUSES.includes(order.status)) {
          grouped[order.status].push(order);
        }
      });

    // Sort each group by created_at (oldest first)
    Object.keys(grouped).forEach((status) => {
      grouped[status as OrderStatus].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    return { 
      ordersByStatus: grouped, 
      arrivedOrders: grouped.arrived 
    };
  }, [allOrders, arrivedTimestamps]);

  // Track newly arrived orders and play sound
  useEffect(() => {
    const now = Date.now();
    const newArrivedTimestamps = { ...arrivedTimestamps };
    let hasNewArrivals = false;

    allOrders.forEach((order) => {
      if (order.status === READY_STATUS) {
        // If this order just became "arrived" and we haven't notified
        if (!notifiedOrdersRef.current.has(order.id)) {
          notifiedOrdersRef.current.add(order.id);
          hasNewArrivals = true;
          // Record when this order arrived
          if (!newArrivedTimestamps[order.id]) {
            newArrivedTimestamps[order.id] = now;
          }
        }
      }
    });

    // Update timestamps if there are new arrivals
    if (Object.keys(newArrivedTimestamps).length !== Object.keys(arrivedTimestamps).length) {
      setArrivedTimestamps(newArrivedTimestamps);
    }

    // Play notification sound for new arrivals
    if (hasNewArrivals && soundEnabled) {
      play('success');
      // Show ready banner briefly
      setShowReadyBanner(true);
      setTimeout(() => setShowReadyBanner(false), READY_BANNER_DURATION);
    }
  }, [allOrders, arrivedTimestamps, soundEnabled, play]);

  // Countdown timer state - updates every second
  const [countdownTick, setCountdownTick] = useState(0);

  // Auto-remove arrived orders after timeout + update countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      // Trigger re-render for countdown display
      setCountdownTick((t) => t + 1);
      
      setArrivedTimestamps((prev) => {
        const updated = { ...prev };
        let changed = false;
        Object.entries(updated).forEach(([orderId, timestamp]) => {
          if (now - timestamp >= ARRIVED_DISPLAY_DURATION) {
            delete updated[orderId];
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    }, 1000); // Check every second for smooth countdown
    return () => clearInterval(interval);
  }, []);

  // Calculate seconds remaining for an arrived order
  const getSecondsRemaining = useCallback((orderId: string) => {
    const arrivedAt = arrivedTimestamps[orderId];
    if (!arrivedAt) return ARRIVED_DISPLAY_DURATION / 1000;
    const elapsed = Date.now() - arrivedAt;
    const remaining = Math.max(0, Math.ceil((ARRIVED_DISPLAY_DURATION - elapsed) / 1000));
    return remaining;
  }, [arrivedTimestamps, countdownTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get first name only for privacy
  const getFirstName = (fullName: string) => {
    return fullName.split(" ")[0];
  };

  // Calculate time since order was placed
  const getTimeSince = (createdAt: string) => {
    const orderTime = new Date(createdAt);
    const diffMs = currentTime.getTime() - orderTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return t('queue.justNow');
    if (diffMins === 1) return t('queue.min');
    return `${diffMins} ${t('queue.mins')}`;
  };

  const handleBackToOrder = () => {
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="kiosk-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#212282] to-[#1a1a6c]">
        <RefreshCw className="w-12 h-12 text-white animate-spin" />
        <p className="text-white text-xl mt-4">{t('queue.loading')}</p>
      </div>
    );
  }

  return (
    <div className="kiosk-screen flex flex-col bg-gradient-to-b from-[#212282] to-[#1a1a6c]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Button
          variant="ghost"
          className="text-white hover:bg-white/10"
          onClick={handleBackToOrder}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          {t('queue.backToOrder')}
        </Button>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">{t('queue.title')}</h1>
          <p className="text-white/50 text-xs">
            Updated {lastRefresh.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute notifications" : "Enable notifications"}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => refetch().then(() => setLastRefresh(new Date()))}
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Ready for Pickup Banner - Show briefly when orders become ready */}
      <AnimatePresence>
        {showReadyBanner && arrivedOrders.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-emerald-600 px-6 py-3">
              <div className="flex items-center justify-center gap-4">
                <span className="text-lg font-bold text-white">
                  {arrivedOrders.length === 1 ? 'Order Ready' : `${arrivedOrders.length} Orders Ready`}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {arrivedOrders.slice(0, 3).map((order) => (
                    <span
                      key={order.id}
                      className="bg-white text-emerald-700 font-bold px-3 py-1 rounded-full text-sm"
                    >
                      #{order.order_number} - {getFirstName(order.customer_name)}
                    </span>
                  ))}
                  {arrivedOrders.length > 3 && (
                    <span className="text-white/80 text-sm">+{arrivedOrders.length - 3} more</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue Display */}
      <div className="flex-1 p-4 min-h-0">
        <div className="grid grid-cols-3 gap-4 h-full">
          {QUEUE_STATUSES.map((status) => {
            const orders = ordersByStatus[status];

            return (
              <div key={status} className="flex flex-col min-h-0">
                {/* Status Header - Clean, no icons */}
                <div
                  className={cn(
                    "flex items-center justify-center py-3 rounded-t-xl",
                    STATUS_HEADER_COLORS[status]
                  )}
                >
                  <div className="text-center">
                    <h2 className="text-lg font-bold text-white">
                      {ORDER_STATUS_LABELS[status]}
                    </h2>
                    <p className="text-white/80 text-sm">
                      {orders.length} {orders.length !== 1 ? t('queue.orders') : t('queue.order')}
                    </p>
                  </div>
                </div>

                {/* Orders List - Fixed scrolling */}
                <div className="flex-1 bg-slate-800/50 rounded-b-xl p-3 overflow-y-auto min-h-0">
                  <AnimatePresence mode="popLayout">
                    {orders.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-white/40">
                        <p className="text-sm">{t('queue.noOrders')}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {orders.map((order, index) => (
                          <motion.div
                            key={order.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: index * 0.03 }}
                            className="bg-white rounded-lg p-3 shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  "text-xl font-bold",
                                  STATUS_TEXT_COLORS[status]
                                )}
                              >
                                #{order.order_number}
                              </span>
                              <span className="text-xs text-gray-400">
                                {getTimeSince(order.created_at)}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm truncate mt-1">
                              {getFirstName(order.customer_name)}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-black/20">
        <div className="flex items-center gap-4">
          <img
            src="/images/logo/9Yards-Food-White-Logo-colored.png"
            alt="9Yards"
            className="h-6"
          />
          <span className="text-white/50 text-sm">
            {QUEUE_STATUSES.reduce((sum, status) => sum + ordersByStatus[status].length, 0)} orders in queue
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/40 text-xs flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
            Auto-refreshing
          </span>
          <p className="text-white/60 text-sm font-medium">
            {currentTime.toLocaleTimeString("en-UG", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
