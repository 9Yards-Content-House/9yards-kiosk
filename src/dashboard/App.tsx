import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
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

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <Orders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/:id"
        element={
          <ProtectedRoute>
            <OrderDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/menu"
        element={
          <ProtectedRoute>
            <MenuManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/menu/:id"
        element={
          <ProtectedRoute>
            <MenuItemEdit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff"
        element={
          <ProtectedRoute>
            <Staff />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/deliveries"
        element={
          <ProtectedRoute>
            <MyDeliveries />
          </ProtectedRoute>
        }
      />
      {/* Kitchen Display - Full screen, no sidebar */}
      <Route
        path="/kitchen"
        element={<KitchenDisplay />}
      />
      {/* Reception Dashboard */}
      <Route
        path="/reception"
        element={
          <ProtectedRoute>
            <Reception />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
