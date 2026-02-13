import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, UserX, UserCheck, Trash2, Edit2 } from "lucide-react";
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
import { toast } from "sonner";

// Mock staff data for development
const MOCK_STAFF: Profile[] = [
  {
    id: "user-1",
    full_name: "John Katende",
    phone: "+256700111222",
    role: "kitchen",
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "user-2",
    full_name: "Sarah Namugalu",
    phone: "+256700333444",
    role: "rider",
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "user-3",
    full_name: "Moses Ocheng",
    phone: "+256700555666",
    role: "admin",
    active: true,
    created_at: new Date().toISOString(),
  },
];

// In-memory store for mock mode
let mockStaffStore = [...MOCK_STAFF];

export default function Staff() {
  const { role, user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const canManage = role ? hasPermission(role, "staff:create") : false;

  const { data: staff, isLoading } = useQuery<Profile[]>({
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

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("kitchen");
  
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
    onError: (err: any) => {
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
      
      // Delete the profile (the user in auth.users will remain but be inactive)
      // In production, you'd use a service role function to fully delete the auth user
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Staff member removed");
    },
    onError: (err: any) => {
      console.error("Delete error:", err);
      toast.error("Failed to remove staff member");
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
      <div className="flex items-center justify-between mb-6">
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
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="kitchen">Kitchen Staff</option>
                  <option value="rider">Rider</option>
                  <option value="admin">Admin</option>
                </select>
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
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                className="w-full h-10 px-3 rounded-md border bg-background text-sm"
              >
                <option value="kitchen">Kitchen Staff</option>
                <option value="rider">Rider</option>
                <option value="admin">Admin</option>
              </select>
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
          <div className="hidden md:grid grid-cols-[1fr_100px_100px_140px] gap-4 px-4 py-3 border-b bg-muted/50 text-sm font-medium text-muted-foreground">
            <span>Name</span>
            <span>Role</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {staff?.map((member) => {
            const isCurrentUser = member.id === user?.id;
            return (
              <div
                key={member.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_100px_100px_140px] gap-2 md:gap-4 items-center px-4 py-3 border-b"
              >
                <div>
                  <p className="font-medium">
                    {member.full_name}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                    )}
                  </p>
                  {member.phone && (
                    <p className="text-xs text-muted-foreground">{member.phone}</p>
                  )}
                </div>
                <div>
                  <Badge variant="secondary" className="capitalize">
                    {member.role}
                  </Badge>
                </div>
                <div>
                  <Badge variant={member.active ? "default" : "destructive"}>
                    {member.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive.mutate({ id: member.id, active: !member.active })}
                    disabled={isCurrentUser}
                    title={member.active ? "Deactivate" : "Activate"}
                  >
                    {member.active ? (
                      <UserX className="w-4 h-4" />
                    ) : (
                      <UserCheck className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(member)}
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isCurrentUser}
                        className="text-destructive hover:text-destructive"
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
            );
          })}
          {(!staff || staff.length === 0) && (
            <div className="p-8 text-center text-muted-foreground">
              No staff members yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
