import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RefreshCw, ChefHat, Truck, MapPin, Clock, Bell, CheckCircle2, Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
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

// Auto-refresh interval as backup to realtime (in ms)
const AUTO_REFRESH_INTERVAL = 15000; // 15 seconds

// Status icons
const STATUS_ICONS: Record<OrderStatus, React.ElementType> = {
  new: Bell,
  preparing: ChefHat,
  out_for_delivery: Truck,
  arrived: CheckCircle2,
  cancelled: Clock,
};

// Status colors for large display
const STATUS_BG_COLORS: Record<OrderStatus, string> = {
  new: "bg-blue-500",
  preparing: "bg-amber-500",
  out_for_delivery: "bg-purple-500",
  arrived: "bg-green-500",
  cancelled: "bg-red-500",
};

export default function QueueDisplay() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: allOrders = [], isLoading, refetch } = useAllOrders();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
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

      {/* Ready for Pickup Banner - Show if there are arrived orders */}
      <AnimatePresence>
        {arrivedOrders.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <motion.div 
              className="bg-green-500 px-6 py-4 relative overflow-hidden"
              animate={{ 
                backgroundColor: ['rgb(34, 197, 94)', 'rgb(22, 163, 74)', 'rgb(34, 197, 94)'] 
              }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              {/* Animated background shimmer */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              />
              
              <div className="relative flex items-center justify-center gap-6">
                <motion.div
                  animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <CheckCircle2 className="w-10 h-10 text-white drop-shadow-lg" />
                </motion.div>
                
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white drop-shadow-md">
                    🎉 {arrivedOrders.length === 1 ? 'Order Ready!' : `${arrivedOrders.length} Orders Ready!`}
                  </h2>
                  <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
                    {arrivedOrders.map((order) => {
                      const secondsLeft = getSecondsRemaining(order.id);
                      return (
                        <motion.div
                          key={order.id}
                          initial={{ scale: 0, y: 20 }}
                          animate={{ scale: 1, y: 0 }}
                          className="flex items-center gap-2 bg-white text-green-600 font-bold px-4 py-2 rounded-full shadow-lg"
                        >
                          <span className="text-lg">#{order.order_number}</span>
                          <span className="text-sm font-medium text-green-500">
                            {getFirstName(order.customer_name)}
                          </span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-1">
                            {secondsLeft}s
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
                
                <motion.div
                  animate={{ scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
                >
                  <CheckCircle2 className="w-10 h-10 text-white drop-shadow-lg" />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue Display */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="grid grid-cols-3 gap-4 h-full">
          {QUEUE_STATUSES.map((status) => {
            const orders = ordersByStatus[status];
            const StatusIcon = STATUS_ICONS[status];

            return (
              <div key={status} className="flex flex-col">
                {/* Status Header */}
                <div
                  className={cn(
                    "flex items-center justify-center gap-3 py-4 rounded-t-2xl",
                    STATUS_BG_COLORS[status]
                  )}
                >
                  <StatusIcon className="w-8 h-8 text-white" />
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-white">
                      {ORDER_STATUS_LABELS[status]}
                    </h2>
                    <p className="text-white/80 text-sm">
                      {orders.length} {orders.length !== 1 ? t('queue.orders') : t('queue.order')}
                    </p>
                  </div>
                </div>

                {/* Orders List */}
                <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-b-2xl p-4 overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {orders.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-white/50">
                        <p>{t('queue.noOrders')}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {orders.map((order, index) => (
                          <motion.div
                            key={order.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ delay: index * 0.05 }}
                            className={cn(
                              "bg-white rounded-xl p-4 shadow-lg",
                              status === "arrived" && "border-2 border-green-400"
                            )}
                          >
                            {/* Order Number */}
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className={cn(
                                  "text-2xl font-extrabold",
                                  status === "new"
                                    ? "text-blue-600"
                                    : status === "preparing"
                                    ? "text-amber-600"
                                    : status === "out_for_delivery"
                                    ? "text-purple-600"
                                    : "text-green-600"
                                )}
                              >
                                #{order.order_number}
                              </span>
                              <span className="text-sm text-gray-500">
                                {getTimeSince(order.created_at)}
                              </span>
                            </div>

                            {/* Customer Name (First name only for privacy) */}
                            <p className="text-gray-700 font-medium truncate">
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
