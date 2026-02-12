import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, UserX, UserCheck } from "lucide-react";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import type { Profile, UserRole } from "@shared/types/auth";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "@shared/types/auth";
import StaffTable from "../components/StaffTable";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@shared/components/ui/dialog";
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
  const { role } = useAuth();
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
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("kitchen");

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
      
      // Create auth user via Supabase admin function (Edge Function)
      const { error } = await supabase.functions.invoke("invite-staff", {
        body: {
          email: inviteEmail,
          full_name: inviteName,
          role: inviteRole,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Staff member invited");
      setShowInvite(false);
      setInviteEmail("");
      setInviteName("");
      setInvitePhone("");
    },
    onError: () => {
      toast.error("Failed to invite staff member");
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
              Invite Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{USE_MOCK_DATA ? "Add Staff Member" : "Invite Staff Member"}</DialogTitle>
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
              {USE_MOCK_DATA ? (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Phone</label>
                  <Input
                    type="tel"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    placeholder="+256700123456"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email</label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="john@9yards.co.ug"
                  />
                </div>
              )}
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
                disabled={inviteMutation.isPending || !inviteName || (!USE_MOCK_DATA && !inviteEmail)}
                className="w-full"
              >
                {inviteMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                {USE_MOCK_DATA ? "Add Member" : "Send Invite"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-8 h-8 border-4 border-secondary border-t-transparent rounded-full" />
        </div>
      ) : (
        <StaffTable
          staff={staff || []}
          onToggleActive={(id, active) => toggleActive.mutate({ id, active })}
        />
      )}
    </div>
  );
}
