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
import { MoreVertical } from "lucide-react";

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
      
      console.log("📡 Fetching staff from Supabase...");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("❌ Error fetching staff:", error);
        throw error;
      }
      
      console.log("✅ Fetched staff:", data?.length, "members");
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
        // Mock: just add to local store
        const newStaff: Profile = {
          id: `user-${Date.now()}`,
          full_name: inviteName,
          phone: invitePhone || null,
          role: inviteRole,
          active: true,
          created_at: new Date().toISOString(),
        };
        mockStaffStore = [newStaff, ...mockStaffStore];
        console.log("📦 Mock: Added staff member:", inviteName);
        return;
      }
      
      // Create user via Supabase Auth API
      // Note: This requires the service role key for admin operations
      // For now, we create via signUp and update profile
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
      
      // Update the profile with additional info
      if (authData.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: inviteName,
            phone: invitePhone || null,
            role: inviteRole,
          })
          .eq("id", authData.user.id);
        
        if (profileError) {
          console.warn("Profile update failed:", profileError);
        }
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
        if (member) {
          Object.assign(member, updates);
        }
        console.log(`📦 Mock: Updated staff ${id}`);
        return;
      }
      
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
        if (member) {
          member.active = active;
        }
        console.log(`📦 Mock: Toggled staff ${id} active to: ${active}`);
        return;
      }
      
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
        console.log(`📦 Mock: Deleted staff ${id}`);
        return;
      }
      
      console.log(`🗑️ Attempting to delete profile: ${id}`);
      
      // First try to delete from profiles
      const { data, error, count } = await supabase
        .from("profiles")
        .delete()
        .eq("id", id)
        .select();
      
      if (error) {
        console.error("❌ Delete error:", error);
        throw new Error(error.message || "Failed to delete profile");
      }
      
      console.log("✅ Delete result:", { data, count });
      
      // If no rows were affected, the delete might have been blocked by RLS
      if (!data || data.length === 0) {
        // Instead of failing, mark as inactive
        console.log("⚠️ Delete returned no rows, marking as inactive instead");
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ active: false })
          .eq("id", id);
        
        if (updateError) {
          throw new Error("Could not delete or deactivate user");
        }
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
        phone: editPhone || null,
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
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground">{staff?.length || 0} team members</p>
        </div>
        <Dialog open={showInvite} onOpenChange={setShowInvite}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium mb-1.5">Full Name</label>
                <Input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="john@9yards.co.ug"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Password</label>
                <Input
                  type="password"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Phone (optional)</label>
                <Input
                  type="tel"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="+256700123456"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Role</label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kitchen">Kitchen Staff</SelectItem>
                    <SelectItem value="rider">Rider</SelectItem>
                    <SelectItem value="reception">Reception</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => inviteMutation.mutate()}
                disabled={inviteMutation.isPending || !inviteName || !inviteEmail || !invitePassword || invitePassword.length < 6}
                className="w-full"
              >
                {inviteMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                Create Staff Member
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team members..."
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | "all")}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="kitchen">Kitchen</SelectItem>
            <SelectItem value="rider">Rider</SelectItem>
            <SelectItem value="reception">Reception</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Phone</label>
              <Input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Role</label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kitchen">Kitchen Staff</SelectItem>
                  <SelectItem value="rider">Rider</SelectItem>
                  <SelectItem value="reception">Reception</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleEditSave}
              disabled={updateMutation.isPending || !editName}
              className="w-full"
            >
              {updateMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-8 h-8 border-4 border-secondary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_140px_100px_100px_100px_140px] gap-4 px-4 py-3 border-b bg-muted/50 text-sm font-medium text-muted-foreground">
            <span>Name</span>
            <span>Contact</span>
            <span>Role</span>
            <span>Status</span>
            <span>Joined</span>
            <span>Actions</span>
          </div>
          {filteredStaff?.map((member) => {
            const isCurrentUser = member.id === user?.id;
            const memberEmail = member.email;
            return (
              <div
                key={member.id}
                className="flex flex-col md:grid md:grid-cols-[1fr_140px_100px_100px_100px_140px] gap-3 md:gap-4 px-4 py-4 md:py-3 border-b hover:bg-muted/30 transition-colors relative"
              >
                {/* Mobile Header: Name + Status */}
                <div className="flex items-center justify-between md:hidden">
                  <div>
                    <p className="font-medium text-base">
                      {member.full_name}
                      {isCurrentUser && (
                        <Badge variant="outline" className="ml-2 text-[10px] py-0">You</Badge>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`capitalize border ${ROLE_COLORS[member.role]} text-xs py-0 h-5`}>
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                  <Badge variant={member.active ? "default" : "destructive"} className="h-6">
                    {member.active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {/* Desktop Name */}
                <div className="hidden md:block">
                  <p className="font-medium">
                    {member.full_name}
                    {isCurrentUser && (
                      <Badge variant="outline" className="ml-2 text-[10px] py-0">You</Badge>
                    )}
                  </p>
                </div>

                {/* Contact Info */}
                <div className="space-y-1 md:space-y-0.5">
                  {memberEmail && (
                    <div className="flex items-center gap-2 md:gap-1.5 text-sm md:text-xs text-muted-foreground">
                      <Mail className="w-4 h-4 md:w-3 md:h-3" />
                      <span className="truncate">{memberEmail}</span>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-2 md:gap-1.5 text-sm md:text-xs text-muted-foreground">
                      <Phone className="w-4 h-4 md:w-3 md:h-3" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                </div>

                {/* Desktop Role */}
                <div className="hidden md:block">
                  <Badge variant="outline" className={`capitalize border ${ROLE_COLORS[member.role]}`}>
                    {member.role}
                  </Badge>
                </div>

                {/* Desktop Status */}
                <div className="hidden md:block">
                  <Badge variant={member.active ? "default" : "destructive"}>
                    {member.active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {/* Joined Date */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 md:mt-0">
                  <Calendar className="w-3 h-3" />
                  <span className="md:hidden">Joined: </span>
                  <span>{formatRelativeTime(member.created_at)}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 absolute top-4 right-2 md:static">
                  {/* Mobile Actions */}
                  <div className="md:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => openEditDialog(member)}
                          className="flex items-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => toggleActive.mutate({ id: member.id, active: !member.active })}
                          disabled={isCurrentUser}
                          className="flex items-center gap-2"
                        >
                          {member.active ? (
                            <><UserX className="w-4 h-4 text-orange-500" /> Deactivate</>
                          ) : (
                            <><UserCheck className="w-4 h-4 text-green-500" /> Activate</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive flex items-center gap-2"
                          onSelect={(e) => e.preventDefault()}
                          disabled={isCurrentUser}
                        >
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <div className="flex items-center gap-2 w-full">
                                <Trash2 className="w-4 h-4" /> Remove Staff
                              </div>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Staff Member?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove {member.full_name} from the system. They will no longer be able to access the dashboard.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteMutation.mutate(member.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Desktop Actions */}
                  <div className="hidden md:flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive.mutate({ id: member.id, active: !member.active })}
                      disabled={isCurrentUser}
                      title={member.active ? "Deactivate" : "Activate"}
                      className="px-3 h-9"
                    >
                      {member.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(member)}
                      title="Edit"
                      className="px-3 h-9"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isCurrentUser}
                          className="text-destructive hover:text-destructive px-3 h-9"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Staff Member?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove {member.full_name} from the system. They will no longer be able to access the dashboard.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteMutation.mutate(member.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            );
          })}
          {(!filteredStaff || filteredStaff.length === 0) && (
            <div className="p-8 text-center text-muted-foreground">
              {search || roleFilter !== "all" ? "No staff members match your filters" : "No staff members yet"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
