import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  BarChart3,
  Settings,
  Truck,
  LogOut,
  ChefHat,
} from "lucide-react";
import { cn } from "@shared/lib/utils";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "@shared/types/auth";
import NotificationBell from "./NotificationBell";

export default function Sidebar() {
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // Define all navigation links
  const allLinks = [
    { to: "/orders", label: "Orders", icon: LayoutDashboard, permission: "orders:read" },
    { to: "/kitchen", label: "Kitchen Display", icon: ChefHat, permission: "orders:read" },
    { to: "/menu", label: "Menu", icon: UtensilsCrossed, permission: "menu:read" },
    { to: "/staff", label: "Staff", icon: Users, permission: "staff:read" },
    { to: "/analytics", label: "Analytics", icon: BarChart3, permission: "analytics:read" },
    { to: "/deliveries", label: "Deliveries", icon: Truck, permission: "deliveries:read" },
    { to: "/settings", label: "Settings", icon: Settings, permission: "settings:read" },
  ];

  // Show all links if no role (graceful fallback), otherwise filter by permissions
  const links = !role 
    ? allLinks 
    : allLinks.filter((link) => hasPermission(role, link.permission));

  return (
    <aside className="dashboard-sidebar">
      {/* Logo */}
      <div className="p-4 border-b flex items-center gap-3">
        <img
          src="/images/logo/9Yards-Food-Coloured-favicon.jpg"
          alt="9Yards Food"
          className="w-10 h-10 rounded-lg object-contain"
        />
        <span className="font-bold text-sm text-primary">Kitchen Dashboard</span>
        <div className="ml-auto">
          <NotificationBell />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <Icon className="w-5 h-5" />
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
            {profile?.full_name?.charAt(0) || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
