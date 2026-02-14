import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, UtensilsCrossed, Truck, Settings, ChefHat, Users, BarChart3, MoreHorizontal } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "@shared/types/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";

export default function MobileNav() {
  const { role } = useAuth();
  const location = useLocation();

  const primaryLinks = [
    { to: "/orders", label: "Orders", icon: LayoutDashboard, permission: "orders:read" },
    { to: "/kitchen", label: "Kitchen", icon: ChefHat, permission: "orders:read" },
    { to: "/menu", label: "Menu", icon: UtensilsCrossed, permission: "menu:read" },
  ];

  const moreLinks = [
    { to: "/staff", label: "Staff", icon: Users, permission: "staff:read" },
    { to: "/analytics", label: "Analytics", icon: BarChart3, permission: "analytics:read" },
    { to: "/deliveries", label: "Deliveries", icon: Truck, permission: "deliveries:read" },
    { to: "/settings", label: "Settings", icon: Settings, permission: "settings:read" },
  ];

  const filteredPrimary = !role ? primaryLinks : primaryLinks.filter((link) => hasPermission(role, link.permission));
  const filteredMore = !role ? moreLinks : moreLinks.filter((link) => hasPermission(role, link.permission));

  const isMoreActive = filteredMore.some(link => location.pathname === link.to);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t md:hidden z-50 safe-area-pb">
      <div className="flex items-center justify-around py-2">
        {filteredPrimary.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive ? "text-secondary" : "text-muted-foreground"
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
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs font-medium transition-colors",
                  isMoreActive ? "text-secondary" : "text-muted-foreground"
                )}
              >
                <MoreHorizontal className="w-5 h-5" />
                More
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 mb-2">
              {filteredMore.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to;
                return (
                  <DropdownMenuItem key={link.to} asChild>
                    <NavLink
                      to={link.to}
                      className={cn(
                        "flex items-center gap-2 w-full",
                        isActive && "bg-muted"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {link.label}
                    </NavLink>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  );
}
