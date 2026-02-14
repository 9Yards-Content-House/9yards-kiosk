import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RefreshCw, ChefHat, Truck, MapPin, Clock, Bell } from "lucide-react";
import { useAllOrders, useOrdersRealtime } from "@shared/hooks/useOrders";
import { ORDER_STATUS_LABELS } from "@shared/types/orders";
import { useTranslation } from "@shared/context/LanguageContext";
import type { Order, OrderStatus } from "@shared/types/orders";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";

// Show all active statuses on queue display (including 'new' so customers see their order immediately)
const QUEUE_STATUSES: OrderStatus[] = ["new", "preparing", "out_for_delivery", "arrived"];

// Status icons
const STATUS_ICONS: Record<OrderStatus, React.ElementType> = {
  new: Bell,
  preparing: ChefHat,
  out_for_delivery: Truck,
  arrived: MapPin,
  cancelled: Clock,
};

// Status colors for large display
const STATUS_BG_COLORS: Record<OrderStatus, string> = {
  new: "bg-blue-500",
  preparing: "bg-yellow-500",
  out_for_delivery: "bg-purple-500",
  arrived: "bg-green-500",
  cancelled: "bg-red-500",
};

export default function QueueDisplay() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: allOrders = [], isLoading, refetch } = useAllOrders();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Subscribe to realtime updates
  useOrdersRealtime();

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Filter and group orders by status
  const ordersByStatus = useMemo(() => {
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

    allOrders
      .filter((order) => {
        const orderDate = new Date(order.created_at);
        return orderDate >= today && QUEUE_STATUSES.includes(order.status);
      })
      .forEach((order) => {
        grouped[order.status].push(order);
      });

    // Sort each group by created_at (oldest first)
    Object.keys(grouped).forEach((status) => {
      grouped[status as OrderStatus].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    return grouped;
  }, [allOrders]);

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
        <h1 className="text-2xl font-bold text-white">{t('queue.title')}</h1>
        <Button
          variant="ghost"
          className="text-white hover:bg-white/10"
          onClick={() => refetch()}
        >
          <RefreshCw className="w-5 h-5" />
        </Button>
      </div>

      {/* Queue Display */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="grid grid-cols-4 gap-4 h-full">
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
                                    ? "text-yellow-600"
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
        <div className="flex items-center gap-2 text-white/60">
          <img
            src="/images/logo/9Yards-Food-White-Logo-colored.png"
            alt="9Yards"
            className="h-6"
          />
        </div>
        <p className="text-white/60 text-sm">
          {currentTime.toLocaleTimeString("en-UG", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
