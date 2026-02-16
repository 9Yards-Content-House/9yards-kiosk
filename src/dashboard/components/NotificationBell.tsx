import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, CheckCheck, Package2, RefreshCw, CreditCard } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { useAuth } from "../context/AuthContext";
import type { NotificationType } from "@shared/types/auth";
import { timeAgo, cn } from "@shared/lib/utils";
import { useNavigate } from "react-router-dom";
import { useNotificationSound } from "../hooks/useNotificationSound";

interface NotificationBellProps {
  sidebarCollapsed?: boolean;
}

// Mock notifications storage key
const MOCK_NOTIFICATIONS_KEY = "9yards_mock_notifications";

// Get mock notifications from localStorage
function getMockNotifications(): NotificationType[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(MOCK_NOTIFICATIONS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
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
  const { play: playNotificationSound } = useNotificationSound();
  const [open, setOpen] = useState(false);
  
  // Track previously seen notification IDs to play sound only for new ones
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isInitialFetch = useRef(true);

  // Query for notifications
  const { data: notifications = [], refetch } = useQuery<NotificationType[]>({
    queryKey: ["notifications", role],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        return getMockNotifications();
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("target_role", role)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!role,
    refetchInterval: USE_MOCK_DATA ? false : 15_000,
    staleTime: 5_000,
  });

  // Realtime subscription for new notifications (Supabase only)
  useEffect(() => {
    if (USE_MOCK_DATA || !role) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `target_role=eq.${role}`,
        },
        (payload) => {
          const newNotification = payload.new as NotificationType;
          // Add to cache immediately
          queryClient.setQueryData<NotificationType[]>(
            ["notifications", role],
            (old = []) => [newNotification, ...old].slice(0, 50)
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
        },
        () => {
          // Refetch on updates (e.g., when marked as read from another device)
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, queryClient, refetch]);

  // Handle sound notifications when new notifications arrive
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    let hasNewUnread = false;
    notifications.forEach(n => {
      if (!n.read && !seenIdsRef.current.has(n.id)) {
        seenIdsRef.current.add(n.id);
        if (n.type === "new_order") {
          hasNewUnread = true;
        }
      } else if (n.read) {
        seenIdsRef.current.add(n.id);
      }
    });

    if (hasNewUnread && !isInitialFetch.current) {
      playNotificationSound();
    }
    
    isInitialFetch.current = false;
  }, [notifications, playNotificationSound]);

  // Optimistic update helper - update cache immediately
  const updateNotificationsCache = useCallback((updater: (notifications: NotificationType[]) => NotificationType[]) => {
    queryClient.setQueryData<NotificationType[]>(["notifications", role], (old = []) => {
      const updated = updater(old);
      if (USE_MOCK_DATA) {
        saveMockNotifications(updated);
      }
      return updated;
    });
  }, [queryClient, role]);

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      // Optimistic update
      updateNotificationsCache((notifications) =>
        notifications.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );

      if (!USE_MOCK_DATA) {
        const { error } = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", notificationId);
        if (error) throw error;
      }
    },
    onError: () => {
      // Revert on error
      refetch();
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      // Optimistic update - mark all as read immediately
      updateNotificationsCache((notifications) =>
        notifications.map(n => ({ ...n, read: true }))
      );

      if (!USE_MOCK_DATA) {
        const { error } = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("target_role", role)
          .eq("read", false);
        if (error) throw error;
      }
    },
    onError: () => {
      // Revert on error
      refetch();
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
      case "payment_received":
        return <CreditCard className="w-4 h-4 text-emerald-500" />;
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
              <span className="font-bold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                  className={cn(
                    "text-xs text-[#212282] hover:text-[#E6411C] font-semibold flex items-center gap-1 transition-colors",
                    markAllAsReadMutation.isPending && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {markAllAsReadMutation.isPending ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5" />
                  )}
                  {markAllAsReadMutation.isPending ? "Marking..." : "Mark all read"}
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
                        <p className={cn(
                          "text-sm leading-tight",
                          !n.read ? "font-bold text-slate-900" : "text-muted-foreground font-medium"
                        )}>
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
                <div className="px-4 py-16 text-center select-none">
                  <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">No new notifications</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
