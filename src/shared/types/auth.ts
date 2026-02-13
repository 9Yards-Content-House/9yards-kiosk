// Auth & user types

export type UserRole = "admin" | "kitchen" | "rider";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
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
  ],
  kitchen: [
    "orders:read",
    "orders:update",
    "orders:cancel",
    "menu:read",
    "menu:update", // toggle availability
  ],
  rider: [
    "orders:read", // own assigned only
    "orders:update", // ready → delivered only
    "deliveries:read",
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
