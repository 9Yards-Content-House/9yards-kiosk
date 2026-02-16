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

// Show all statuses as columns
const QUEUE_STATUSES: OrderStatus[] = ["new", "preparing", "out_for_delivery", "arrived"];

// How long to show "arrived" orders before auto-removing (in ms)
const ARRIVED_DISPLAY_DURATION = 60000; // 60 seconds (industry standard)

// How long to show the ready banner before auto-dismiss (in ms)
const READY_BANNER_DURATION = 8000; // 8 seconds

// Auto-refresh interval as backup to realtime (in ms)
const AUTO_REFRESH_INTERVAL = 15000; // 15 seconds

// Single professional header color - matches app theme
const STATUS_HEADER_BG = "bg-[#212282]";

// Text color for order numbers
const ORDER_NUMBER_COLOR = "text-[#212282]";

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
  // Flag to prevent notifications on first load
  const isInitialLoad = useRef(true);
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
        if (order.status === "arrived") {
          const arrivedAt = arrivedTimestamps[order.id];
          if (!arrivedAt || (now - arrivedAt) < ARRIVED_DISPLAY_DURATION) {
            grouped[order.status].push(order);
          }
        } else if (QUEUE_STATUSES.includes(order.status)) {
          grouped[order.status].push(order);
        }
      });

    // Sort each group
    Object.keys(grouped).forEach((status) => {
      grouped[status as OrderStatus].sort(
        (a, b) => {
          const timeA = new Date(a.created_at).getTime();
          const timeB = new Date(b.created_at).getTime();
          
          // Latest first for "New" column as requested
          if (status === "new") return timeB - timeA;
          
          // Oldest first for preparing/delivery to show the queue order
          return timeA - timeB;
        }
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
      if (order.status === "arrived") {
        // Record when this order arrived if not already tracked
        if (!newArrivedTimestamps[order.id]) {
          newArrivedTimestamps[order.id] = now;
        }

        // Handle notifications
        if (!notifiedOrdersRef.current.has(order.id)) {
          notifiedOrdersRef.current.add(order.id);
          
          // Only trigger sound if it's NOT the first time we see these orders
          if (!isInitialLoad.current) {
            hasNewArrivals = true;
          }
        }
      }
    });

    // Mark initial load as complete after first check
    if (allOrders.length > 0 || !isLoading) {
      isInitialLoad.current = false;
    }

    // Update timestamps if there are new arrivals
    if (Object.keys(newArrivedTimestamps).length !== Object.keys(arrivedTimestamps).length) {
      setArrivedTimestamps(newArrivedTimestamps);
    }

    // Play notification sound for new arrivals
    if (hasNewArrivals && soundEnabled) {
      play('success');
    }
  }, [allOrders, arrivedTimestamps, soundEnabled, play, isLoading]);

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
      <div className="kiosk-screen flex flex-col items-center justify-center bg-[#f5f5f0]">
        <RefreshCw className="w-12 h-12 text-[#212282] animate-spin" />
        <p className="text-[#212282] text-xl mt-4">{t('queue.loading')}</p>
      </div>
    );
  }

  return (
    <div className="kiosk-screen flex flex-col bg-[#f5f5f0]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#212282]">
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

      {/* Queue Display */}
      <div className="flex-1 p-4 min-h-0">
        <div 
          className="grid grid-cols-4 gap-4 h-full"
        >
          {QUEUE_STATUSES.map((status) => {
            const orders = (status === 'arrived' ? arrivedOrders : ordersByStatus[status]);

            return (
              <div key={status} className="flex flex-col min-h-0">
                {/* Status Header */}
                <div
                  className={cn(
                    "flex items-center justify-center py-3 rounded-t-xl shadow-sm",
                    status === 'arrived' ? "bg-emerald-600" : STATUS_HEADER_BG
                  )}
                >
                  <div className="text-center">
                    <h2 className="text-lg font-bold text-white tracking-wide uppercase">
                      {status === 'arrived' ? 'Ready for Collection' : ORDER_STATUS_LABELS[status]}
                    </h2>
                    <p className="text-white/80 text-xs font-medium">
                      {orders.length} {orders.length !== 1 ? t('queue.orders') : t('queue.order')}
                    </p>
                  </div>
                </div>

                {/* Orders List */}
                <div className={cn(
                  "flex-1 rounded-b-xl p-3 overflow-y-auto min-h-0 border border-t-0 shadow-sm",
                  status === 'arrived' ? "bg-emerald-50 border-emerald-100" : "bg-white border-gray-200"
                )}>
                  <AnimatePresence mode="popLayout">
                    {orders.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center h-full text-center p-6"
                      >
                        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-2">
                          <RefreshCw className="w-5 h-5 text-gray-200" />
                        </div>
                        <p className="text-sm text-gray-400 italic">{t('queue.noOrders')}</p>
                      </motion.div>
                    ) : (
                      <div className="space-y-3">
                        {orders.map((order) => (
                          <motion.div
                            key={order.id}
                            layoutId={`order-${order.id}`}
                            layout="position"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={cn(
                              "rounded-xl p-4 border flex flex-col gap-2 relative overflow-hidden shadow-sm",
                              status === 'arrived' 
                                ? "bg-white border-emerald-200 border-b-4 border-b-emerald-400" 
                                : "bg-gray-50 border-gray-100"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className={cn(
                                "text-2xl font-black tabular-nums", 
                                status === 'arrived' ? "text-emerald-700" : ORDER_NUMBER_COLOR
                              )}>
                                #{order.order_number}
                              </span>
                              {status === 'arrived' ? (
                                <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                                  <RefreshCw className="w-2 h-2 animate-spin" /> {getSecondsRemaining(order.id)}s
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white/80 px-2 py-1 rounded-lg">
                                  {getTimeSince(order.created_at)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <p className={cn(
                                "font-bold text-lg uppercase tracking-tight",
                                status === 'arrived' ? "text-emerald-900" : "text-gray-900"
                              )}>
                                {getFirstName(order.customer_name)}
                              </p>
                              {(order.is_priority || order.special_instructions?.toLowerCase().includes('priority')) && (
                                <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1 border border-amber-200">
                                  Priority
                                </span>
                              )}
                            </div>
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
      <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <img
            src="/images/logo/9Yards-Food-White-Logo-colored.png"
            alt="9Yards Food"
            className="h-8 object-contain"
          />
          <div className="h-4 w-px bg-gray-200" />
          <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">
            {QUEUE_STATUSES.reduce((sum, status) => sum + ordersByStatus[status].length, 0)} {t('queue.ordersInQueue')}
          </span>
        </div>
        <div className="flex items-center gap-8">
          <span className="text-gray-400 text-xs flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
            {t('queue.autoRefreshing')}
          </span>
          <p className="text-gray-600 text-sm font-medium">
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
