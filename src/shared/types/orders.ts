// Order types — mirrors the Supabase DB schema

export type OrderStatus = "new" | "preparing" | "ready" | "delivered" | "cancelled";
export type PaymentMethod = "cash" | "mobile_money" | "pay_at_counter";
export type PaymentStatus = "pending" | "paid" | "failed";
export type OrderItemType = "combo" | "single";
export type OrderSource = "kiosk" | "website" | "app";

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
  total: number;
  special_instructions: string | null;
  source: OrderSource;
  created_at: string;
  updated_at: string;
  prepared_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  // Joined
  items?: OrderItem[];
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
  total: number;
  special_instructions?: string;
  source: OrderSource;
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

// Order status progression
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "new",
  "preparing",
  "ready",
  "delivered",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  preparing: "bg-yellow-100 text-yellow-800",
  ready: "bg-green-100 text-green-800",
  delivered: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-800",
};
