import { useQuery } from "@tanstack/react-query";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";

// Average prep times in minutes by order type
const BASE_PREP_TIME_MINUTES = 15;
// Reserved for future use: per-item-type time calculation
const _TIME_PER_COMBO = 8;
const _TIME_PER_INDIVIDUAL = 3;

interface EstimatedWaitResult {
  /** Estimated wait time in minutes */
  minutes: number;
  /** Number of orders ahead in queue */
  ordersAhead: number;
  /** Formatted string like "15-20 min" */
  formatted: string;
  /** Confidence level: "high" if based on actual data, "low" if estimated */
  confidence: "high" | "low";
}

/**
 * Hook to get estimated wait time for new orders.
 * Calculates based on current queue and average preparation time.
 */
export function useEstimatedWaitTime(): {
  data: EstimatedWaitResult | null;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ["estimated-wait-time"],
    queryFn: async (): Promise<EstimatedWaitResult> => {
      if (USE_MOCK_DATA) {
        // Mock: simulate 2-4 orders ahead
        const ordersAhead = Math.floor(Math.random() * 3) + 2;
        const minutes = BASE_PREP_TIME_MINUTES + ordersAhead * 5;
        return {
          minutes,
          ordersAhead,
          formatted: formatWaitTime(minutes),
          confidence: "low",
        };
      }

      // Get count of orders in "new" and "preparing" status
      const { data: queueData, error: queueError } = await supabase
        .from("orders")
        .select("id, status, created_at")
        .in("status", ["new", "preparing"])
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (queueError) {
        console.warn("Failed to fetch queue:", queueError);
        return {
          minutes: BASE_PREP_TIME_MINUTES,
          ordersAhead: 0,
          formatted: formatWaitTime(BASE_PREP_TIME_MINUTES),
          confidence: "low",
        };
      }

      const ordersAhead = queueData?.length || 0;

      // Get recent completed orders to calculate average prep time
      const { data: completedOrders, error: completedError } = await supabase
        .from("orders")
        .select("created_at, prepared_at, ready_at")
        .eq("status", "ready")
        .gte("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .not("ready_at", "is", null)
        .limit(20);

      let avgPrepTime = BASE_PREP_TIME_MINUTES;
      let confidence: "high" | "low" = "low";

      if (!completedError && completedOrders && completedOrders.length >= 3) {
        // Calculate average time from created to ready
        const prepTimes = completedOrders
          .filter((o) => o.ready_at && o.created_at)
          .map((o) => {
            const created = new Date(o.created_at).getTime();
            const ready = new Date(o.ready_at).getTime();
            return (ready - created) / (1000 * 60); // Convert to minutes
          })
          .filter((t) => t > 0 && t < 120); // Filter outliers

        if (prepTimes.length > 0) {
          avgPrepTime = prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length;
          confidence = "high";
        }
      }

      // Calculate estimated wait
      // Base time + (orders ahead * avg time per order)
      const estimatedMinutes = Math.ceil(avgPrepTime + ordersAhead * (avgPrepTime / 3));

      return {
        minutes: estimatedMinutes,
        ordersAhead,
        formatted: formatWaitTime(estimatedMinutes),
        confidence,
      };
    },
    staleTime: 60_000, // 1 minute
    refetchInterval: 60_000, // Refresh every minute
  });

  return { data: data ?? null, isLoading };
}

/**
 * Calculate estimated wait time for a specific order based on its position in queue
 */
export function useOrderEstimatedTime(orderId: string | undefined) {
  return useQuery({
    queryKey: ["order-wait-time", orderId],
    queryFn: async () => {
      if (!orderId || USE_MOCK_DATA) {
        return {
          minutes: Math.floor(Math.random() * 10) + 10,
          formatted: "10-15 min",
        };
      }

      // Get the order's position in queue
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, status, created_at")
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        return null;
      }

      // If already ready or delivered, no wait
      if (order.status === "ready" || order.status === "delivered") {
        return { minutes: 0, formatted: "Ready!" };
      }

      // Count orders created before this one that are still pending
      const { data: ordersAhead, error: aheadError } = await supabase
        .from("orders")
        .select("id")
        .in("status", ["new", "preparing"])
        .lt("created_at", order.created_at);

      if (aheadError) {
        return { minutes: 15, formatted: "~15 min" };
      }

      const position = (ordersAhead?.length || 0) + 1;
      const estimatedMinutes = Math.ceil(BASE_PREP_TIME_MINUTES + (position - 1) * 5);

      return {
        minutes: estimatedMinutes,
        formatted: formatWaitTime(estimatedMinutes),
        position,
      };
    },
    enabled: !!orderId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

/**
 * Format wait time into a user-friendly range string
 */
function formatWaitTime(minutes: number): string {
  if (minutes <= 0) return "Ready!";
  if (minutes <= 5) return "~5 min";
  if (minutes <= 10) return "5-10 min";
  if (minutes <= 15) return "10-15 min";
  if (minutes <= 20) return "15-20 min";
  if (minutes <= 30) return "20-30 min";
  if (minutes <= 45) return "30-45 min";
  return "45+ min";
}
