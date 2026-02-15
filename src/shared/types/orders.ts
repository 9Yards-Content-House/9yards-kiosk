// Order types — mirrors the Supabase DB schema

export type OrderStatus = "new" | "preparing" | "out_for_delivery" | "arrived" | "cancelled";
export type PaymentMethod = "cash" | "mobile_money" | "pay_at_counter";
export type PaymentStatus = "pending" | "paid" | "failed";
export type OrderItemType = "combo" | "single";
export type OrderSource = "kiosk" | "website" | "app";

// Delivery fee constant (UGX)
export const DELIVERY_FEE = 5000;

export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string | null;
  customer_location: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  momo_transaction_id: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  special_instructions: string | null;
  source: OrderSource;
  created_at: string;
  updated_at: string;
  prepared_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  // Rider assignment
  rider_id: string | null;
  assigned_at: string | null;
  // Pickup tracking
  picked_up_at: string | null;
  picked_up_by: string | null;
  // Scheduling
  scheduled_for: string | null;
  is_scheduled: boolean;
  // Multi-location
  location_id: string | null;
  // Issue tracking
  has_issue?: boolean;
  issue_id?: string | null;
  // Joined (Supabase returns as order_items, we alias as items)
  items?: OrderItem[];
  order_items?: OrderItem[];
  // Joined rider profile (optional)
  rider?: {
    id: string;
    full_name: string;
    phone: string | null;
  } | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  type: OrderItemType;
  main_dishes: string[];
  sauce_name: string | null;
  sauce_preparation: string | null;
  sauce_size: string | null;
  side_dish: string | null;
  extras: OrderExtra[] | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface OrderExtra {
  name: string;
  price: number;
  quantity: number;
}

// For creating orders from the kiosk
export interface CreateOrderPayload {
  customer_name: string;
  customer_phone?: string;
  customer_location?: string;
  payment_method: PaymentMethod;
  subtotal: number;
  delivery_fee?: number;
  total: number;
  special_instructions?: string;
  source: OrderSource;
  scheduled_for?: string; // ISO timestamp for pre-orders
  is_scheduled?: boolean;
  items: CreateOrderItemPayload[];
}

export interface CreateOrderItemPayload {
  type: OrderItemType;
  main_dishes: string[];
  sauce_name?: string;
  sauce_preparation?: string;
  sauce_size?: string;
  side_dish?: string;
  extras?: OrderExtra[];
  quantity: number;
  unit_price: number;
  total_price: number;
}

// Order status progression (4-step flow)
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "new",
  "preparing",
  "out_for_delivery",
  "arrived",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  arrived: "Arrived",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  preparing: "bg-yellow-100 text-yellow-800",
  out_for_delivery: "bg-purple-100 text-purple-800",
  arrived: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};
