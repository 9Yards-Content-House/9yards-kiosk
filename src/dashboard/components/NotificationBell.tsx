import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, Package2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { useAuth } from "../context/AuthContext";
import type { NotificationType } from "@shared/types/auth";
import { timeAgo, cn } from "@shared/lib/utils";
import { useNavigate } from "react-router-dom";

interface NotificationBellProps {
  sidebarCollapsed?: boolean;
}

// Mock notifications storage key
const MOCK_NOTIFICATIONS_KEY = "9yards_mock_notifications";

// Initial mock notifications
const INITIAL_MOCK_NOTIFICATIONS: NotificationType[] = [
  { id: "1", order_id: "order-mock-1", type: "new_order", message: "New order #294851 received", target_role: "admin", read: false, created_at: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: "2", order_id: "order-mock-2", type: "status_change", message: "Order #103847 marked as ready", target_role: "admin", read: true, created_at: new Date(Date.now() - 30 * 60000).toISOString() },
];

// Get mock notifications from localStorage or use initial
function getMockNotifications(): NotificationType[] {
  if (typeof window === "undefined") return INITIAL_MOCK_NOTIFICATIONS;
  try {
    const stored = localStorage.getItem(MOCK_NOTIFICATIONS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return INITIAL_MOCK_NOTIFICATIONS;
}

// Save mock notifications to localStorage
function saveMockNotifications(notifications: NotificationType[]) {
  try {
    localStorage.setItem(MOCK_NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch {}
}

export default function NotificationBell({ sidebarCollapsed = false }: NotificationBellProps) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mockNotifications, setMockNotifications] = useState<NotificationType[]>(getMockNotifications);

  // Sync mock notifications with localStorage
  useEffect(() => {
    if (USE_MOCK_DATA) {
      saveMockNotifications(mockNotifications);
    }
  }, [mockNotifications]);

  const { data: notifications } = useQuery<NotificationType[]>({
    queryKey: ["notifications", role],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        return mockNotifications;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("target_role", role)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!role,
    refetchInterval: USE_MOCK_DATA ? false : 30_000,
  });

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (USE_MOCK_DATA) {
        const updated = mockNotifications.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        );
        setMockNotifications(updated);
        return updated;
      }
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: (data) => {
      if (USE_MOCK_DATA && data) {
        queryClient.setQueryData(["notifications", role], data);
      } else {
        queryClient.invalidateQueries({ queryKey: ["notifications", role] });
      }
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (USE_MOCK_DATA) {
        const updated = mockNotifications.map(n => ({ ...n, read: true }));
        setMockNotifications(updated);
        return updated;
      }
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("target_role", role)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: (data) => {
      if (USE_MOCK_DATA && data) {
        queryClient.setQueryData(["notifications", role], data);
      } else {
        queryClient.invalidateQueries({ queryKey: ["notifications", role] });
      }
    },
  });

  const handleNotificationClick = (notification: NotificationType) => {
    markAsReadMutation.mutate(notification.id);
    setOpen(false);
    if (notification.order_id) {
      navigate("/orders");
    }
  };

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_order":
        return <Package2 className="w-4 h-4 text-green-500" />;
      case "status_change":
        return <Check className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#E6411C] text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setOpen(false)}
          />
          <div className={cn(
            "fixed top-2 w-80 bg-card rounded-xl border shadow-2xl z-[101] overflow-hidden max-h-[80vh]",
            sidebarCollapsed ? "left-20" : "left-64"
          )}>
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between bg-gradient-to-r from-[#212282]/5 to-transparent">
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsReadMutation.mutate()}
                  className="text-xs text-[#212282] hover:text-[#E6411C] font-medium flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>
            
            {/* Notification List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications?.length ? (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full px-4 py-3 border-b last:border-b-0 text-left transition-colors hover:bg-muted/50 ${
                      !n.read ? "bg-[#E6411C]/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        !n.read ? "bg-[#212282]/10" : "bg-muted"
                      }`}>
                        {getNotificationIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.read ? "font-medium" : "text-muted-foreground"}`}>
                          {n.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full bg-[#E6411C] shrink-0 mt-1.5" />
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-12 text-center">
                  <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No notifications</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
