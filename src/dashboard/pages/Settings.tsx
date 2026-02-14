import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "@shared/types/auth";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { Button } from "@shared/components/ui/button";
import { Switch } from "@shared/components/ui/switch";
import { Input } from "@shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import { Bell, Volume2, Smartphone, User, Edit2, Loader2, Store, Printer, Clock, Save, Check, MapPin, BellOff } from "lucide-react";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { toast } from "sonner";

// Settings keys for localStorage
const STORAGE_KEYS = {
  SOUND_ENABLED: "9yards_sound_enabled",
  AUTO_PRINT: "9yards_auto_print",
  PRINT_COPIES: "9yards_print_copies",
};

// Load setting from localStorage with default
const loadSetting = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultValue;
    return JSON.parse(stored) as T;
  } catch {
    return defaultValue;
  }
};

// Save setting to localStorage
const saveSetting = <T,>(key: string, value: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.warn("Failed to save setting:", key);
  }
};

export default function Settings() {
  const { role, profile, user, loading: authLoading, refreshProfile } = useAuth();
  const canView = role ? hasPermission(role, "settings:read") : false;
  const { permission, subscribed, loading: pushLoading, requestPermission, unsubscribe } = usePushNotifications();
  
  // Settings state with localStorage persistence
  const [soundEnabled, setSoundEnabled] = useState(() => loadSetting(STORAGE_KEYS.SOUND_ENABLED, true));
  const [autoPrint, setAutoPrint] = useState(() => loadSetting(STORAGE_KEYS.AUTO_PRINT, false));
  const [printCopies, setPrintCopies] = useState(() => loadSetting(STORAGE_KEYS.PRINT_COPIES, 1));
  
  // Profile editing state
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(profile?.full_name || "");
  const [editPhone, setEditPhone] = useState(profile?.phone || "");
  const [isSaving, setIsSaving] = useState(false);

  // Sync profile data when it changes
  useEffect(() => {
    if (profile) {
      setEditName(profile.full_name);
      setEditPhone(profile.phone || "");
    }
  }, [profile]);

  // Handle sound toggle with persistence
  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    saveSetting(STORAGE_KEYS.SOUND_ENABLED, enabled);
    toast.success(enabled ? "Sound enabled" : "Sound disabled");
  };

  // Handle auto print toggle with persistence
  const handleAutoPrintToggle = (enabled: boolean) => {
    setAutoPrint(enabled);
    saveSetting(STORAGE_KEYS.AUTO_PRINT, enabled);
  };

  // Handle print copies change
  const handlePrintCopiesChange = (copies: number) => {
    const validCopies = Math.min(Math.max(1, copies), 5);
    setPrintCopies(validCopies);
    saveSetting(STORAGE_KEYS.PRINT_COPIES, validCopies);
  };

  // Handle profile update
  const handleProfileUpdate = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      if (USE_MOCK_DATA) {
        // Mock mode - just show success
        toast.success("Profile updated (mock)");
        setEditProfileOpen(false);
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editName,
          phone: editPhone || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
      setEditProfileOpen(false);
      
      // Refresh profile data
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (err) {
      console.error("Profile update error:", err);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-semibold text-lg">Profile</h2>
          </div>
          <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Profile</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Full Name</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Phone</label>
                  <Input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+256700123456"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  <p><strong>Email:</strong> {user?.email}</p>
                  <p><strong>Role:</strong> {profile?.role}</p>
                </div>
                <Button
                  onClick={handleProfileUpdate}
                  disabled={isSaving || !editName}
                  className="w-full"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-2 text-sm">
          <p><strong>Name:</strong> {profile?.full_name}</p>
          <p><strong>Role:</strong> <span className="capitalize">{profile?.role}</span></p>
          <p><strong>Phone:</strong> {profile?.phone || "Not set"}</p>
          <p><strong>Email:</strong> {user?.email || "Not available"}</p>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-card rounded-xl border p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="font-semibold text-lg">Notifications</h2>
        </div>

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
            <Switch checked={soundEnabled} onCheckedChange={handleSoundToggle} />
          </div>

          {/* Push */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  {permission === "granted"
                    ? subscribed
                      ? "Enabled - you'll receive order alerts on this device"
                      : "Permission granted, click Enable to subscribe"
                    : permission === "denied"
                    ? "Blocked - enable in browser settings"
                    : "Get notified when new orders arrive"}
                </p>
              </div>
            </div>
            {permission === "granted" && subscribed ? (
              <Button
                variant="outline"
                size="sm"
                onClick={unsubscribe}
                className="text-red-600 hover:text-red-700"
              >
                <BellOff className="w-4 h-4 mr-1" />
                Disable
              </Button>
            ) : permission !== "denied" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={requestPermission}
                disabled={pushLoading}
              >
                {pushLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Bell className="w-4 h-4 mr-1" />
                )}
                Enable
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                Check browser settings
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Printing (Admin only) */}
      {role === "admin" && (
        <section className="bg-card rounded-xl border p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Printer className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="font-semibold text-lg">Printing</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-print Orders</p>
                <p className="text-sm text-muted-foreground">
                  Automatically print receipt when order is marked ready
                </p>
              </div>
              <Switch checked={autoPrint} onCheckedChange={handleAutoPrintToggle} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Print Copies</p>
                <p className="text-sm text-muted-foreground">
                  Number of receipt copies to print
                </p>
              </div>
              <Select
                value={String(printCopies)}
                onValueChange={(v) => handlePrintCopiesChange(parseInt(v, 10))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  window.print();
                  toast.success("Print dialog opened");
                }}
                className="w-full sm:w-auto"
              >
                <Printer className="w-4 h-4 mr-2" />
                Test Print
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Click to open the browser print dialog. Configure your printer in browser settings.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Store Info (Admin only) */}
      {role === "admin" && (
        <section className="bg-card rounded-xl border p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Store className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="font-semibold text-lg">Store Information</h2>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Working Hours:</span>
              <span className="text-muted-foreground">7:00 AM - 9:00 PM</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Location:</span>
              <span className="text-muted-foreground">Kigo, Uganda</span>
            </div>
            <p className="text-muted-foreground text-xs mt-2">
              Contact your administrator to update store settings
            </p>
          </div>
        </section>
      )}

      {/* About */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="font-semibold text-lg mb-4">About</h2>
        <div className="space-y-2">
          <p className="font-medium text-secondary">9Yards Food</p>
          <p className="text-sm text-muted-foreground">
            Kitchen Dashboard v1.0.0
          </p>
          <p className="text-sm text-muted-foreground">
            Powered by Supabase + React
          </p>
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
            © {new Date().getFullYear()} 9Yards Food. All rights reserved.
          </p>
        </div>
      </section>
    </div>
  );
}
