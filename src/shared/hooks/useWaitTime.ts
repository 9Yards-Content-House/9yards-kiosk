import { useQuery } from '@tanstack/react-query';
import { supabase } from '@shared/lib/supabase';

interface WaitTimeData {
  estimatedMinutes: number;
  ordersAhead: number;
  averagePrepTime: number;
}

/**
 * Hook to calculate wait time estimation based on current queue
 * and historical average prep time
 */
export function useWaitTime() {
  return useQuery<WaitTimeData>({
    queryKey: ['waitTime'],
    queryFn: async () => {
      // Get pending orders count
      const { count: ordersAhead } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new', 'preparing']);

      // Calculate average prep time from recent orders
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('created_at, ready_at')
        .not('ready_at', 'is', null)
        .order('ready_at', { ascending: false })
        .limit(50);

      let averagePrepTime = 10; // Default 10 minutes

      if (recentOrders && recentOrders.length > 0) {
        const totalMinutes = recentOrders.reduce((sum, order) => {
          const created = new Date(order.created_at);
          const ready = new Date(order.ready_at);
          const diffMinutes = (ready.getTime() - created.getTime()) / (1000 * 60);
          return sum + diffMinutes;
        }, 0);
        averagePrepTime = Math.round(totalMinutes / recentOrders.length);
      }

      const estimatedMinutes = (ordersAhead || 0) * averagePrepTime;

      return {
        estimatedMinutes: Math.max(5, estimatedMinutes), // Minimum 5 minutes
        ordersAhead: ordersAhead || 0,
        averagePrepTime,
      };
    },
    staleTime: 30000, // Refresh every 30 seconds
    refetchInterval: 30000,
  });
}

/**
 * Format wait time for display
 */
export function formatWaitTime(minutes: number): string {
  if (minutes < 5) return '~5 min';
  if (minutes < 60) return `~${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  if (remainingMinutes === 0) return `~${hours}h`;
  return `~${hours}h ${remainingMinutes}min`;
}

export default useWaitTime;
