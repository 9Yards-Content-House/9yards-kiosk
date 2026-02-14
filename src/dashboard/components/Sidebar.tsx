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
  Building2,
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
    { to: "/reception", label: "Reception", icon: Building2, permission: "reception:read" },
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
        <div className={cn("p-4 border-b flex items-center gap-3", collapsed && "flex-col items-center justify-center p-3 gap-2")}>
          <img
            src="/images/logo/9Yards-Food-Coloured-favicon.jpg"
            alt="9Yards Food"
            className={cn("rounded-lg object-contain flex-shrink-0", collapsed ? "w-8 h-8" : "w-10 h-10")}
          />
          {!collapsed && (
            <>
              <span className="font-bold text-sm text-primary">Kitchen Dashboard</span>
              <div className="ml-auto">
                <NotificationBell />
              </div>
            </>
          )}
          {collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center">
                  <NotificationBell />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>Notifications</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Nav */}
        <nav className={cn("flex-1 p-3 space-y-1", collapsed && "p-2 space-y-2 flex flex-col items-center")}>
          {links.map((link) => {
            const Icon = link.icon;

            if (collapsed) {
              return (
                <Tooltip key={link.to}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={link.to}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200",
                          isActive
                            ? "bg-primary text-white shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-105"
                        )
                      }
                    >
                      <Icon className="w-5 h-5" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {link.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

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
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className={cn("px-3 pb-2", collapsed && "px-2 flex justify-center")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCollapsed(false)}
                  className="w-10 h-10 flex items-center justify-center p-0 hover:scale-105 transition-transform"
                >
                  <PanelLeft className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Expand
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(true)}
              className="w-full justify-start gap-2"
            >
              <PanelLeftClose className="w-4 h-4" />
              Collapse
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className={cn("p-4 border-t", collapsed && "p-2 flex flex-col items-center")}>
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
                  className="flex items-center justify-center w-10 h-10 text-muted-foreground hover:text-foreground transition-all rounded-lg hover:bg-muted hover:scale-105"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>Sign Out</TooltipContent>
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
