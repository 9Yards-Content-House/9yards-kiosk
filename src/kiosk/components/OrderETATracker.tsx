import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Package,
  Bell,
  Loader2,
  ArrowLeft,
} from "lucide-react";

type OrderStatus = "pending" | "preparing" | "out_for_delivery" | "arrived";

interface OrderETATrackerProps {
  orderNumber: string;
  initialStatus?: OrderStatus;
  estimatedMinutes?: number;
  onBack?: () => void;
}

const STATUS_STEPS = [
  { key: "pending", label: "Order Received", icon: CheckCircle2 },
  { key: "preparing", label: "Being Prepared", icon: ChefHat },
  { key: "out_for_delivery", label: "Ready for Pickup", icon: Package },
];

const STATUS_MESSAGES: Record<OrderStatus, { title: string; subtitle: string }> = {
  pending: {
    title: "Order Received!",
    subtitle: "Your order is in the queue",
  },
  preparing: {
    title: "Cooking in Progress",
    subtitle: "Our chefs are preparing your food",
  },
  out_for_delivery: {
    title: "Order Ready!",
    subtitle: "Please collect your order at the counter",
  },
  arrived: {
    title: "Order Completed",
    subtitle: "Thank you for ordering with us!",
  },
};

export default function OrderETATracker({
  orderNumber,
  initialStatus = "pending",
  estimatedMinutes = 10,
  onBack,
}: OrderETATrackerProps) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [remainingMinutes, setRemainingMinutes] = useState(estimatedMinutes);
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);

  // Demo: Auto-progress status for demonstration
  useEffect(() => {
    // In production, this would be real-time subscription to order status
    const progressDemo = setTimeout(() => {
      if (status === "pending") {
        setStatus("preparing");
        setRemainingMinutes(Math.ceil(estimatedMinutes * 0.6));
      } else if (status === "preparing" && remainingMinutes <= 2) {
        setStatus("out_for_delivery");
        setRemainingMinutes(0);
      }
    }, 15000);

    return () => clearTimeout(progressDemo);
  }, [status, remainingMinutes, estimatedMinutes]);

  // Countdown timer
  useEffect(() => {
    if (status === "out_for_delivery" || status === "arrived") return;

    const timer = setInterval(() => {
      setRemainingMinutes((prev) => Math.max(0, prev - 1 / 60));
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === status);
  const statusInfo = STATUS_MESSAGES[status];

  const formatTime = (minutes: number) => {
    if (minutes < 1) return "< 1 min";
    const mins = Math.floor(minutes);
    const secs = Math.floor((minutes - mins) * 60);
    if (secs > 0 && mins < 5) {
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins} min`;
  };

  const enableNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setIsNotificationEnabled(true);
      }
    } catch {
      // Notifications not supported
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-6">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Menu</span>
        </button>
      )}

      <div className="max-w-lg mx-auto">
        {/* Order Number Badge */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="inline-block bg-primary text-white px-6 py-3 rounded-2xl shadow-lg mb-4">
            <p className="text-sm opacity-80">Order Number</p>
            <p className="text-4xl font-bold">{orderNumber}</p>
          </div>
        </motion.div>

        {/* Status Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-xl p-8 mb-6"
        >
          {/* Status Icon & Message */}
          <div className="text-center mb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={status}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="mb-4"
              >
                {status === "out_for_delivery" ? (
                  <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-green-600" />
                  </div>
                ) : status === "preparing" ? (
                  <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center relative">
                    <ChefHat className="w-12 h-12 text-blue-600" />
                    <motion.div
                      className="absolute inset-0 rounded-full border-4 border-blue-400 border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
                    <Clock className="w-12 h-12 text-amber-600" />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">{statusInfo.title}</h2>
            <p className="text-gray-500">{statusInfo.subtitle}</p>
          </div>

          {/* ETA Display */}
          {status !== "out_for_delivery" && status !== "arrived" && (
            <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-center">
              <p className="text-sm text-gray-500 mb-1">Estimated Wait Time</p>
              <div className="flex items-center justify-center gap-2">
                <motion.span
                  key={remainingMinutes}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-5xl font-bold text-primary"
                >
                  {formatTime(remainingMinutes)}
                </motion.span>
              </div>
            </div>
          )}

          {/* Progress Steps */}
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
            <motion.div
              className="absolute left-6 top-0 w-0.5 bg-secondary"
              initial={{ height: 0 }}
              animate={{
                height: `${((currentStepIndex + 1) / STATUS_STEPS.length) * 100}%`,
              }}
              transition={{ duration: 0.5 }}
            />

            {/* Steps */}
            <div className="space-y-6">
              {STATUS_STEPS.map((step, idx) => {
                const isCompleted = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const Icon = step.icon;

                return (
                  <motion.div
                    key={step.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-4 relative z-10"
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? "bg-secondary text-white"
                          : "bg-gray-100 text-gray-400"
                      } ${isCurrent ? "ring-4 ring-secondary/20" : ""}`}
                    >
                      {isCurrent && status !== "out_for_delivery" ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`font-semibold ${
                          isCompleted ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
                        {step.label}
                      </p>
                      {isCurrent && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-sm text-secondary"
                        >
                          In progress...
                        </motion.p>
                      )}
                    </div>
                    {isCompleted && !isCurrent && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Notification Toggle */}
        {status !== "out_for_delivery" && status !== "arrived" && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-4"
          >
            {isNotificationEnabled ? (
              <div className="flex items-center gap-3 text-green-600">
                <Bell className="w-5 h-5" />
                <span className="font-medium">We'll notify you when ready!</span>
              </div>
            ) : (
              <button
                onClick={enableNotifications}
                className="w-full flex items-center justify-center gap-2 py-3 text-primary font-semibold hover:bg-primary/5 rounded-xl transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span>Notify me when ready</span>
              </button>
            )}
          </motion.div>
        )}

        {/* Ready CTA */}
        {status === "out_for_delivery" && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-green-500 text-white rounded-2xl p-6 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Bell className="w-6 h-6" />
              <span className="text-xl font-bold">Your Order is Ready!</span>
            </div>
            <p className="opacity-90">Please proceed to the counter to collect your order</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
