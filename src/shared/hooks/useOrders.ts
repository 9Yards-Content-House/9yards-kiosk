import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@shared/lib/supabase";
import type {
  Order,
  OrderStatus,
  CreateOrderPayload,
} from "@shared/types/orders";

/** Fetch a single order by order_number (kiosk confirmation) */
export function useOrderByNumber(orderNumber: string | null) {
  return useQuery<Order | null>({
    queryKey: ["order", orderNumber],
    queryFn: async () => {
      if (!orderNumber) return null;
      const { data, error } = await supabase
        .from("orders")
        .select("*, items:order_items(*)")
        .eq("order_number", orderNumber)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderNumber,
  });
}

/** Fetch orders for dashboard with optional status filter */
export function useOrders(status?: OrderStatus) {
  return useQuery<Order[]>({
    queryKey: ["orders", status],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, items:order_items(*)")
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000, // fallback polling
  });
}

/** Fetch today's orders for the dashboard */
export function useTodaysOrders() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return useQuery<Order[]>({
    queryKey: ["orders", "today"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, items:order_items(*)")
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000,
  });
}

/** Create a new order from the kiosk */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateOrderPayload) => {
      const { items, ...orderData } = payload;

      // Insert order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      const orderItems = items.map((item) => ({
        ...item,
        order_id: order.id,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Re-fetch with items joined
      const { data: fullOrder, error: fetchError } = await supabase
        .from("orders")
        .select("*, items:order_items(*)")
        .eq("id", order.id)
        .single();

      if (fetchError) throw fetchError;
      return fullOrder as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

/** Update order status (dashboard) */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => {
      const updates: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Set timestamp fields based on status
      if (status === "preparing") updates.prepared_at = new Date().toISOString();
      if (status === "ready") updates.ready_at = new Date().toISOString();
      if (status === "delivered") updates.delivered_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", orderId)
        .select("*, items:order_items(*)")
        .single();

      if (error) throw error;
      return data as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

/** Cancel an order */
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
