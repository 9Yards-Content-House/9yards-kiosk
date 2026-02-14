import { useEffect, useState, useCallback } from "react";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

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
  const [loading, setLoading] = useState(false);

  // Register service worker on mount
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[Push] Service worker registered:", registration.scope);
        })
        .catch((error) => {
          console.error("[Push] Service worker registration failed:", error);
        });
    }
  }, []);

  // Check existing subscription on mount
  useEffect(() => {
    const checkSubscription = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          setSubscribed(true);
        }
      } catch (error) {
        console.error("[Push] Error checking subscription:", error);
      }
    };

    if (permission === "granted") {
      checkSubscription();
    }
  }, [permission]);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      toast.error("Push notifications not supported in this browser");
      return;
    }

    if (!("serviceWorker" in navigator)) {
      toast.error("Service workers not supported");
      return;
    }

    setLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        toast.error("Notification permission denied");
        setLoading(false);
        return;
      }

      // Get VAPID key
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.warn("[Push] No VAPID key configured");
        // Still mark as subscribed for demo purposes
        setSubscribed(true);
        toast.success("Notifications enabled (demo mode)");
        setLoading(false);
        return;
      }

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;

      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      console.log("[Push] Subscription created:", subscription.endpoint);

      // Store subscription in Supabase (skip in mock mode)
      if (user && !USE_MOCK_DATA && supabase) {
        const { error } = await supabase.from("push_subscriptions").upsert(
          {
            user_id: user.id,
            subscription: subscription.toJSON(),
            created_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

        if (error) {
          console.error("[Push] Error storing subscription:", error);
          toast.error("Failed to save notification settings");
        } else {
          setSubscribed(true);
          toast.success("Push notifications enabled!");
        }
      } else if (USE_MOCK_DATA) {
        console.log("[Push] Mock mode: Push subscription skipped");
        setSubscribed(true);
        toast.success("Push notifications enabled (mock)");
      }
    } catch (error) {
      console.error("[Push] Error requesting permission:", error);
      toast.error("Failed to enable notifications");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        if (user && !USE_MOCK_DATA && supabase) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user.id);
        }
        
        setSubscribed(false);
        toast.success("Push notifications disabled");
      }
    } catch (error) {
      console.error("[Push] Error unsubscribing:", error);
      toast.error("Failed to disable notifications");
    }
  }, [user]);

  return { permission, subscribed, loading, requestPermission, unsubscribe };
}

/**
 * Convert a base64 string to Uint8Array for applicationServerKey
 */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray.buffer;
}
