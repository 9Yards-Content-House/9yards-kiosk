import { useState } from "react";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { useAuth } from "../context/AuthContext";
import type { NotificationType } from "@shared/types/auth";
import { timeAgo } from "@shared/lib/utils";

// Mock notifications for development
const MOCK_NOTIFICATIONS: NotificationType[] = [
  { id: "1", message: "New order #9Y-0042 received", target_role: "admin", read: false, created_at: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: "2", message: "Order #9Y-0041 marked as ready", target_role: "admin", read: true, created_at: new Date(Date.now() - 30 * 60000).toISOString() },
];

export default function NotificationBell() {
  const { role } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: notifications } = useQuery<NotificationType[]>({
    queryKey: ["notifications", role],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        console.log("📦 Mock mode: returning mock notifications");
        return MOCK_NOTIFICATIONS;
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
    refetchInterval: USE_MOCK_DATA ? 10_000 : 30_000,
  });

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-80 bg-card rounded-xl border shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-sm">
              Notifications
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications?.length ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b last:border-b-0 text-sm ${
                      !n.read ? "bg-secondary/5" : ""
                    }`}
                  >
                    <p className="font-medium">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
