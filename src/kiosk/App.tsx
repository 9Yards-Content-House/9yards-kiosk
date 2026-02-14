import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { KioskCartProvider } from "./context/KioskCartContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { LanguageProvider } from "@shared/context/LanguageContext";
import { AccessibilityProvider } from "./context/AccessibilityContext";
import { AnnouncerProvider } from "@shared/context/AnnouncerContext";
import { useInactivityTimer } from "./hooks/useInactivityTimer";
import { useMenuRealtime } from "@shared/hooks/useMenu";
import { useOrdersRealtime } from "@shared/hooks/useOrders";
import ErrorBoundary from "@shared/components/ErrorBoundary";
import InactivityOverlay from "./components/InactivityOverlay";
import NetworkStatus from "./components/NetworkStatus";

// Lazy-loaded pages for better performance
const Welcome = lazy(() => import("./pages/Welcome"));
const MenuNew = lazy(() => import("./pages/MenuNew"));
const CartNew = lazy(() => import("./pages/CartNew"));
const Details = lazy(() => import("./pages/Details"));
const Payment = lazy(() => import("./pages/Payment"));
const ConfirmationNew = lazy(() => import("./pages/ConfirmationNew"));
const TrackOrders = lazy(() => import("./pages/TrackOrders"));
const OrderLookup = lazy(() => import("./pages/OrderLookup"));
const QueueDisplay = lazy(() => import("./pages/QueueDisplay"));

// Loading fallback for lazy-loaded pages
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-brand-700 font-medium">Loading...</p>
      </div>
    </div>
  );
}

function KioskRoutes() {
  const { isInactive, resetTimer } = useInactivityTimer();
  // Subscribe to menu updates from dashboard
  useMenuRealtime();
  // Subscribe to order updates for tracking
  useOrdersRealtime();

  return (
    <>
      <NetworkStatus />
      {isInactive && <InactivityOverlay onResume={resetTimer} />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/menu" element={<MenuNew />} />
          <Route path="/cart" element={<CartNew />} />
          <Route path="/details" element={<Details />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/confirmation" element={<ConfirmationNew />} />
          <Route path="/track" element={<TrackOrders />} />
          <Route path="/lookup" element={<OrderLookup />} />
          <Route path="/lookup/:orderNumber" element={<OrderLookup />} />
          <Route path="/queue" element={<QueueDisplay />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AnnouncerProvider>
        <AccessibilityProvider>
          <LanguageProvider>
            <FavoritesProvider>
              <KioskCartProvider>
                <KioskRoutes />
              </KioskCartProvider>
            </FavoritesProvider>
          </LanguageProvider>
        </AccessibilityProvider>
      </AnnouncerProvider>
    </ErrorBoundary>
  );
}
