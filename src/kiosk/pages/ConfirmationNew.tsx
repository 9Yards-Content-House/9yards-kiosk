import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Check,
  Copy,
  Clock,
  Search,
  UtensilsCrossed,
  MessageCircle,
} from 'lucide-react';
import { useTranslation, useLanguage } from '@shared/context/LanguageContext';
import { useWaitTime, formatWaitTime } from '@shared/hooks/useWaitTime';
import { cn, formatPrice } from '@shared/lib/utils';
import { Button } from '@shared/components/ui/button';
import { QRCodeFallback } from '@shared/components/QRCode';
import KioskHeader from '../components/KioskHeader';

export default function ConfirmationNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { setLanguage } = useLanguage();
  const { data: waitTime } = useWaitTime();

  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Get order details from navigation state
  const orderNumber = location.state?.orderNumber || '9Y-0000';
  const total = location.state?.total || 0;
  const customerName = location.state?.customerName || '';
  const customerPhone = location.state?.customerPhone || '';

  // Auto-reset countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setLanguage('en');
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [orderNumber]);

  const handleNewOrder = useCallback(() => {
    setLanguage('en');
    navigate('/');
  }, [navigate, setLanguage]);

  const handleTrackOrder = useCallback(() => {
    navigate(`/lookup/${orderNumber}`);
  }, [navigate, orderNumber]);

  return (
    <div className="kiosk-screen flex flex-col bg-gradient-to-b from-green-50 to-background">
      {/* Success header */}
      <div className="pt-12 pb-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
        >
          <Check className="w-12 h-12 text-white" strokeWidth={3} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-3xl md:text-4xl font-extrabold text-green-700 mb-2"
        >
          {t('confirmation.title')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-lg text-muted-foreground"
        >
          {t('confirmation.orderPlaced')}
        </motion.p>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Order number card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-3xl p-6 shadow-lg border-2 border-green-200 text-center"
          >
            <p className="text-muted-foreground mb-2">{t('confirmation.orderNumber')}</p>
            <div className="text-5xl md:text-6xl font-black text-primary tracking-wider mb-4">
              {orderNumber}
            </div>
            
            <Button
              variant="outline"
              onClick={handleCopy}
              className="gap-2 rounded-full"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Number
                </>
              )}
            </Button>

            <p className="text-sm text-muted-foreground mt-4">
              {t('confirmation.saveNumber')}
            </p>
          </motion.div>

          {/* QR Code */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-2xl p-6 shadow-sm text-center"
          >
            <p className="text-sm text-muted-foreground mb-3">
              Scan to track your order
            </p>
            <div className="flex justify-center">
              <QRCodeFallback value={orderNumber} size={160} />
            </div>
          </motion.div>

          {/* Wait time */}
          {waitTime && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-amber-50 rounded-2xl p-5 border border-amber-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-amber-700">
                    {t('confirmation.estimatedWait')}
                  </p>
                  <p className="text-2xl font-bold text-amber-800">
                    {formatWaitTime(waitTime.estimatedMinutes)}
                  </p>
                  <p className="text-xs text-amber-600">
                    {waitTime.ordersAhead} {t('confirmation.ordersAhead')}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* WhatsApp notification note */}
          {customerPhone && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="flex items-center gap-3 bg-green-50 rounded-xl p-4 border border-green-200"
            >
              <MessageCircle className="w-5 h-5 text-green-600 shrink-0" />
              <p className="text-sm text-green-700">
                {t('confirmation.whatsappNotify')}
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Footer with actions */}
      <div className="p-4 border-t bg-white space-y-3">
        {/* Auto-reset countdown */}
        <div className="text-center text-sm text-muted-foreground">
          {t('confirmation.autoReset')} <span className="font-bold">{countdown}s</span>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="touch"
            onClick={handleTrackOrder}
            className="flex-1 gap-2"
          >
            <Search className="w-5 h-5" />
            {t('confirmation.trackOrder')}
          </Button>

          <Button
            size="touch"
            onClick={handleNewOrder}
            className="flex-1 bg-secondary hover:bg-secondary/90 gap-2"
          >
            <UtensilsCrossed className="w-5 h-5" />
            {t('confirmation.newOrder')}
          </Button>
        </div>
      </div>
    </div>
  );
}
