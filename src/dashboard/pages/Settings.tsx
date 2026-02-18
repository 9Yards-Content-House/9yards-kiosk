import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
import { Bell, Volume2, Smartphone, Edit2, Loader2, Store, Printer, Save, Check, Key, Eye, EyeOff, Shield, Info, Usb, RefreshCw } from "lucide-react";
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

  // PIN management state
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [usePasswordVerify, setUsePasswordVerify] = useState(false);
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [hasExistingPin, setHasExistingPin] = useState(false);

  // Check if user has existing PIN
  useEffect(() => {
    const checkExistingPin = async () => {
      if (!user?.id || USE_MOCK_DATA) return;
      
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("pin_hash")
          .eq("id", user.id)
          .single();
        
        if (!error && data) {
          setHasExistingPin(!!data.pin_hash);
        }
      } catch (err) {
        console.warn("Failed to check PIN status:", err);
      }
    };
    
    checkExistingPin();
  }, [user?.id]);

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
    toast.success(enabled ? "Auto-print enabled" : "Auto-print disabled");
  };

  // Handle print copies change
  const handlePrintCopies = (copies: number) => {
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

  // Reset PIN dialog state
  const resetPinDialog = () => {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setCurrentPassword("");
    setUsePasswordVerify(false);
    setShowCurrentPin(false);
    setShowNewPin(false);
  };

  // Handle PIN update
  const handlePinUpdate = async () => {
    if (!/^\d{4,6}$/.test(newPin)) {
      toast.error("PIN must be 4-6 digits");
      return;
    }
    
    if (newPin !== confirmPin) {
      toast.error("PINs do not match");
      return;
    }

    if (hasExistingPin && !currentPin && !currentPassword) {
      toast.error("Please enter your current PIN or password to verify");
      return;
    }

    setIsSavingPin(true);
    try {
      if (USE_MOCK_DATA) {
        toast.success("PIN updated (mock)");
        setPinDialogOpen(false);
        resetPinDialog();
        setHasExistingPin(true);
        setIsSavingPin(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("set-pin", {
        body: {
          newPin,
          currentPin: usePasswordVerify ? undefined : currentPin,
          currentPassword: usePasswordVerify ? currentPassword : undefined,
        },
      });

      if (error) throw new Error(error.message || "Failed to update PIN");
      if (!data.success) throw new Error(data.error || "Failed to update PIN");

      toast.success(hasExistingPin ? "PIN updated successfully" : "PIN set successfully");
      setPinDialogOpen(false);
      resetPinDialog();
      setHasExistingPin(true);
    } catch (err) {
      console.error("PIN update error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to update PIN");
    } finally {
      setIsSavingPin(false);
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
        <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">You don't have access to settings.</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10 shadow-sm">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-primary uppercase tracking-tight">Settings</h1>
          <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Dashboard & Account Preferences</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <motion.section 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[2rem] border border-slate-100 p-5 md:p-6 shadow-sm overflow-hidden relative group"
        >
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-primary/20">
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
              </div>
              <div>
                <h2 className="text-lg font-black text-primary uppercase tracking-tight">Profile</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-widest">
                    {profile?.role || "User"}
                  </span>
                  {profile?.active && (
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-600 text-[8px] font-black uppercase tracking-widest">
                      Active
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl border-slate-100 font-black uppercase tracking-widest text-[10px] h-9 shadow-sm hover:bg-slate-50">
                  <Edit2 className="w-3.5 h-3.5 mr-2" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2rem] md:rounded-[2.5rem] w-[95vw] max-w-lg p-6">
                <DialogHeader>
                  <DialogTitle className="font-black text-primary uppercase tracking-tight">Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Your name"
                      className="rounded-2xl border-slate-100 focus:ring-primary focus:border-primary font-bold h-12"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                    <Input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+256700123456"
                      className="rounded-2xl border-slate-100 focus:ring-primary focus:border-primary font-bold h-12"
                    />
                  </div>
                  <Button
                    onClick={handleProfileUpdate}
                    disabled={isSaving || !editName}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/10 transition-all active:scale-[0.98]"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
            <div className="p-4 bg-slate-50/50 border border-slate-100/50 rounded-2xl transition-colors hover:bg-white hover:border-slate-200">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Name</p>
              <p className="text-sm font-black text-primary tracking-tight">{profile?.full_name}</p>
            </div>
            <div className="p-4 bg-slate-50/50 border border-slate-100/50 rounded-2xl transition-colors hover:bg-white hover:border-slate-200">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone Number</p>
              <p className="text-sm font-black text-primary tracking-tight">{profile?.phone || "Not set"}</p>
            </div>
            <div className="p-4 bg-slate-50/50 border border-slate-100/50 rounded-2xl transition-colors hover:bg-white hover:border-slate-200 md:col-span-2">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
              <p className="text-sm font-black text-primary tracking-tight truncate">{user?.email}</p>
            </div>
          </div>
        </motion.section>

        {/* Security / PIN */}
        <motion.section 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[2rem] border border-slate-100 p-5 md:p-6 shadow-sm overflow-hidden relative group"
        >
          
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-[#F05223]/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#F05223]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-primary uppercase tracking-tight leading-none mb-1">Security</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manage your login PIN</p>
            </div>
          </div>

          <div className="space-y-4 relative z-10">
            {/* PIN Status */}
            <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
                  <Key className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-tight">PIN Login Status</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                    {hasExistingPin ? "Active & Secured" : "Not configured"}
                  </p>
                </div>
              </div>
              {hasExistingPin && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-[8px] font-black uppercase tracking-widest">
                  <Check className="w-3 h-3" />
                  Active
                </span>
              )}
            </div>

            <Dialog open={pinDialogOpen} onOpenChange={(open) => {
              setPinDialogOpen(open);
              if (!open) resetPinDialog();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full h-12 rounded-2xl border-slate-100 font-black uppercase tracking-widest text-[10px] shadow-sm hover:bg-slate-50">
                  <Key className="w-4 h-4 mr-2 text-primary" />
                  {hasExistingPin ? "Change Security PIN" : "Setup Login PIN"}
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2rem] md:rounded-[2.5rem] w-[95vw] max-w-lg p-6">
                <DialogHeader>
                  <DialogTitle className="font-black text-primary uppercase tracking-tight">
                    {hasExistingPin ? "Change Security PIN" : "Setup Login PIN"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {hasExistingPin && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verify Identity</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setUsePasswordVerify(!usePasswordVerify)}
                          className="text-[9px] font-black uppercase text-primary p-0 h-auto"
                        >
                          {usePasswordVerify ? "Use PIN" : "Forgot PIN?"}
                        </Button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          {usePasswordVerify ? "Account Password" : "Current PIN"}
                        </label>
                        <div className="relative">
                          <Input
                            type={usePasswordVerify ? "password" : (showCurrentPin ? "text" : "password")}
                            value={usePasswordVerify ? currentPassword : currentPin}
                            onChange={(e) => usePasswordVerify ? setCurrentPassword(e.target.value) : setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder={usePasswordVerify ? "Enter password" : "••••••"}
                            className="rounded-2xl border-slate-100 focus:ring-primary font-black tracking-[0.5em] h-12 pr-10"
                          />
                          {!usePasswordVerify && (
                            <button
                              type="button"
                              onClick={() => setShowCurrentPin(!showCurrentPin)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                            >
                              {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New PIN</label>
                    <Input
                      type={showNewPin ? "text" : "password"}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="••••••"
                      maxLength={6}
                      className="rounded-2xl border-slate-100 focus:ring-primary font-black tracking-[0.5em] h-12 pr-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm PIN</label>
                    <Input
                      type="password"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="••••••"
                      maxLength={6}
                      className="rounded-2xl border-slate-100 focus:ring-primary font-black tracking-[0.5em] h-12"
                    />
                  </div>

                  <Button
                    onClick={handlePinUpdate}
                    disabled={isSavingPin || newPin.length < 4 || newPin !== confirmPin}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/10"
                  >
                    {isSavingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Security PIN"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.section>

        {/* Notifications */}
        <motion.section 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-[2rem] border border-slate-100 p-5 md:p-6 shadow-sm overflow-hidden relative group"
        >
          
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-black text-primary uppercase tracking-tight leading-none mb-1">Notifications</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order alerts & sound</p>
            </div>
          </div>

          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-tight">Order Alert Sound</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Play sound on new orders</p>
                </div>
              </div>
              <Switch checked={soundEnabled} onCheckedChange={handleSoundToggle} />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
              <div className="flex items-center gap-3">
                <Smartphone className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-tight">Push Notifications</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {permission === "granted" ? (subscribed ? "Active on this device" : "Permission granted") : "Not enabled"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={subscribed ? unsubscribe : requestPermission}
                disabled={pushLoading}
                className="rounded-xl font-black uppercase tracking-widest text-[9px] h-8"
              >
                {pushLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : (subscribed ? "Disable" : "Enable")}
              </Button>
            </div>
          </div>
        </motion.section>

        {/* Admin sections */}
        {role === "admin" && (
          <>
            {/* Printing */}
            <motion.section 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-[2rem] border border-slate-100 p-5 md:p-6 shadow-sm overflow-hidden relative group"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Printer className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-primary uppercase tracking-tight leading-none mb-1">Printing</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt printer setup</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                  <div className="flex items-center gap-3">
                    <Usb className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-tight">Auto-print Receipts</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Print on completion</p>
                    </div>
                  </div>
                  <Switch checked={autoPrint} onCheckedChange={handleAutoPrintToggle} />
                </div>
                <Button 
                  variant="outline" 
                  className="w-full h-11 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                  onClick={() => toast.info("Searching for local printers...")}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-2" />
                  Re-discover Printer
                </Button>
              </div>
            </motion.section>

            {/* Store Information */}
            <motion.section 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-[2rem] border border-slate-100 p-5 md:p-6 shadow-sm overflow-hidden relative group"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-[#F05223]/10 flex items-center justify-center">
                  <Store className="w-5 h-5 text-[#F05223]" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-primary uppercase tracking-tight leading-none mb-1">Store Info</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business details</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Store Name</label>
                  <Input defaultValue="9Yards Content House" className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Receipt Footer</label>
                  <textarea 
                    className="w-full h-20 rounded-xl border border-slate-100 focus:ring-primary p-3 text-xs font-medium resize-none"
                    defaultValue="Thank you for visiting 9Yards!"
                  />
                </div>
                <Button 
                  className="w-full h-11 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-[10px]"
                  onClick={() => toast.success("Store details updated")}
                >
                  Update Store Details
                </Button>
              </div>
            </motion.section>
          </>
        )}

        {/* About Section */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center justify-center pt-8 pb-12 space-y-4"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 shadow-sm">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Version 2.4.0 (Production)</span>
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
            &copy; {new Date().getFullYear()} 9YARDS CONTENT HOUSE • ALL RIGHTS RESERVED
          </p>
        </motion.section>
      </div>
    </motion.div>
  );
}
