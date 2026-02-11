import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@shared/lib/supabase";
import type {
  Order,
  OrderStatus,
  CreateOrderPayload,
} from "@shared/types/orders";

// Mock orders for development/testing
const MOCK_ORDERS: Order[] = [
  {
    id: "order-1",
    order_number: "9Y-001",
    status: "new",
    customer_name: "John Doe",
    customer_phone: "+256700111222",
    customer_location: "Office 201, Block A",
    payment_method: "cash",
    payment_status: "pending",
    momo_transaction_id: null,
    subtotal: 35000,
    total: 35000,
    special_instructions: "Extra spicy please",
    source: "kiosk",
    created_at: new Date(Date.now() - 5 * 60000).toISOString(), // 5 mins ago
    updated_at: new Date(Date.now() - 5 * 60000).toISOString(),
    prepared_at: null,
    ready_at: null,
    delivered_at: null,
    items: [
      { id: "item-1", order_id: "order-1", type: "combo", main_dishes: ["Posho", "Rice"], sauce_name: "Groundnut Sauce", sauce_preparation: "Mild", sauce_size: "Regular", side_dish: "Greens", extras: null, quantity: 1, unit_price: 22000, total_price: 22000 },
      { id: "item-2", order_id: "order-1", type: "single", main_dishes: [], sauce_name: null, sauce_preparation: null, sauce_size: null, side_dish: null, extras: null, quantity: 1, unit_price: 5000, total_price: 5000 },
    ],
  },
  {
    id: "order-2",
    order_number: "9Y-002",
    status: "preparing",
    customer_name: "Jane Smith",
    customer_phone: "+256700333444",
    customer_location: "Reception Area",
    payment_method: "mobile_money",
    payment_status: "paid",
    momo_transaction_id: "TXN123456",
    subtotal: 28000,
    total: 28000,
    special_instructions: null,
    source: "kiosk",
    created_at: new Date(Date.now() - 15 * 60000).toISOString(), // 15 mins ago
    updated_at: new Date(Date.now() - 10 * 60000).toISOString(),
    prepared_at: new Date(Date.now() - 10 * 60000).toISOString(),
    ready_at: null,
    delivered_at: null,
    items: [
      { id: "item-3", order_id: "order-2", type: "combo", main_dishes: ["Matooke"], sauce_name: "Chicken Stew", sauce_preparation: null, sauce_size: "Large", side_dish: "Beans", extras: null, quantity: 1, unit_price: 28000, total_price: 28000 },
    ],
  },
  {
    id: "order-3",
    order_number: "9Y-003",
    status: "ready",
    customer_name: "Peter Otieno",
    customer_phone: "+256700555666",
    customer_location: "Office 305",
    payment_method: "pay_at_counter",
    payment_status: "pending",
    momo_transaction_id: null,
    subtotal: 17000,
    total: 17000,
    special_instructions: null,
    source: "kiosk",
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60000).toISOString(),
    prepared_at: new Date(Date.now() - 15 * 60000).toISOString(),
    ready_at: new Date(Date.now() - 5 * 60000).toISOString(),
    delivered_at: null,
    items: [
      { id: "item-4", order_id: "order-3", type: "single", main_dishes: [], sauce_name: null, sauce_preparation: null, sauce_size: null, side_dish: null, extras: null, quantity: 1, unit_price: 12000, total_price: 12000 },
      { id: "item-5", order_id: "order-3", type: "single", main_dishes: [], sauce_name: null, sauce_preparation: null, sauce_size: null, side_dish: null, extras: null, quantity: 1, unit_price: 5000, total_price: 5000 },
    ],
  },
  {
    id: "order-4",
    order_number: "9Y-004",
    status: "delivered",
    customer_name: "Mary Nakato",
    customer_phone: "+256700777888",
    customer_location: "Meeting Room 2",
    payment_method: "cash",
    payment_status: "paid",
    momo_transaction_id: null,
    subtotal: 45000,
    total: 45000,
    special_instructions: "Call when ready",
    source: "kiosk",
    created_at: new Date(Date.now() - 60 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60000).toISOString(),
    prepared_at: new Date(Date.now() - 50 * 60000).toISOString(),
    ready_at: new Date(Date.now() - 40 * 60000).toISOString(),
    delivered_at: new Date(Date.now() - 30 * 60000).toISOString(),
    items: [
      { id: "item-6", order_id: "order-4", type: "combo", main_dishes: ["Posho", "Rice", "Matooke"], sauce_name: "Beef Stew", sauce_preparation: null, sauce_size: "Large", side_dish: "Greens", extras: [{ name: "Extra Sauce", price: 5000, quantity: 1 }], quantity: 2, unit_price: 22500, total_price: 45000 },
    ],
  },
];

/** Fetch a single order by order_number (kiosk confirmation) */
export function useOrderByNumber(orderNumber: string | null) {
  return useQuery<Order | null>({
    queryKey: ["order", orderNumber],
    queryFn: async () => {
      if (!orderNumber) return null;
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*, items:order_items(*)")
          .eq("order_number", orderNumber)
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn("Failed to fetch order, checking mock data:", err);
        return MOCK_ORDERS.find(o => o.order_number === orderNumber) || null;
      }
    },
    enabled: !!orderNumber,
  });
}

/** Fetch orders for dashboard with optional status filter */
export function useOrders(status?: OrderStatus) {
  return useQuery<Order[]>({
    queryKey: ["orders", status],
    queryFn: async () => {
      try {
        let query = supabase
          .from("orders")
          .select("*, items:order_items(*)")
          .order("created_at", { ascending: false });

        if (status) {
          query = query.eq("status", status);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (data && data.length > 0) return data;
        // Return mock data if empty
        console.log("📦 Using mock orders (no data in Supabase)");
        return status ? MOCK_ORDERS.filter(o => o.status === status) : MOCK_ORDERS;
      } catch (err) {
        console.warn("Failed to fetch orders, using mock data:", err);
        return status ? MOCK_ORDERS.filter(o => o.status === status) : MOCK_ORDERS;
      }
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
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*, items:order_items(*)")
          .gte("created_at", today.toISOString())
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) return data;
        // Return mock data if empty
        console.log("📦 Using mock today's orders (no data in Supabase)");
        return MOCK_ORDERS;
      } catch (err) {
        console.warn("Failed to fetch today's orders, using mock data:", err);
        return MOCK_ORDERS;
      }
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
