import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useKioskCart } from "../context/KioskCartContext";

interface InactivityOverlayProps {
  onResume: () => void;
}

export default function InactivityOverlay({ onResume }: InactivityOverlayProps) {
  const navigate = useNavigate();
  const { clearCart } = useKioskCart();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearCart();
          sessionStorage.removeItem("kiosk_order_details");
          sessionStorage.removeItem("kiosk_order_number");
          navigate("/", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [clearCart, navigate]);

  const handleResume = () => {
    onResume();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="inactivity-overlay flex flex-col items-center justify-center"
      onClick={handleResume}
      onTouchStart={handleResume}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold mb-4">Still there?</h2>
        <p className="text-lg text-muted-foreground mb-8">
          Tap anywhere to continue your order
        </p>

        <div className="relative w-24 h-24 mx-auto mb-6">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="6"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="hsl(12, 82%, 50%)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={283}
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: 283 }}
              transition={{ duration: 10, ease: "linear" }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
            {countdown}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          Returning to start in {countdown} seconds
        </p>
      </motion.div>
    </motion.div>
  );
}
