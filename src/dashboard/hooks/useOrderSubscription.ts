import { useEffect } from "react";
import { toast } from "sonner";
import { useOrderRealtime } from "@shared/hooks/useRealtime";
import { useNotificationSound } from "./useNotificationSound";
import type { Order } from "@shared/types/orders";

/**
 * Subscribes to realtime order changes.
 * Shows toast and plays sound on new orders.
 */
export function useOrderSubscription() {
  const { play } = useNotificationSound();

  useOrderRealtime({
    onNewOrder: (raw) => {
      const order = raw as unknown as Order;
      play();
      toast.success(`New Order: ${order.order_number || ""}`, {
        description: `${order.customer_name} — ${order.payment_method}`,
        duration: 10_000,
      });
    },
    onOrderUpdate: (raw) => {
      const order = raw as unknown as Order;
      toast.info(`Order ${order.order_number || ""} updated`, {
        description: `Status: ${order.status}`,
      });
    },
  });
}
