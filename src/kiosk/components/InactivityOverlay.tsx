import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Hand, RotateCcw } from "lucide-react";
import { useKioskCart } from "../context/KioskCartContext";
import { useTranslation, useLanguage } from "@shared/context/LanguageContext";
import { Button } from "@shared/components/ui/button";

interface InactivityOverlayProps {
  onResume: () => void;
}

const COUNTDOWN_SECONDS = 15;

export default function InactivityOverlay({ onResume }: InactivityOverlayProps) {
  const navigate = useNavigate();
  const { clearCart, itemCount } = useKioskCart();
  const { t } = useTranslation();
  const { setLanguage } = useLanguage();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearCart();
          setLanguage('en');
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

  const handleResume = useCallback(() => {
    onResume();
  }, [onResume]);

  const handleStartOver = useCallback(() => {
    clearCart();
    setLanguage('en');
    sessionStorage.removeItem("kiosk_order_details");
    sessionStorage.removeItem("kiosk_order_number");
    navigate("/", { replace: true });
  }, [clearCart, setLanguage, navigate]);

  // Calculate progress for the circular timer
  const progress = countdown / COUNTDOWN_SECONDS;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="inactivity-overlay flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleResume}
      onTouchStart={handleResume}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="text-center text-white px-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated hand icon */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="mb-6"
        >
          <Hand className="w-16 h-16 mx-auto text-secondary" />
        </motion.div>

        <h2 className="text-4xl font-bold mb-3">{t('inactivity.title')}</h2>
        <p className="text-xl text-white/80 mb-8">
          {t('inactivity.tapToContinue')}
        </p>

        {/* Circular countdown timer */}
        <div className="relative w-32 h-32 mx-auto mb-6">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="6"
            />
            {/* Progress circle */}
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="hsl(12, 82%, 50%)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={283}
              style={{ strokeDashoffset: 283 * (1 - progress) }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-white">
            {countdown}
          </span>
        </div>

        <p className="text-white/60 mb-8">
          {t('inactivity.returning')} {countdown}s
        </p>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Button
            size="touch"
            className="bg-secondary hover:bg-secondary/90 text-white w-full"
            onClick={handleResume}
          >
            {t('inactivity.continue')}
            {itemCount > 0 && ` (${itemCount} ${itemCount === 1 ? 'item' : 'items'})`}
          </Button>
          
          <Button
            variant="ghost"
            size="lg"
            className="text-white/70 hover:text-white hover:bg-white/10 w-full"
            onClick={handleStartOver}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('inactivity.startOver')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
