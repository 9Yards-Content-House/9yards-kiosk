import { useEffect, useState, useCallback } from "react";
import { supabase } from "@shared/lib/supabase";
import { useAuth } from "../context/AuthContext";

/**
 * Registers a Web Push subscription for the current user,
 * storing it in the push_subscriptions table.
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [subscribed, setSubscribed] = useState(false);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return;

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted" && "serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
        });

        // Store subscription in Supabase
        if (user) {
          await supabase.from("push_subscriptions").upsert(
            {
              user_id: user.id,
              subscription: sub.toJSON(),
              created_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
          setSubscribed(true);
        }
      } catch {
        // Push not supported or failed
      }
    }
  }, [user]);

  return { permission, subscribed, requestPermission };
}
