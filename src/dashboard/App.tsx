import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ErrorBoundary from "@shared/components/ErrorBoundary";
import Login from "./pages/Login";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import MenuManagement from "./pages/MenuManagement";
import MenuItemEdit from "./pages/MenuItemEdit";
import Staff from "./pages/Staff";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import MyDeliveries from "./pages/rider/MyDeliveries";
import KitchenDisplay from "./pages/KitchenDisplay";
import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">{children}</main>
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ErrorBoundary>
  );
}
