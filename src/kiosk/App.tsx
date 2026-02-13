import { Routes, Route, Navigate } from "react-router-dom";
import { KioskCartProvider } from "./context/KioskCartContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { LanguageProvider } from "@shared/context/LanguageContext";
import { AccessibilityProvider } from "./context/AccessibilityContext";
import { useInactivityTimer } from "./hooks/useInactivityTimer";
import { useMenuRealtime } from "@shared/hooks/useMenu";
import ErrorBoundary from "@shared/components/ErrorBoundary";
import InactivityOverlay from "./components/InactivityOverlay";

// Pages
import Welcome from "./pages/Welcome";
import MenuNew from "./pages/MenuNew";
import CartNew from "./pages/CartNew";
import Details from "./pages/Details";
import Payment from "./pages/Payment";
import ConfirmationNew from "./pages/ConfirmationNew";
import TrackOrders from "./pages/TrackOrders";
import OrderLookup from "./pages/OrderLookup";

function KioskRoutes() {
  const { isInactive, resetTimer } = useInactivityTimer();
  // Subscribe to menu updates from dashboard
  useMenuRealtime();

  return (
    <>
      {isInactive && <InactivityOverlay onResume={resetTimer} />}
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AccessibilityProvider>
        <LanguageProvider>
          <FavoritesProvider>
            <KioskCartProvider>
              <KioskRoutes />
            </KioskCartProvider>
          </FavoritesProvider>
        </LanguageProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  );
}
