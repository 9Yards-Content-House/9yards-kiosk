import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, UtensilsCrossed, Truck, Settings, ChefHat, Users, BarChart3, MoreHorizontal, MessageSquare, Building2, FolderOpen, LogOut } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "@shared/types/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";

export default function MobileNav() {
  const { role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const primaryLinks = [
    { to: "/orders", label: "Orders", icon: LayoutDashboard, permission: "orders:read" },
    { to: "/reception", label: "Reception", icon: Building2, permission: "reception:read" },
    { to: "/menu", label: "Menu", icon: UtensilsCrossed, permission: "menu:read" },
    { to: "/analytics", label: "Analytics", icon: BarChart3, permission: "analytics:read" },
  ];

  const moreLinks = [
    { to: "/categories", label: "Categories", icon: FolderOpen, permission: "menu:read" },
    { to: "/staff", label: "Staff", icon: Users, permission: "staff:read" },
    { to: "/feedback", label: "Feedback", icon: MessageSquare, permission: "analytics:read" },
    { to: "/deliveries", label: "Deliveries", icon: Truck, permission: "deliveries:read" },
    { to: "/settings", label: "Settings", icon: Settings, permission: "settings:read" },
  ];

  const filteredPrimary = !role ? primaryLinks : primaryLinks.filter((link) => hasPermission(role, link.permission));
  const filteredMore = !role ? moreLinks : moreLinks.filter((link) => hasPermission(role, link.permission));

  const isMoreActive = filteredMore.some(link => location.pathname === link.to);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t md:hidden z-50 safe-area-pb">
      <div className="flex items-center justify-around py-1">
        {filteredPrimary.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                   "flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] px-3 py-2 text-[10px] font-medium transition-colors rounded-lg",
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground active:bg-muted"
                )
              }
            >
              <Icon className="w-5 h-5" />
              {link.label}
            </NavLink>
          );
        })}

        {filteredMore.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] px-3 py-2 text-[10px] font-medium transition-colors rounded-lg",
                  isMoreActive ? "text-primary bg-primary/10" : "text-muted-foreground active:bg-muted"
                )}
              >
                <MoreHorizontal className="w-5 h-5" />
                More
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mb-4 p-2 shadow-xl border-2">
              <div className="grid grid-cols-2 gap-1 mb-2">
                {filteredMore.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.to;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all border",
                        isActive 
                          ? "bg-primary/5 text-primary border-primary/20 font-bold" 
                          : "text-muted-foreground border-transparent hover:bg-muted active:scale-95"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px]">{link.label}</span>
                    </NavLink>
                  );
                })}
              </div>
              
              <DropdownMenuSeparator className="my-2" />
              
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="flex items-center gap-3 py-3 px-4 text-destructive focus:text-destructive focus:bg-destructive/5 rounded-xl cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-semibold">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  );
}
