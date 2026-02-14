import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { hasPermission, UserRole } from "@shared/types/auth";
import { useOrdersRealtime } from "@shared/hooks/useOrders";
import ErrorBoundary from "@shared/components/ErrorBoundary";
import NetworkStatus from "./components/NetworkStatus";
import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";

// Lazy-loaded pages for better performance
const Login = lazy(() => import("./pages/Login"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const MenuManagement = lazy(() => import("./pages/MenuManagement"));
const MenuItemEdit = lazy(() => import("./pages/MenuItemEdit"));
const Staff = lazy(() => import("./pages/Staff"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Settings = lazy(() => import("./pages/Settings"));
const MyDeliveries = lazy(() => import("./pages/rider/MyDeliveries"));
const KitchenDisplay = lazy(() => import("./pages/KitchenDisplay"));
const Reception = lazy(() => import("./pages/Reception"));

// Loading fallback for lazy-loaded pages
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // Subscribe to order updates globally for the dashboard
  useOrdersRealtime();
  
  return (
    <div className="dashboard-layout">
      <NetworkStatus />
      <Sidebar />
      <main className="dashboard-main">
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </main>
      <MobileNav />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-secondary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <ProtectedLayout>{children}</ProtectedLayout>;
}

// Role-protected route that checks specific permissions
function RoleRoute({ 
  children, 
  permission,
  fallbackPath = "/"
}: { 
  children: React.ReactNode; 
  permission: string;
  fallbackPath?: string;
}) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-secondary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  
  // Check if user has permission for this route
  if (role && !hasPermission(role, permission)) {
    return <Navigate to={getDefaultRouteForRole(role)} replace />;
  }

  return <ProtectedLayout>{children}</ProtectedLayout>;
}

// Get the default route for each role
function getDefaultRouteForRole(role: UserRole): string {
  switch (role) {
    case "rider":
      return "/deliveries";
    case "kitchen":
      return "/orders";
    case "reception":
      return "/reception";
    case "admin":
    default:
      return "/orders";
  }
}

// Smart home route that redirects based on role
function RoleBasedHome() {
  const { user, role, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-secondary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  
  return <Navigate to={role ? getDefaultRouteForRole(role) : "/orders"} replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Home - redirects based on user role */}
          <Route path="/" element={<RoleBasedHome />} />
          
          {/* Orders - accessible by admin, kitchen, rider (for viewing assigned) */}
          <Route
            path="/orders"
            element={
              <RoleRoute permission="orders:read">
                <Orders />
              </RoleRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <RoleRoute permission="orders:read">
                <OrderDetail />
              </RoleRoute>
            }
          />
          
          {/* Menu Management - admin and kitchen only */}
          <Route
            path="/menu"
            element={
              <RoleRoute permission="menu:read">
                <MenuManagement />
              </RoleRoute>
            }
          />
          <Route
            path="/menu/:id"
            element={
              <RoleRoute permission="menu:update">
                <MenuItemEdit />
              </RoleRoute>
            }
          />
          
          {/* Staff Management - admin only */}
          <Route
            path="/staff"
            element={
              <RoleRoute permission="staff:read">
                <Staff />
              </RoleRoute>
            }
          />
          
          {/* Analytics - admin only */}
          <Route
            path="/analytics"
            element={
              <RoleRoute permission="analytics:read">
                <Analytics />
              </RoleRoute>
            }
          />
          
          {/* Settings - all authenticated users can view their profile */}
          <Route
            path="/settings"
            element={
              <RoleRoute permission="settings:read">
                <Settings />
              </RoleRoute>
            }
          />
          
          {/* Deliveries - riders and admin */}
          <Route
            path="/deliveries"
            element={
              <RoleRoute permission="deliveries:read">
                <MyDeliveries />
              </RoleRoute>
            }
          />
          
          {/* Kitchen Display - orders:read permission */}
          <Route
            path="/kitchen"
            element={
              <RoleRoute permission="orders:read">
                <KitchenDisplay />
              </RoleRoute>
            }
          />
          
          {/* Reception Dashboard */}
          <Route
            path="/reception"
            element={
              <RoleRoute permission="reception:read">
                <Reception />
              </RoleRoute>
            }
          />
          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
