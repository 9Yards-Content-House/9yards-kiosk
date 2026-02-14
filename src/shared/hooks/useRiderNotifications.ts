import { useEffect, useRef, useCallback } from "react";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import type { Order } from "@shared/types/orders";

interface UseRiderNotificationsOptions {
  /**
   * Called when a new order becomes "ready" for delivery
   */
  onOrderReady?: (order: Order) => void;
  /**
   * Enable audio notification sound
   */
  enableSound?: boolean;
  /**
   * The rider's user ID (optional - if not provided, notifies for all ready orders)
   */
  riderId?: string;
}

/**
 * Hook for realtime rider notifications when orders become ready for pickup.
 * Plays a sound and triggers a callback when new orders are ready.
 */
export function useRiderNotifications(options: UseRiderNotificationsOptions = {}) {
  const { onOrderReady, enableSound = true, riderId } = options;
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seenOrdersRef = useRef<Set<string>>(new Set());

  // Initialize audio
  useEffect(() => {
    if (enableSound && typeof window !== "undefined") {
      audioRef.current = new Audio("/sounds/order-ready.mp3");
      audioRef.current.preload = "auto";
    }
  }, [enableSound]);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((e) => {
        console.warn("Could not play notification sound:", e);
      });
    }
  }, []);

  const handleOrderReady = useCallback((order: Order) => {
    // Skip if we've already seen this order
    if (seenOrdersRef.current.has(order.id)) {
      return;
    }
    
    // If riderId is specified, only notify for assigned orders
    if (riderId && order.rider_id !== riderId) {
      return;
    }
    
    seenOrdersRef.current.add(order.id);
    
    // Play sound
    if (enableSound) {
      playNotificationSound();
    }
    
    // Browser notification if supported and permitted
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Order Ready for Pickup!", {
        body: `Order ${order.order_number} is ready`,
        icon: "/icons/icon-192x192.png",
        tag: `order-${order.id}`,
        requireInteraction: true,
      });
    }
    
    // Trigger callback
    onOrderReady?.(order);
  }, [riderId, enableSound, playNotificationSound, onOrderReady]);

  // Subscribe to order status changes
  useEffect(() => {
    if (USE_MOCK_DATA) {
      console.log("📦 Mock mode: Rider notifications disabled");
      return;
    }

    console.log("🔔 Setting up rider order notifications...");

    const channel = supabase
      .channel("rider-ready-orders")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: "status=eq.out_for_delivery",
        },
        (payload) => {
          const newOrder = payload.new as Order;
          const oldOrder = payload.old as Partial<Order>;
          
          // Only notify on transition to "out_for_delivery" status
          if (newOrder.status === "out_for_delivery" && oldOrder.status !== "out_for_delivery") {
            console.log("🔔 Order ready for pickup:", newOrder.order_number);
            handleOrderReady(newOrder);
            queryClient.invalidateQueries({ queryKey: ["orders"] });
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 Rider notifications subscription:", status);
      });

    return () => {
      console.log("🔌 Cleaning up rider notifications");
      supabase.removeChannel(channel);
    };
  }, [handleOrderReady, queryClient]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return {
    playNotificationSound,
  };
}

/**
 * Hook for listening to ready orders count (for UI badge)
 */
export function useReadyOrdersCount() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (USE_MOCK_DATA) return;

    const channel = supabase
      .channel("ready-orders-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["orders", "ready-count"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
