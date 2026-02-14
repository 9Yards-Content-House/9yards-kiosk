// Auth & user types

export type UserRole = "admin" | "kitchen" | "rider" | "reception";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  email?: string | null; // From auth.users, joined when fetching staff
  active: boolean;
  created_at: string;
}

export interface NotificationType {
  id: string;
  order_id: string;
  type: "new_order" | "status_change" | "payment_received";
  message: string;
  read: boolean;
  target_role: UserRole;
  created_at: string;
}

// Role permissions
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    "orders:read",
    "orders:update",
    "orders:cancel",
    "orders:assign", // can assign riders to orders
    "menu:read",
    "menu:create",
    "menu:update",
    "menu:delete",
    "staff:read",
    "staff:create",
    "staff:update",
    "staff:delete",
    "analytics:read",
    "settings:read",
    "settings:update",
    "deliveries:read",
    "deliveries:assign",
    "reception:read",
  ],
  kitchen: [
    "orders:read",
    "orders:update",
    "orders:cancel",
    "menu:read",
    "menu:update", // toggle availability
    "settings:read", // can view own profile
  ],
  rider: [
    "orders:read", // own assigned only
    "orders:update", // out_for_delivery → arrived only
    "deliveries:read",
    "settings:read", // can view own profile
  ],
  reception: [
    "orders:read", // arrived orders only
    "orders:update", // mark as picked up
    "reception:read",
    "reception:pickup", // mark orders as picked up
    "reception:notify", // send arrival notifications
    "settings:read", // can view own profile
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
