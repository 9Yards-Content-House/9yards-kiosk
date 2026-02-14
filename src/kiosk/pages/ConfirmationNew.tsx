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
  Loader2,
} from 'lucide-react';
import { useTranslation, useLanguage } from '@shared/context/LanguageContext';
import { useWaitTime, formatWaitTime } from '@shared/hooks/useWaitTime';
import { cn, formatPrice } from '@shared/lib/utils';
import { Button } from '@shared/components/ui/button';
import { QRCodeFallback } from '@shared/components/QRCode';
import { supabase } from '@shared/lib/supabase';
import KioskHeader from '../components/KioskHeader';
import { Confetti, SuccessCheckmark } from '../components/SuccessCelebration';
import { useSound } from '../hooks/useSound';

interface OrderDetails {
  orderNumber: string;
  total: number;
  customerName: string;
  customerPhone: string;
}

export default function ConfirmationNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { setLanguage } = useLanguage();
  const { data: waitTime } = useWaitTime();
  const { play } = useSound();

  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [showConfetti, setShowConfetti] = useState(true);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Try to get order details from navigation state first, then sessionStorage, then Supabase
  useEffect(() => {
    const loadOrderDetails = async () => {
      // 1. Check navigation state (preferred - from Payment.tsx)
      if (location.state?.orderNumber) {
        setOrderDetails({
          orderNumber: location.state.orderNumber,
          total: location.state.total || 0,
          customerName: location.state.customerName || '',
          customerPhone: location.state.customerPhone || '',
        });
        // Store in sessionStorage as backup
        sessionStorage.setItem('kiosk_last_order_number', location.state.orderNumber);
        setLoading(false);
        return;
      }

      // 2. Check sessionStorage for order number (fallback for page refresh)
      const storedOrderNumber = sessionStorage.getItem('kiosk_last_order_number');
      if (storedOrderNumber) {
        try {
          const { data: order } = await supabase
            .from('orders')
            .select('order_number, total, customer_name, customer_phone')
            .eq('order_number', storedOrderNumber)
            .single();

          if (order) {
            setOrderDetails({
              orderNumber: order.order_number,
              total: order.total,
              customerName: order.customer_name || '',
              customerPhone: order.customer_phone || '',
            });
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('Failed to fetch order:', error);
        }
      }

      // 3. No order found - redirect to home
      setLoading(false);
      navigate('/', { replace: true });
    };

    loadOrderDetails();
  }, [location.state, navigate]);

  // Auto-reset countdown
  useEffect(() => {
    if (!orderDetails) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          sessionStorage.removeItem('kiosk_last_order_number');
          setLanguage('en');
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [orderDetails, navigate, setLanguage]);

  const handleCopy = useCallback(async () => {
    if (!orderDetails) return;
    try {
      await navigator.clipboard.writeText(orderDetails.orderNumber);
      setCopied(true);
      play('select');
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [orderDetails, play]);

  const handleNewOrder = useCallback(() => {
    sessionStorage.removeItem('kiosk_last_order_number');
    setLanguage('en');
    navigate('/');
  }, [navigate, setLanguage]);

  const handleTrackOrder = useCallback(() => {
    if (!orderDetails) return;
    navigate(`/lookup/${orderDetails.orderNumber}`);
  }, [navigate, orderDetails]);

  // Loading state
  if (loading) {
    return (
      <div className="kiosk-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-12 h-12 animate-spin text-[#E6411C]" />
        <p className="mt-4 text-gray-500">Loading order details...</p>
      </div>
    );
  }

  // No order found
  if (!orderDetails) {
    return null;
  }

  const { orderNumber, customerPhone } = orderDetails;

  return (
    <div className="kiosk-screen flex flex-col bg-gradient-to-b from-green-50 to-white">
      {/* Confetti celebration */}
      {showConfetti && (
        <Confetti 
          count={80} 
          duration={4000}
          onComplete={() => setShowConfetti(false)} 
        />
      )}

      {/* Success header */}
      <div className="pt-12 pb-8 text-center">
        <div className="flex justify-center mb-6">
          <SuccessCheckmark size={96} />
        </div>

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
          className="text-lg text-gray-500"
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
            className="bg-white rounded-3xl p-6 shadow-lg border-2 border-green-200 text-center relative overflow-hidden"
          >
            {/* Subtle animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-transparent opacity-50" />
            
            <div className="relative z-10">
              <p className="text-gray-500 mb-2">{t('confirmation.orderNumber')}</p>
              <motion.div 
                className="text-5xl md:text-6xl font-black text-[#212282] tracking-wider mb-4"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.8 }}
              >
                {orderNumber}
              </motion.div>
            
            <Button
              variant="outline"
              onClick={handleCopy}
              className="gap-2 rounded-full border-gray-200"
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

            <p className="text-sm text-gray-500 mt-4">
              {t('confirmation.saveNumber')}
            </p>
            </div>
          </motion.div>

          {/* QR Code */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center"
          >
            <p className="text-sm text-gray-500 mb-3">
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
        <div className="text-center text-sm text-gray-500">
          {t('confirmation.autoReset')} <span className="font-bold text-[#212282]">{countdown}s</span>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="touch"
            onClick={handleTrackOrder}
            className="flex-1 gap-2 border-gray-200 text-[#212282]"
          >
            <Search className="w-5 h-5" />
            {t('confirmation.trackOrder')}
          </Button>

          <Button
            size="touch"
            onClick={handleNewOrder}
            className="flex-1 bg-[#E6411C] hover:bg-[#d13a18] text-white font-bold gap-2"
          >
            <UtensilsCrossed className="w-5 h-5" />
            {t('confirmation.newOrder')}
          </Button>
        </div>
      </div>
    </div>
  );
}
