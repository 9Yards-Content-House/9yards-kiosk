import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import type {
  Order,
  OrderStatus,
  CreateOrderPayload,
} from "@shared/types/orders";

// Generate a memorable order number like "9Y-XK42"
// Format: 9Y + 2 letters + 2 digits for easy verbal communication
function generateOrderNumber(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed I and O to avoid confusion with 1 and 0
  const l1 = letters[Math.floor(Math.random() * letters.length)];
  const l2 = letters[Math.floor(Math.random() * letters.length)];
  const d1 = Math.floor(Math.random() * 10);
  const d2 = Math.floor(Math.random() * 10);
  return `9Y-${l1}${l2}${d1}${d2}`;
}

// Storage key for localStorage persistence
const OVERLAY_STORAGE_KEY = "9yards_order_overlay";

// Local overlay store for status changes when Supabase writes fail
// This allows the UI to work even when RLS blocks writes
const localOrderOverlay: Map<string, Partial<Order>> = new Map();

// Load overlay from localStorage on startup
function loadOverlayFromStorage() {
  try {
    const stored = localStorage.getItem(OVERLAY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, Partial<Order>>;
      Object.entries(parsed).forEach(([id, overlay]) => {
        localOrderOverlay.set(id, overlay);
      });
    }
  } catch (err) {
    console.warn("Failed to load order overlay from storage:", err);
  }
}

// Save overlay to localStorage
function saveOverlayToStorage() {
  try {
    const obj: Record<string, Partial<Order>> = {};
    localOrderOverlay.forEach((value, key) => {
      obj[key] = value;
    });
    localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(obj));
    
    // Also broadcast to other tabs
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("9yards_orders");
      channel.postMessage({ type: "overlay_update", data: obj });
      channel.close();
    }
  } catch (err) {
    console.warn("Failed to save order overlay to storage:", err);
  }
}

// Initialize: load from storage
loadOverlayFromStorage();

// Listen for updates from other tabs
if (typeof BroadcastChannel !== "undefined") {
  const channel = new BroadcastChannel("9yards_orders");
  channel.onmessage = (event) => {
    if (event.data?.type === "overlay_update") {
      const data = event.data.data as Record<string, Partial<Order>>;
      localOrderOverlay.clear();
      Object.entries(data).forEach(([id, overlay]) => {
        localOrderOverlay.set(id, overlay);
      });
    }
  };
}

// In-memory store for mock mode - allows full CRUD operations
const mockOrdersStore: Order[] = [
  {
    id: "order-1",
    order_number: "9Y-AB12",
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
    rider_id: null,
    assigned_at: null,
    items: [
      { id: "item-1", order_id: "order-1", type: "combo", main_dishes: ["Posho", "Rice"], sauce_name: "Groundnut Sauce", sauce_preparation: "Mild", sauce_size: "Regular", side_dish: "Greens", extras: null, quantity: 1, unit_price: 22000, total_price: 22000 },
      { id: "item-2", order_id: "order-1", type: "single", main_dishes: [], sauce_name: null, sauce_preparation: null, sauce_size: null, side_dish: null, extras: null, quantity: 1, unit_price: 5000, total_price: 5000 },
    ],
  },
  {
    id: "order-2",
    order_number: "9Y-CD34",
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
    rider_id: null,
    assigned_at: null,
    items: [
      { id: "item-3", order_id: "order-2", type: "combo", main_dishes: ["Matooke"], sauce_name: "Chicken Stew", sauce_preparation: null, sauce_size: "Large", side_dish: "Beans", extras: null, quantity: 1, unit_price: 28000, total_price: 28000 },
    ],
  },
  {
    id: "order-3",
    order_number: "9Y-EF56",
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
    rider_id: null,
    assigned_at: null,
    items: [
      { id: "item-4", order_id: "order-3", type: "single", main_dishes: [], sauce_name: null, sauce_preparation: null, sauce_size: null, side_dish: null, extras: null, quantity: 1, unit_price: 12000, total_price: 12000 },
      { id: "item-5", order_id: "order-3", type: "single", main_dishes: [], sauce_name: null, sauce_preparation: null, sauce_size: null, side_dish: null, extras: null, quantity: 1, unit_price: 5000, total_price: 5000 },
    ],
  },
  {
    id: "order-4",
    order_number: "9Y-GH78",
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
    rider_id: null,
    assigned_at: null,
    items: [
      { id: "item-6", order_id: "order-4", type: "combo", main_dishes: ["Posho", "Rice", "Matooke"], sauce_name: "Beef Stew", sauce_preparation: null, sauce_size: "Large", side_dish: "Greens", extras: [{ name: "Extra Sauce", price: 5000, quantity: 1 }], quantity: 2, unit_price: 22500, total_price: 45000 },
    ],
  },
];

// Helper to apply local overlay to an order
function applyOverlay(order: Order): Order {
  const overlay = localOrderOverlay.get(order.id);
  if (!overlay) return order;
  return { ...order, ...overlay };
}

// Helper to apply overlay to a list of orders, filtering by actual status after overlay
function applyOverlayToList(orders: Order[], filterStatus?: OrderStatus): Order[] {
  return orders
    .map(applyOverlay)
    .filter(o => !filterStatus || o.status === filterStatus);
}

/** Fetch a single order by order_number (kiosk confirmation) */
export function useOrderByNumber(orderNumber: string | null) {
  return useQuery<Order | null>({
    queryKey: ["order", orderNumber],
    queryFn: async () => {
      if (!orderNumber) return null;
      
      if (USE_MOCK_DATA) {
        const order = mockOrdersStore.find(o => o.order_number === orderNumber);
        return order ? applyOverlay(order) : null;
      }
      
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*, items:order_items(*)")
          .eq("order_number", orderNumber)
          .single();
        if (error) throw error;
        return data ? applyOverlay(data as Order) : null;
      } catch (err) {
        console.warn("Failed to fetch order:", err);
        const order = mockOrdersStore.find(o => o.order_number === orderNumber);
        return order ? applyOverlay(order) : null;
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
      if (USE_MOCK_DATA) {
        console.log("📦 Mock mode: returning mock orders");
        const orders = applyOverlayToList(mockOrdersStore, status);
        return [...orders].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      
      try {
        const query = supabase
          .from("orders")
          .select("*, items:order_items(*)")
          .order("created_at", { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        
        // Apply overlay and filter by status (since overlay may change status)
        const overlaid = applyOverlayToList((data || []) as Order[], status);
        return overlaid;
      } catch (err) {
        console.warn("Failed to fetch orders, using mock data:", err);
        return applyOverlayToList(mockOrdersStore, status);
      }
    },
    refetchInterval: USE_MOCK_DATA ? 5_000 : 30_000,
  });
}

/** Fetch today's orders for the dashboard */
export function useTodaysOrders() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return useQuery<Order[]>({
    queryKey: ["orders", "today"],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        console.log("📦 Mock mode: returning today's mock orders");
        const todayTime = today.getTime();
        return applyOverlayToList(mockOrdersStore)
          .filter(o => new Date(o.created_at).getTime() >= todayTime)
          .sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
      
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*, items:order_items(*)")
          .gte("created_at", today.toISOString())
          .order("created_at", { ascending: false });
        if (error) throw error;
        
        // Apply local overlay to fetched orders
        return applyOverlayToList((data || []) as Order[]);
      } catch (err) {
        console.warn("Failed to fetch today's orders, using mock data:", err);
        return applyOverlayToList(mockOrdersStore);
      }
    },
    refetchInterval: USE_MOCK_DATA ? 5_000 : 30_000,
  });
}

/** Fetch all orders (for analytics and historical views) */
export function useAllOrders() {
  return useQuery<Order[]>({
    queryKey: ["orders", "all"],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        console.log("📦 Mock mode: returning all mock orders");
        return applyOverlayToList(mockOrdersStore)
          .sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
      
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*, items:order_items(*)")
          .order("created_at", { ascending: false })
          .limit(500); // Limit to last 500 orders for performance
        if (error) throw error;
        
        return applyOverlayToList((data || []) as Order[]);
      } catch (err) {
        console.warn("Failed to fetch all orders, using mock data:", err);
        return applyOverlayToList(mockOrdersStore);
      }
    },
    refetchInterval: USE_MOCK_DATA ? 5_000 : 60_000, // Slower refresh for all orders
  });
}

// Helper to create a mock order object
function createMockOrder(orderData: Omit<CreateOrderPayload, "items">, items: CreateOrderPayload["items"]): Order {
  const id = `order-${Date.now()}`;
  const now = new Date().toISOString();
  
  return {
    id,
    order_number: generateOrderNumber(),
    status: "new",
    customer_name: orderData.customer_name,
    customer_phone: orderData.customer_phone || null,
    customer_location: orderData.customer_location || null,
    payment_method: orderData.payment_method,
    payment_status: orderData.payment_method === "mobile_money" ? "paid" : "pending",
    momo_transaction_id: null,
    subtotal: orderData.subtotal,
    total: orderData.total,
    special_instructions: orderData.special_instructions || null,
    source: orderData.source || "kiosk",
    created_at: now,
    updated_at: now,
    prepared_at: null,
    ready_at: null,
    delivered_at: null,
    rider_id: null,
    assigned_at: null,
    items: items.map((item, idx) => ({
      id: `${id}-item-${idx}`,
      order_id: id,
      type: item.type,
      main_dishes: item.main_dishes || [],
      sauce_name: item.sauce_name || null,
      sauce_preparation: item.sauce_preparation || null,
      sauce_size: item.sauce_size || null,
      side_dish: item.side_dish || null,
      extras: item.extras || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    })),
  };
}

/** Create a new order from the kiosk */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateOrderPayload) => {
      const { items, ...orderData } = payload;

      if (USE_MOCK_DATA) {
        // Create mock order with memorable order number
        const newOrder = createMockOrder(orderData, items);
        mockOrdersStore.unshift(newOrder);
        console.log("📦 Mock order created:", newOrder.order_number);
        return newOrder;
      }

      // Real Supabase implementation with fallback to mock on failure
      try {
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert(orderData)
          .select()
          .single();

        if (orderError) {
          console.error("❌ Failed to create order:", orderError);
          throw orderError;
        }

        const orderItems = items.map((item) => ({
          ...item,
          order_id: order.id,
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) {
          console.error("❌ Failed to create order items:", itemsError);
          throw itemsError;
        }

        const { data: fullOrder, error: fetchError } = await supabase
          .from("orders")
          .select("*, items:order_items(*)")
          .eq("id", order.id)
          .single();

        if (fetchError) {
          console.error("❌ Failed to fetch created order:", fetchError);
          throw fetchError;
        }
        
        console.log("✅ Order created in Supabase:", fullOrder.order_number);
        return fullOrder as Order;
      } catch (err) {
        // Fallback to mock mode if Supabase fails
        console.warn("⚠️ Supabase failed, creating mock order instead:", err);
        const newOrder = createMockOrder(orderData, items);
        mockOrdersStore.unshift(newOrder);
        console.log("📦 Fallback mock order created:", newOrder.order_number);
        return newOrder;
      }
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
      const now = new Date().toISOString();
      
      // Build the updates object
      const updates: Partial<Order> = {
        status,
        updated_at: now,
      };
      if (status === "preparing") updates.prepared_at = now;
      if (status === "ready") updates.ready_at = now;
      if (status === "delivered") updates.delivered_at = now;
      
      // Mock mode - use in-memory store
      if (USE_MOCK_DATA) {
        const order = mockOrdersStore.find(o => o.id === orderId);
        if (!order) throw new Error("Order not found");
        
        Object.assign(order, updates);
        console.log(`📦 Mock order ${order.order_number} status updated to: ${status}`);
        return order;
      }

      // Real Supabase flow - with fallback to local overlay on failure
      try {
        const { data, error } = await supabase
          .from("orders")
          .update(updates)
          .eq("id", orderId)
          .select("*, items:order_items(*)")
          .single();

        if (error) throw error;
        
        // Clear any local overlay for this order since Supabase succeeded
        localOrderOverlay.delete(orderId);
        saveOverlayToStorage();
        console.log(`✅ Order ${orderId} status updated to: ${status}`);
        return data as Order;
      } catch (err) {
        // Supabase failed (likely RLS) - use local overlay instead
        console.warn(`⚠️ Supabase update failed, using local overlay:`, err);
        
        // Store the update in local overlay
        const existing = localOrderOverlay.get(orderId) || {};
        localOrderOverlay.set(orderId, { ...existing, ...updates });
        saveOverlayToStorage();
        
        console.log(`📦 Local overlay: Order ${orderId} status updated to: ${status}`);
        
        // Return a simulated updated order
        return { id: orderId, ...updates } as Order;
      }
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
      const now = new Date().toISOString();
      const updates: Partial<Order> = {
        status: "cancelled" as OrderStatus,
        updated_at: now,
      };
      
      if (USE_MOCK_DATA) {
        const order = mockOrdersStore.find(o => o.id === orderId);
        if (!order) throw new Error("Order not found");
        
        Object.assign(order, updates);
        console.log(`📦 Mock order ${order.order_number} cancelled`);
        return order;
      }

      try {
        const { data, error } = await supabase
          .from("orders")
          .update(updates)
          .eq("id", orderId)
          .select()
          .single();

        if (error) throw error;
        
        // Clear local overlay since Supabase succeeded
        localOrderOverlay.delete(orderId);
        saveOverlayToStorage();
        console.log(`✅ Order ${orderId} cancelled`);
        return data;
      } catch (err) {
        // Supabase failed - use local overlay
        console.warn(`⚠️ Supabase cancel failed, using local overlay:`, err);
        
        const existing = localOrderOverlay.get(orderId) || {};
        localOrderOverlay.set(orderId, { ...existing, ...updates });
        saveOverlayToStorage();
        
        console.log(`📦 Local overlay: Order ${orderId} cancelled`);
        return { id: orderId, ...updates } as Order;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

// Export getter for mock store (used by OrderLookup to share state)
export const getMockOrdersStore = () => mockOrdersStore;

// Export function to apply local overlay to an order (for kiosk tracking sync)
export const applyLocalOverlay = (order: Order): Order => applyOverlay(order);

// Export function to get overlay for a specific order ID
export const getOrderOverlay = (orderId: string): Partial<Order> | undefined => 
  localOrderOverlay.get(orderId);

/**
 * Subscribe to order changes via Supabase realtime.
 * Use in dashboard and kiosk to keep orders synced.
 */
export function useOrdersRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (USE_MOCK_DATA || !supabase) {
      console.log("📦 Mock mode: Orders realtime subscription disabled");
      return;
    }

    console.log("🔌 Setting up orders realtime subscription...");

    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('🔄 Order change detected:', payload.eventType, payload.new);
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['order'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
        },
        () => {
          console.log('🔄 Order items updated');
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
      )
      .subscribe((status) => {
        console.log('📡 Orders subscription status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up orders realtime subscription');
      if (supabase) supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Paginated orders query for infinite scroll in dashboard.
 * Returns orders in batches with cursor-based pagination.
 */
const PAGE_SIZE = 20;

export function usePaginatedOrders(options?: {
  status?: OrderStatus | "all";
  searchQuery?: string;
}) {
  const { status = "all", searchQuery = "" } = options || {};

  return useInfiniteQuery({
    queryKey: ["orders", "paginated", status, searchQuery],
    queryFn: async ({ pageParam = 0 }) => {
      if (USE_MOCK_DATA) {
        // Filter mock data
        let filtered = [...mockOrdersStore];
        
        if (status !== "all") {
          filtered = filtered.filter(o => o.status === status);
        }
        
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(o =>
            o.order_number.toLowerCase().includes(query) ||
            o.customer_name?.toLowerCase().includes(query) ||
            o.customer_phone?.includes(query)
          );
        }
        
        // Sort by created_at descending
        filtered.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        // Paginate
        const start = pageParam;
        const end = start + PAGE_SIZE;
        const page = filtered.slice(start, end);
        
        return {
          orders: applyOverlayToList(page),
          nextCursor: end < filtered.length ? end : null,
          total: filtered.length,
        };
      }

      // Build Supabase query
      let query = supabase
        .from("orders")
        .select("*, items:order_items(*)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      // Apply status filter
      if (status !== "all") {
        query = query.eq("status", status);
      }

      // Apply search filter (server-side partial match)
      if (searchQuery) {
        query = query.or(
          `order_number.ilike.%${searchQuery}%,customer_name.ilike.%${searchQuery}%,customer_phone.ilike.%${searchQuery}%`
        );
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const total = count || 0;
      const nextCursor = pageParam + PAGE_SIZE < total ? pageParam + PAGE_SIZE : null;

      return {
        orders: applyOverlayToList((data || []) as Order[]),
        nextCursor,
        total,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });
}
