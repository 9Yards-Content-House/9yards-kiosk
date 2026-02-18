import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, UserX, UserCheck, Trash2, Edit2, RefreshCw, Search, Mail, Phone, Calendar } from "lucide-react";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import type { Profile, UserRole } from "@shared/types/auth";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "@shared/types/auth";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@shared/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@shared/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import { toast } from "sonner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@shared/components/ui/tabs";
import { MoreVertical, Shield, User, Trophy, Users } from "lucide-react";
import StaffPerformancePanel from "../components/StaffPerformancePanel";
import { formatPhoneDisplay, normalizePhone } from "@shared/lib/validation";

// Role badge colors
const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  kitchen: "bg-amber-100 text-amber-700 border-amber-200",
  rider: "bg-blue-100 text-blue-700 border-blue-200",
  reception: "bg-green-100 text-green-700 border-green-200",
};

// Mock staff data for development
const MOCK_STAFF: (Profile & { email?: string })[] = [
  {
    id: "user-1",
    full_name: "John Katende",
    phone: "+256700111222",
    email: "john@9yards.co.ug",
    role: "kitchen",
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "user-2",
    full_name: "Sarah Namugalu",
    phone: "+256700333444",
    email: "sarah@9yards.co.ug",
    role: "rider",
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "user-3",
    full_name: "Moses Ocheng",
    phone: "+256700555666",
    email: "moses@9yards.co.ug",
    role: "admin",
    active: true,
    created_at: new Date().toISOString(),
  },
];

// In-memory store for mock mode
let mockStaffStore = [...MOCK_STAFF];

// Format relative time
const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
};

// Helper to get initials from name
function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Staff() {
  const { role, user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const canManage = role ? hasPermission(role, "staff:create") : false;

  const { data: staff, isLoading, refetch } = useQuery<Profile[]>({
    queryKey: ["staff"],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        console.log("📦 Mock mode: returning mock staff");
        return mockStaffStore;
      }
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription for instant sync
  useEffect(() => {
    if (USE_MOCK_DATA) return;

    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('🔄 Profile change detected:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ["staff"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const [showInvite, setShowInvite] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("kitchen");
  
  // Filter staff
  const filteredStaff = staff?.filter((member) => {
    const matchesSearch = !search || 
      member.full_name.toLowerCase().includes(search.toLowerCase()) ||
      member.phone?.toLowerCase().includes(search.toLowerCase()) ||
      member.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });
  
  // Edit state
  const [editingMember, setEditingMember] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("kitchen");

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (USE_MOCK_DATA) {
        const newStaff: Profile = {
          id: `user-${Date.now()}`,
          full_name: inviteName,
          phone: normalizePhone(invitePhone) || null,
          role: inviteRole,
          active: true,
          created_at: new Date().toISOString(),
        };
        mockStaffStore = [newStaff, ...mockStaffStore];
        return;
      }

      if (!canManage) throw new Error("Unauthorized to create staff");
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: inviteEmail,
        password: invitePassword,
        options: {
          data: {
            full_name: inviteName,
            role: inviteRole,
          },
        },
      });
      
      if (authError) throw authError;
      
      if (authData.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: inviteName,
            phone: normalizePhone(invitePhone) || null,
            role: inviteRole,
          })
          .eq("id", authData.user.id);
        
        if (profileError) throw profileError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Staff member created! They can now log in.");
      setShowInvite(false);
      setInviteEmail("");
      setInvitePassword("");
      setInviteName("");
      setInvitePhone("");
      setInviteRole("kitchen");
    },
    onError: (err: Error) => {
      console.error("Failed to create staff:", err);
      toast.error(err.message || "Failed to create staff member");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Profile> }) => {
      if (USE_MOCK_DATA) {
        const member = mockStaffStore.find(s => s.id === id);
        if (member) Object.assign(member, updates);
        return;
      }
      
      if (!canManage) throw new Error("Unauthorized to edit staff");

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Staff member updated");
      setEditingMember(null);
    },
    onError: () => {
      toast.error("Failed to update staff member");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (USE_MOCK_DATA) {
        const member = mockStaffStore.find(s => s.id === id);
        if (member) member.active = active;
        return;
      }
      
      if (!canManage) throw new Error("Unauthorized to change status");
      if (id === user?.id) throw new Error("You cannot deactivate yourself");

      const { error } = await supabase
        .from("profiles")
        .update({ active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (USE_MOCK_DATA) {
        mockStaffStore = mockStaffStore.filter(s => s.id !== id);
        return;
      }
      
      if (!canManage) throw new Error("Unauthorized to remove staff");
      if (id === user?.id) throw new Error("You cannot remove yourself");
      
      const { data, error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", id)
        .select();
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ active: false })
          .eq("id", id);
        
        if (updateError) throw new Error("Could not delete or deactivate user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Staff member removed");
    },
    onError: (err: Error) => {
      console.error("Delete mutation error:", err);
      toast.error(err.message || "Failed to remove staff member");
    },
  });

  const openEditDialog = (member: Profile) => {
    setEditingMember(member);
    setEditName(member.full_name);
    setEditPhone(member.phone || "");
    setEditRole(member.role);
  };

  const handleEditSave = () => {
    if (!editingMember) return;
    updateMutation.mutate({
      id: editingMember.id,
      updates: {
        full_name: editName,
        phone: normalizePhone(editPhone) || null,
        role: editRole,
      },
    });
  };

  if (authLoading) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">You don't have access to staff management.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#212282]">Staff Management</h1>
          <p className="text-muted-foreground text-sm font-medium">Manage your team, roles, and performance</p>
        </div>
        <Dialog open={showInvite} onOpenChange={setShowInvite}>
          <DialogTrigger asChild>
            <Button className="hidden md:flex bg-secondary hover:bg-secondary/90 text-white font-bold h-11 px-6 rounded-xl shadow-sm transition-all active:scale-[0.98] gap-2">
              <Plus className="w-5 h-5" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Add New Staff Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground/80">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Enter full name"
                    className="pl-9 h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground/80">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@9yards.co.ug"
                    className="pl-9 h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground/80">Login Password</label>
                <Input
                  type="password"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground/80">Phone Number (Uganda)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    placeholder="07..."
                    className="pl-9 h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground/80">Assign Role</label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="kitchen">Kitchen Staff</SelectItem>
                    <SelectItem value="rider">Delivery Rider</SelectItem>
                    <SelectItem value="reception">Reception</SelectItem>
                    <SelectItem value="admin">System Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => inviteMutation.mutate()}
                disabled={
                  inviteMutation.isPending || 
                  !inviteName || 
                  !inviteEmail || 
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail) ||
                  !invitePassword || 
                  invitePassword.length < 6
                }
                className="w-full bg-secondary h-12 rounded-xl font-bold text-white mt-2 shadow-sm active:scale-[0.98] transition-all"
              >
                {inviteMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Create Staff Member"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="directory" className="flex-1 flex flex-col min-h-0">
        <div className="px-6 border-b bg-white">
          <TabsList className="bg-transparent h-12 gap-6 p-0">
            <TabsTrigger 
              value="directory" 
              className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-secondary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold transition-all px-2"
            >
              <Users className="w-4 h-4 mr-2" />
              Team Directory
            </TabsTrigger>
            <TabsTrigger 
              value="performance" 
              className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-secondary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold transition-all px-2"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="directory" className="flex-1 overflow-auto m-0 p-4 md:p-6 pb-24 md:pb-6 relative">
          {/* Search and Filter Row - Sticky on Mobile */}
          <div className="sticky top-0 z-10 bg-slate-50/10 backdrop-blur-md -mx-4 px-4 py-3 mb-4 md:relative md:bg-transparent md:p-0 md:m-0 md:mb-6 border-b md:border-0 border-slate-200/60">
            <div className="flex flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="pl-9 h-10 md:h-11 rounded-xl shadow-sm border-slate-200 bg-white"
                />
              </div>
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | "all")}>
                <SelectTrigger className="w-[110px] sm:w-[150px] md:w-[180px] h-10 md:h-11 rounded-xl shadow-sm border-slate-200 bg-white px-3">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="rider">Riders</SelectItem>
                  <SelectItem value="reception">Reception</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-secondary" />
              <p className="text-sm font-medium">Loading team directory...</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-full">
              {/* Desktop/Tablet Header */}
              <div className="hidden md:grid grid-cols-[1fr_200px_100px_60px] lg:grid-cols-[1fr_200px_120px_100px_120px_60px] gap-4 px-6 py-4 border-b bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Staff Member</span>
                <span>Contact Details</span>
                <span className="hidden lg:block">Role</span>
                <span>Status</span>
                <span className="hidden lg:block text-center">Member Since</span>
                <span className="text-right">Actions</span>
              </div>

              {/* Staff List */}
              <div className="divide-y divide-slate-100">
                {filteredStaff?.map((member) => {
                  const isCurrentUser = member.id === user?.id;
                  return (
                    <div
                      key={member.id}
                      className="group flex flex-col md:grid md:grid-cols-[1fr_200px_100px_60px] lg:grid-cols-[1fr_200px_120px_100px_120px_60px] gap-3 md:gap-4 px-6 py-5 md:py-4 items-center hover:bg-slate-50/50 transition-all border-l-2 border-transparent hover:border-secondary"
                    >
                      {/* Name & Identity */}
                      <div className="w-full flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0 overflow-hidden border-2 border-white shadow-sm">
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="bg-gradient-to-br from-slate-100 to-slate-200 w-full h-full flex items-center justify-center">
                              {getInitials(member.full_name || member.email || "Staff")}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate flex items-center gap-2">
                            {member.full_name || member.email?.split('@')[0]}
                            {isCurrentUser && (
                              <span className="px-1.5 py-0.5 rounded bg-orange-50 text-[9px] font-black text-orange-600 border border-orange-100 uppercase tracking-tight">Me</span>
                            )}
                          </p>
                          <div className="md:hidden flex flex-col gap-1.5 mt-2">
                             {/* Mobile Contact Shortcuts */}
                             <div className="flex flex-col gap-1">
                               {member.email && (
                                 <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate">
                                   <Mail className="w-3 h-3 text-slate-400" />
                                   <span className="truncate">{member.email}</span>
                                 </div>
                               )}
                               {member.phone && (
                                 <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                   <Phone className="w-3 h-3 text-slate-400" />
                                   <span>{formatPhoneDisplay(member.phone)}</span>
                                 </div>
                               )}
                             </div>
                             {/* Mobile Badges Row */}
                             <div className="flex items-center gap-2">
                               <Badge variant="outline" className={`capitalize border ${ROLE_COLORS[member.role]} text-[9px] py-0 h-4 px-1.5 font-medium`}>
                                 {member.role}
                               </Badge>
                               <Badge variant={member.active ? "default" : "destructive"} className="h-4 text-[9px] px-1.5 font-bold border-0">
                                 {member.active ? "Active" : "Inactive"}
                               </Badge>
                               <div className="flex items-center gap-1 text-[9px] text-slate-400 font-medium ml-auto">
                                 <Calendar className="w-2.5 h-2.5" />
                                 {formatRelativeTime(member.created_at)}
                               </div>
                             </div>
                          </div>
                        </div>
                      </div>

                      {/* Contact Info (Desktop/Tablet) */}
                      <div className="hidden md:flex flex-col gap-1 w-full min-w-0">
                        {member.email || member.phone ? (
                          <>
                            {member.email && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                                <Mail className="w-3 h-3 shrink-0 text-slate-400" />
                                <span className="truncate">{member.email}</span>
                              </div>
                            )}
                            {member.phone && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Phone className="w-3 h-3 shrink-0 text-slate-400" />
                                <span>{formatPhoneDisplay(member.phone)}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic font-medium">No contact added</span>
                        )}
                      </div>

                      {/* Desktop Role (Hidden on medium tablets to save space) */}
                      <div className="hidden lg:block">
                        <Badge variant="outline" className={`capitalize border ${ROLE_COLORS[member.role]} font-medium text-[11px]`}>
                          {member.role}
                        </Badge>
                      </div>

                      {/* Desktop Status */}
                      <div className="hidden md:block">
                        <Badge variant={member.active ? "default" : "destructive"} className="text-[11px] font-bold h-6">
                          {member.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      {/* Joined Date (Desktop Only) */}
                      <div className="hidden lg:flex flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground">
                        <span className="font-medium text-slate-400 uppercase text-[9px]">Since</span>
                        {formatRelativeTime(member.created_at)}
                      </div>

                      {/* Actions */}
                      <div className="w-full md:w-auto flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-slate-100 rounded-lg">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5 shadow-xl">
                            <DropdownMenuItem 
                              onClick={() => openEditDialog(member)}
                              className="rounded-lg gap-2.5 py-2 cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4 text-slate-500" /> 
                              <span className="font-medium text-sm text-slate-700">Edit Details</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => toggleActive.mutate({ id: member.id, active: !member.active })}
                              disabled={isCurrentUser}
                              className="rounded-lg gap-2.5 py-2 cursor-pointer"
                            >
                              {member.active ? (
                                <><UserX className="w-4 h-4 text-orange-500" /> <span className="font-medium text-sm text-slate-700">Deactivate</span></>
                              ) : (
                                <><UserCheck className="w-4 h-4 text-green-500" /> <span className="font-medium text-sm text-slate-700">Activate User</span></>
                              )}
                            </DropdownMenuItem>
                            <div className="my-1 border-t border-slate-100" />
                            <DropdownMenuItem 
                              className="rounded-lg gap-2.5 py-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                              onSelect={(e) => e.preventDefault()}
                              disabled={isCurrentUser}
                            >
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <div className="flex items-center gap-2.5 w-full">
                                    <Trash2 className="w-4 h-4" /> 
                                    <span className="font-medium text-sm">Remove Staff</span>
                                  </div>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-2xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Staff Member?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently remove {member.full_name} from the system. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="gap-2">
                                    <AlertDialogCancel className="rounded-xl font-bold">Keep Staff</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteMutation.mutate(member.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold px-6"
                                    >
                                      Yes, Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
                {(!filteredStaff || filteredStaff.length === 0) && (
                  <div className="p-12 text-center flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                      <Search className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">No team members found</p>
                      <p className="text-sm text-muted-foreground">Try adjusting your search or role filters</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="flex-1 overflow-auto m-0 p-4 md:p-6 pb-20 md:pb-6">
          <div className="max-w-4xl mx-auto">
            <StaffPerformancePanel />
          </div>
        </TabsContent>
      </Tabs>

      {/* Floating Action Button (FAB) for Mobile Staff Creation */}
      {canManage && (
        <Dialog open={showInvite} onOpenChange={setShowInvite}>
          <DialogTrigger asChild>
            <Button 
              className="md:hidden fixed bottom-24 right-6 w-14 h-14 rounded-full bg-secondary hover:bg-secondary/90 text-white shadow-2xl active:scale-95 transition-all z-50 p-0 flex items-center justify-center border-4 border-white"
              aria-label="Add Staff Member"
            >
              <Plus className="w-7 h-7" />
            </Button>
          </DialogTrigger>
          {/* DialogContent already handled in desktop header block */}
        </Dialog>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Staff Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground/80">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="pl-9 h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground/80">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="pl-9 h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground/80">Staff Role</label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="kitchen">Kitchen Staff</SelectItem>
                  <SelectItem value="rider">Delivery Rider</SelectItem>
                  <SelectItem value="reception">Reception</SelectItem>
                  <SelectItem value="admin">System Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleEditSave}
              disabled={updateMutation.isPending || !editName}
              className="w-full bg-secondary h-12 rounded-xl font-bold text-white mt-2 shadow-sm active:scale-[0.98] transition-all"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
