import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { KIOSK } from "@shared/lib/constants";

/**
 * Tracks touch/mouse/keyboard activity.
 * After KIOSK.INACTIVITY_TIMEOUT_MS of inactivity, sets isInactive = true.
 * When used with the InactivityOverlay, navigates back to welcome and clears cart.
 */
export function useInactivityTimer() {
  const [isInactive, setIsInactive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const resetTimer = useCallback(() => {
    setIsInactive(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsInactive(true);
    }, KIOSK.INACTIVITY_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    // Don't run timer on the welcome screen
    if (location.pathname === "/") {
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsInactive(false);
      return;
    }

    const events = ["touchstart", "touchmove", "mousedown", "mousemove", "keydown"];

    const handler = () => resetTimer();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [location.pathname, resetTimer]);

  // When inactivity triggers, navigate to welcome after a delay (handled by overlay)
  const goHome = useCallback(() => {
    setIsInactive(false);
    navigate("/", { replace: true });
  }, [navigate]);

  return { isInactive, resetTimer, goHome };
}
