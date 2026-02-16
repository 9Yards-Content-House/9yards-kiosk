import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RefreshCw, Maximize2, Minimize2, Volume2, VolumeX, User, Package, Clock } from "lucide-react";
import { useAllOrders, useOrdersRealtime } from "@shared/hooks/useOrders";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@shared/types/orders";
import { useTranslation } from "@shared/context/LanguageContext";
import type { Order, OrderStatus } from "@shared/types/orders";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import { useSound } from "../hooks/useSound";

// Show all statuses as columns
const QUEUE_STATUSES: OrderStatus[] = ["new", "preparing", "out_for_delivery", "arrived"];


// How long to show the ready banner before auto-dismiss (in ms)
const READY_BANNER_DURATION = 8000; // 8 seconds

// Auto-refresh interval as backup to realtime (in ms)
const AUTO_REFRESH_INTERVAL = 15000; // 15 seconds

// Status-specific colors (Dashboard aligned)
const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500",
  preparing: "bg-amber-500", // matches dashboard yellow
  out_for_delivery: "bg-green-500",
  arrived: "bg-emerald-500",
};

// Text color for order numbers
const ORDER_NUMBER_COLOR = "text-gray-900";
const STATUS_HEADER_TEXT = "text-gray-900";
const QUEUE_BG = "bg-[#f8fafc]"; // Slightly lighter, cleaner background

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
        if (QUEUE_STATUSES.includes(order.status)) {
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
  }, [allOrders]);

  // Track newly arrived orders and play sound
  useEffect(() => {
    let hasNewArrivals = false;

    allOrders.forEach((order) => {
      if (order.status === "arrived") {
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

    // Play notification sound for new arrivals
    if (hasNewArrivals && soundEnabled) {
      play('success');
    }
  }, [allOrders, soundEnabled, play, isLoading]);



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
    <div className="kiosk-screen flex flex-col bg-[#f8fafc]">
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
        <div className="text-center flex-1 mx-4">
          <h1 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight">{t('queue.title')}</h1>
          <p className="text-white/50 text-[10px] uppercase font-bold tracking-widest mt-0.5">
            {t('queue.updated')} {lastRefresh.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })}
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
      <div className="flex-1 p-3 md:p-6 overflow-y-auto lg:overflow-hidden min-h-0">
        <div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 h-full"
        >
          {QUEUE_STATUSES.map((status) => {
            const orders = (status === 'arrived' ? arrivedOrders : ordersByStatus[status]);

            return (
              <div key={status} className="flex flex-col min-h-[300px] lg:min-h-0">
                {/* Status Header */}
                <div
                  className={cn(
                    "flex flex-col items-center justify-center py-5 rounded-t-2xl bg-white border-b border-gray-100 shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn("w-3 h-3 rounded-full", STATUS_COLORS[status])} />
                    <h2 className="text-sm font-black tracking-widest uppercase text-gray-900">
                      {status === 'arrived' ? 'READY' : ORDER_STATUS_LABELS[status]}
                    </h2>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {orders.length} {orders.length !== 1 ? t('queue.orders') : t('queue.order')}
                  </p>
                </div>

                {/* Orders List */}
                <div className={cn(
                  "flex-1 rounded-b-2xl p-6 overflow-y-auto min-h-0 border border-gray-100 border-t-0 bg-white/50 backdrop-blur-sm shadow-sm"
                )}>
                  <AnimatePresence mode="popLayout">
                    {orders.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center h-full text-center py-10"
                      >
                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4 transition-colors group-hover:bg-gray-100">
                          <RefreshCw className="w-6 h-6 text-gray-200" />
                        </div>
                        <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">{t('queue.noOrders')}</p>
                      </motion.div>
                    ) : (
                      <div className="flex flex-col gap-6">
                        {orders.map((order) => (
                          <motion.div
                            key={order.id}
                            layoutId={`order-${order.id}`}
                            layout="position"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={cn(
                              "bg-white rounded-2xl border p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col gap-4",
                              status === 'new' && "border-yards-orange/50 shadow-yards-orange/5 ring-1 ring-yards-orange/10",
                              status === 'arrived' && "border-emerald-200 shadow-emerald-50 bg-emerald-50/10"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className={cn(
                                "text-4xl font-black tracking-tighter tabular-nums",
                                status === 'arrived' ? "text-emerald-600" : "text-gray-900"
                              )}>
                                {order.order_number}
                              </span>
                              
                              <div className="flex items-center gap-2 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                                <Clock className="w-3.5 h-3.5" />
                                {getTimeSince(order.created_at)}
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5 text-gray-600">
                                <User className="w-5 h-5 text-gray-400" />
                                <span className="text-xl font-black uppercase tracking-tight">
                                  {getFirstName(order.customer_name)}
                                </span>
                              </div>

                              {(order.is_priority || order.special_instructions?.toLowerCase().includes('priority')) && (
                                <div className="bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase shadow-sm flex items-center gap-1.5">
                                  Priority
                                </div>
                              )}
                            </div>

                            {status === 'arrived' && (
                              <div className="absolute top-0 right-0 p-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                              </div>
                            )}
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
      <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-200 bg-white gap-4">
        <div className="flex items-center gap-4">
          <img
            src="/images/logo/9Yards-Food-White-Logo-colored.png"
            alt="9Yards Food"
            className="h-6 md:h-8 object-contain"
          />
          <div className="hidden sm:block h-4 w-px bg-gray-200" />
          <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest hidden sm:inline">
            {QUEUE_STATUSES.reduce((sum, status) => sum + ordersByStatus[status].length, 0)} {t('queue.ordersInQueue')}
          </span>
        </div>
        <div className="flex items-center gap-6 md:gap-8">
          <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
            {t('queue.live')}
          </span>
          <p className="text-gray-900 text-sm font-black tabular-nums">
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
