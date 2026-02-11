import { UserCheck, UserX } from "lucide-react";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import type { Profile } from "@shared/types/auth";

interface StaffTableProps {
  staff: Profile[];
  onToggleActive: (id: string, active: boolean) => void;
}

export default function StaffTable({ staff, onToggleActive }: StaffTableProps) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="hidden md:grid grid-cols-[1fr_100px_100px_80px] gap-4 px-4 py-3 border-b bg-muted/50 text-sm font-medium text-muted-foreground">
        <span>Name</span>
        <span>Role</span>
        <span>Status</span>
        <span>Actions</span>
      </div>
      {staff.map((member) => (
        <div
          key={member.id}
          className="grid grid-cols-1 md:grid-cols-[1fr_100px_100px_80px] gap-2 md:gap-4 items-center px-4 py-3 border-b"
        >
          <div>
            <p className="font-medium">{member.full_name}</p>
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
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleActive(member.id, !member.active)}
            >
              {member.active ? (
                <UserX className="w-4 h-4" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      ))}
      {staff.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No staff members yet
        </div>
      )}
    </div>
  );
}
