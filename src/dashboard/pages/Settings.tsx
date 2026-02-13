import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "@shared/types/auth";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { Button } from "@shared/components/ui/button";
import { Switch } from "@shared/components/ui/switch";
import { Bell, Volume2, Smartphone } from "lucide-react";

export default function Settings() {
  const { role, profile, loading: authLoading } = useAuth();
  const canView = role ? hasPermission(role, "settings:read") : false;
  const { permission, subscribed, requestPermission } = usePushNotifications();
  const [soundEnabled, setSoundEnabled] = useState(true);

  if (authLoading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="w-6 h-6 animate-spin border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">You don't have access to settings.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Profile */}
      <section className="bg-card rounded-xl border p-6 mb-6">
        <h2 className="font-semibold text-lg mb-4">Profile</h2>
        <div className="space-y-2 text-sm">
          <p><strong>Name:</strong> {profile?.full_name}</p>
          <p><strong>Role:</strong> {profile?.role}</p>
          <p><strong>Phone:</strong> {profile?.phone || "Not set"}</p>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-card rounded-xl border p-6 mb-6">
        <h2 className="font-semibold text-lg mb-4">Notifications</h2>

        <div className="space-y-4">
          {/* Sound */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Order Alert Sound</p>
                <p className="text-sm text-muted-foreground">
                  Play sound when new order arrives
                </p>
              </div>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
          </div>

          {/* Push */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  {permission === "granted"
                    ? subscribed
                      ? "Enabled"
                      : "Permission granted, registering..."
                    : permission === "denied"
                    ? "Blocked in browser settings"
                    : "Not enabled yet"}
                </p>
              </div>
            </div>
            {permission !== "granted" && permission !== "denied" && (
              <Button variant="outline" size="sm" onClick={requestPermission}>
                Enable
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="font-semibold text-lg mb-4">About</h2>
        <p className="text-sm text-muted-foreground">
          9Yards Kitchen Dashboard v1.0.0
        </p>
        <p className="text-sm text-muted-foreground">
          Powered by Supabase + React
        </p>
      </section>
    </div>
  );
}
