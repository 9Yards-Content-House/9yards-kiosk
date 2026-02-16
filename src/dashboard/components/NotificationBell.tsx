import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Bell, Check, CheckCheck, Package2, RefreshCw, CreditCard, Trash2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { useAuth } from "../context/AuthContext";
import type { NotificationType } from "@shared/types/auth";
import { cn } from "@shared/lib/utils";
import { useNavigate } from "react-router-dom";
import { useNotificationSound } from "../hooks/useNotificationSound";
import { toast } from "sonner";

interface NotificationBellProps {
  sidebarCollapsed?: boolean;
}

// Storage keys
const MOCK_NOTIFICATIONS_KEY = "9yards_mock_notifications";
const SEEN_NOTIFICATIONS_KEY = "9yards_seen_notification_ids";

// Time grouping helpers
function getTimeGroup(dateString: string): "today" | "yesterday" | "thisWeek" | "older" {
  const date = new Date(dateString);
  const now = new Date();
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (notifDate.getTime() >= today.getTime()) return "today";
  if (notifDate.getTime() >= yesterday.getTime()) return "yesterday";
  if (notifDate.getTime() >= weekAgo.getTime()) return "thisWeek";
  return "older";
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const GROUP_LABELS: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  thisWeek: "This Week",
  older: "Older",
};

// Extract order number from notification message
function extractOrderNumber(message: string): string | null {
  const match = message.match(/order\s*#?\s*(\d+)/i);
  return match ? match[1] : null;
}

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

// Get seen notification IDs from localStorage (prevents sound replaying on refresh)
function getSeenNotificationIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(SEEN_NOTIFICATIONS_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch {}
  return new Set();
}

// Save seen notification IDs to localStorage
function saveSeenNotificationIds(ids: Set<string>) {
  try {
    // Only keep last 200 IDs to prevent localStorage bloat
    const idsArray = Array.from(ids).slice(-200);
    localStorage.setItem(SEEN_NOTIFICATIONS_KEY, JSON.stringify(idsArray));
  } catch {}
}

export default function NotificationBell({ sidebarCollapsed = false }: NotificationBellProps) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { play: playNotificationSound } = useNotificationSound();
  const [open, setOpen] = useState(false);
  
  // Track previously seen notification IDs to play sound only for new ones
  // Persisted to localStorage to survive page refreshes
  const seenIdsRef = useRef<Set<string>>(getSeenNotificationIds());
  const isInitialFetch = useRef(true);

  // Query for notifications
  const { data: notifications = [], refetch, isError, error } = useQuery<NotificationType[]>({
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
    retry: 2,
  });

  // Log errors for debugging
  useEffect(() => {
    if (isError && error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, [isError, error]);

  // Group notifications by time period
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, NotificationType[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };
    
    notifications.forEach(n => {
      const group = getTimeGroup(n.created_at);
      groups[group].push(n);
    });
    
    return groups;
  }, [notifications]);

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
          refetch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
        },
        () => {
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

    // Persist seen IDs to localStorage
    saveSeenNotificationIds(seenIdsRef.current);

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
      // Optimistic update first
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
    onError: (error) => {
      console.error("Failed to mark notification as read:", error);
      refetch();
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      // Optimistic update
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
    onSuccess: () => {
      toast.success("All notifications marked as read");
    },
    onError: (error) => {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark notifications as read");
      refetch();
    },
  });

  // Clear all notifications (delete them)
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      updateNotificationsCache(() => []);

      if (!USE_MOCK_DATA) {
        const { error } = await supabase
          .from("notifications")
          .delete()
          .eq("target_role", role);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("All notifications cleared");
    },
    onError: (error) => {
      console.error("Failed to clear notifications:", error);
      toast.error("Failed to clear notifications");
      refetch();
    },
  });

  // Delete single notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      updateNotificationsCache((notifications) =>
        notifications.filter(n => n.id !== notificationId)
      );

      if (!USE_MOCK_DATA) {
        const { error } = await supabase
          .from("notifications")
          .delete()
          .eq("id", notificationId);
        if (error) throw error;
      }
    },
    onError: (error) => {
      console.error("Failed to delete notification:", error);
      toast.error("Failed to delete notification");
      refetch();
    },
  });

  const handleNotificationClick = (notification: NotificationType) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    setOpen(false);
    
    const orderNumber = extractOrderNumber(notification.message);
    if (orderNumber) {
      navigate(`/orders/${orderNumber}`);
    } else if (notification.order_id) {
      navigate("/orders");
    }
  };

  const handleDeleteNotification = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(notificationId);
  };

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  const hasNotifications = notifications.length > 0;
  const hasAnyGroup = Object.values(groupedNotifications).some(g => g.length > 0);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors",
          open ? "bg-muted" : "hover:bg-muted"
        )}
      >
        <Bell className={cn("w-5 h-5", unreadCount > 0 && "text-[#212282]")} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-[#E6411C] text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 99 ? "99+" : unreadCount}
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
            "fixed top-2 w-96 bg-card rounded-xl border shadow-2xl z-[101] overflow-hidden max-h-[85vh] flex flex-col",
            sidebarCollapsed ? "left-20" : "left-64"
          )}>
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between bg-gradient-to-r from-[#212282]/5 to-transparent shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs bg-[#E6411C]/10 text-[#E6411C] font-semibold px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                    className={cn(
                      "text-xs text-[#212282] hover:text-[#E6411C] font-semibold flex items-center gap-1 px-2 py-1 rounded-md transition-colors hover:bg-muted",
                      markAllAsReadMutation.isPending && "opacity-50 cursor-not-allowed"
                    )}
                    title="Mark all as read"
                  >
                    {markAllAsReadMutation.isPending ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCheck className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Mark all read</span>
                  </button>
                )}
                {hasNotifications && (
                  <button
                    onClick={() => clearAllMutation.mutate()}
                    disabled={clearAllMutation.isPending}
                    className={cn(
                      "text-xs text-gray-500 hover:text-[#E6411C] font-semibold flex items-center gap-1 px-2 py-1 rounded-md transition-colors hover:bg-muted",
                      clearAllMutation.isPending && "opacity-50 cursor-not-allowed"
                    )}
                    title="Clear all notifications"
                  >
                    {clearAllMutation.isPending ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
            
            {/* Notification List - Grouped */}
            <div className="flex-1 overflow-y-auto">
              {hasAnyGroup ? (
                <div className="divide-y">
                  {(["today", "yesterday", "thisWeek", "older"] as const).map(groupKey => {
                    const groupNotifications = groupedNotifications[groupKey];
                    if (groupNotifications.length === 0) return null;
                    
                    return (
                      <div key={groupKey}>
                        {/* Group Header */}
                        <div className="px-4 py-2 bg-muted/30 sticky top-0 z-10">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            {GROUP_LABELS[groupKey]}
                          </span>
                        </div>
                        
                        {/* Group Items */}
                        {groupNotifications.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={cn(
                              "w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 group relative",
                              !n.read && "bg-[#E6411C]/5"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                !n.read ? "bg-[#212282]/10" : "bg-muted"
                              )}>
                                {getNotificationIcon(n.type)}
                              </div>
                              <div className="flex-1 min-w-0 pr-6">
                                <p className={cn(
                                  "text-sm leading-tight",
                                  !n.read ? "font-semibold text-slate-900" : "text-muted-foreground"
                                )}>
                                  {n.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatTimeAgo(n.created_at)}
                                </p>
                              </div>
                              {!n.read && (
                                <div className="w-2 h-2 rounded-full bg-[#E6411C] shrink-0 mt-1.5 absolute right-12 top-4" />
                              )}
                              {/* Delete button - visible on hover */}
                              <button
                                onClick={(e) => handleDeleteNotification(e, n.id)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-100 text-gray-400 hover:text-red-500 transition-all"
                                title="Delete notification"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-16 text-center select-none">
                  <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">No notifications yet</p>
                </div>
              )}
            </div>
            
            {/* Footer with quick actions */}
            {hasNotifications && (
              <div className="px-4 py-2 border-t bg-muted/20 shrink-0">
                <p className="text-xs text-center text-muted-foreground">
                  Click on a notification to view order details
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
