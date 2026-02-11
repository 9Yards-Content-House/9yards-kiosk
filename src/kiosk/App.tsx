import { Routes, Route, Navigate } from "react-router-dom";
import { KioskCartProvider } from "./context/KioskCartContext";
import { useInactivityTimer } from "./hooks/useInactivityTimer";
import InactivityOverlay from "./components/InactivityOverlay";
import Welcome from "./pages/Welcome";
import Menu from "./pages/Menu";
import Cart from "./pages/Cart";
import Details from "./pages/Details";
import Payment from "./pages/Payment";
import Confirmation from "./pages/Confirmation";

function KioskRoutes() {
  const { isInactive, resetTimer } = useInactivityTimer();

  return (
    <>
      {isInactive && <InactivityOverlay onResume={resetTimer} />}
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/details" element={<Details />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <KioskCartProvider>
      <KioskRoutes />
    </KioskCartProvider>
  );
}
