import { useState, useEffect } from "react";
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
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@shared/lib/utils";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "@shared/types/auth";
import NotificationBell from "./NotificationBell";
import { Button } from "@shared/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@shared/components/ui/tooltip";

const SIDEBAR_COLLAPSED_KEY = "9yards_sidebar_collapsed";

export default function Sidebar() {
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const allLinks = [
    { to: "/orders", label: "Orders", icon: LayoutDashboard, permission: "orders:read" },
    { to: "/kitchen", label: "Kitchen Display", icon: ChefHat, permission: "orders:read" },
    { to: "/menu", label: "Menu", icon: UtensilsCrossed, permission: "menu:read" },
    { to: "/staff", label: "Staff", icon: Users, permission: "staff:read" },
    { to: "/analytics", label: "Analytics", icon: BarChart3, permission: "analytics:read" },
    { to: "/deliveries", label: "Deliveries", icon: Truck, permission: "deliveries:read" },
    { to: "/settings", label: "Settings", icon: Settings, permission: "settings:read" },
  ];

  const links = !role 
    ? allLinks 
    : allLinks.filter((link) => hasPermission(role, link.permission));

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn("dashboard-sidebar", collapsed && "dashboard-sidebar-collapsed")}>
        {/* Logo */}
        <div className={cn("p-4 border-b flex items-center gap-3", collapsed && "justify-center p-3")}>
          <img
            src="/images/logo/9Yards-Food-Coloured-favicon.jpg"
            alt="9Yards Food"
            className="w-10 h-10 rounded-lg object-contain flex-shrink-0"
          />
          {!collapsed && (
            <>
              <span className="font-bold text-sm text-primary">Kitchen Dashboard</span>
              <div className="ml-auto">
                <NotificationBell />
              </div>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className={cn("flex-1 p-3 space-y-1", collapsed && "p-2")}>
          {links.map((link) => {
            const Icon = link.icon;
            const navLink = (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    collapsed && "justify-center px-2"
                  )
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && link.label}
              </NavLink>
            );

            if (collapsed) {
              return (
                <Tooltip key={link.to}>
                  <TooltipTrigger asChild>
                    {navLink}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {link.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return navLink;
          })}
        </nav>

        {/* Collapse toggle */}
        <div className={cn("px-3 pb-2", collapsed && "px-2")}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("w-full justify-start gap-2", collapsed && "justify-center px-2")}
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            {!collapsed && "Collapse"}
          </Button>
        </div>

        {/* Footer */}
        <div className={cn("p-4 border-t", collapsed && "p-2")}>
          {!collapsed && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {profile?.full_name?.charAt(0) || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
              </div>
            </div>
          )}
          
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center w-full p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign Out</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
