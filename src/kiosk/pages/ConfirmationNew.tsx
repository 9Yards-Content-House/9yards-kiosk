import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  UtensilsCrossed,
  Loader2,
  XCircle,
} from 'lucide-react';
import { useTranslation, useLanguage } from '@shared/context/LanguageContext';
import { useCancelOrder, getMockOrdersStore } from '@shared/hooks/useOrders';
import { cn, formatPrice } from '@shared/lib/utils';
import { Button } from '@shared/components/ui/button';
import { QRCode } from '@shared/components/QRCode';
import { supabase, USE_MOCK_DATA } from '@shared/lib/supabase';
import KioskHeader from '../components/KioskHeader';
import { Confetti, SuccessCheckmark } from '../components/SuccessCelebration';
import { useSound } from '../hooks/useSound';
import { toast } from 'sonner';
import type { OrderStatus } from '@shared/types/orders';

interface OrderDetails {
  orderId: string;
  orderNumber: string;
  total: number;
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
}

export default function ConfirmationNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { setLanguage } = useLanguage();
  const { play } = useSound();
  const cancelOrder = useCancelOrder();

  const [countdown, setCountdown] = useState(30);
  const [showConfetti, setShowConfetti] = useState(true);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Try to get order details from navigation state first, then sessionStorage, then Supabase
  useEffect(() => {
    const loadOrderDetails = async () => {
      // Helper to fetch order details — supports both mock and Supabase modes
      const fetchOrder = async (orderNumber: string) => {
        if (USE_MOCK_DATA) {
          const mockOrders = getMockOrdersStore();
          const found = mockOrders.find(o => o.order_number === orderNumber);
          return found ? {
            id: found.id,
            order_number: found.order_number,
            total: found.total,
            customer_name: found.customer_name,
            customer_phone: found.customer_phone,
            status: found.status,
          } : null;
        }
        const { data: order } = await supabase
          .from('orders')
          .select('id, order_number, total, customer_name, customer_phone, status')
          .eq('order_number', orderNumber)
          .single();
        return order;
      };

      // 1. Check navigation state (preferred - from Payment.tsx)
      if (location.state?.orderNumber) {
        // Always fetch from Supabase to get ID and status
        const order = await fetchOrder(location.state.orderNumber);
        if (order) {
          setOrderDetails({
            orderId: order.id,
            orderNumber: order.order_number,
            total: order.total,
            customerName: order.customer_name || '',
            customerPhone: order.customer_phone || '',
            status: order.status,
          });
          sessionStorage.setItem('kiosk_last_order_number', location.state.orderNumber);
          setLoading(false);
          return;
        }
        // Fallback if order not found yet (might be a race condition)
        setOrderDetails({
          orderId: '',
          orderNumber: location.state.orderNumber,
          total: location.state.total || 0,
          customerName: location.state.customerName || '',
          customerPhone: location.state.customerPhone || '',
          status: 'new',
        });
        sessionStorage.setItem('kiosk_last_order_number', location.state.orderNumber);
        setLoading(false);
        return;
      }

      // 2. Check sessionStorage for order number (fallback for page refresh)
      const storedOrderNumber = sessionStorage.getItem('kiosk_last_order_number');
      if (storedOrderNumber) {
        try {
          const order = await fetchOrder(storedOrderNumber);
          if (order) {
            setOrderDetails({
              orderId: order.id,
              orderNumber: order.order_number,
              total: order.total,
              customerName: order.customer_name || '',
              customerPhone: order.customer_phone || '',
              status: order.status,
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

  // Subscribe to realtime status updates
  useEffect(() => {
    if (!orderDetails?.orderId) return;

    const channel = supabase
      .channel(`order-status-${orderDetails.orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderDetails.orderId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as OrderStatus;
          setOrderDetails((prev) =>
            prev ? { ...prev, status: newStatus } : prev
          );
          // If order was cancelled, show toast
          if (newStatus === 'cancelled') {
            toast.info('Your order has been cancelled');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderDetails?.orderId]);

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

  const handleNewOrder = useCallback(() => {
    sessionStorage.removeItem('kiosk_last_order_number');
    setLanguage('en');
    navigate('/');
  }, [navigate, setLanguage]);

  const handleTrackOrder = useCallback(() => {
    if (!orderDetails) return;
    navigate(`/lookup/${orderDetails.orderNumber}`);
  }, [navigate, orderDetails]);

  // Handle order cancellation
  const handleCancelOrder = useCallback(async () => {
    if (!orderDetails?.orderId) return;
    
    setCancelling(true);
    try {
      await cancelOrder.mutateAsync(orderDetails.orderId);
      play('select');
      toast.success('Order cancelled successfully');
      setShowCancelConfirm(false);
      // Update local state
      setOrderDetails((prev) => prev ? { ...prev, status: 'cancelled' } : prev);
    } catch (error) {
      console.error('Failed to cancel order:', error);
      play('error');
      toast.error('Failed to cancel order. It may have already been prepared.');
    } finally {
      setCancelling(false);
    }
  }, [orderDetails?.orderId, cancelOrder, play]);

  // Check if order can be cancelled (only when status is 'new')
  const canCancel = orderDetails?.status === 'new';

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
        <div className="max-w-2xl mx-auto space-y-6">
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

              <p className="text-sm text-gray-500">
                {t('confirmation.scanQR')}
              </p>
            </div>
          </motion.div>

          {/* QR Code - Primary action for mobile tracking */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center"
          >
            <p className="text-base font-medium text-[#212282] mb-4">
              {t('confirmation.scanPhone')}
            </p>
            <div className="flex justify-center">
              <QRCode value={orderNumber} size={180} asTrackingLink />
            </div>
            <p className="text-xs text-gray-400 mt-4">
              {t('confirmation.receiveUpdates')}
            </p>
          </motion.div>

          {/* Cancel Order Option - only shown when order is still 'new' */}
          {canCancel && orderDetails?.status !== 'cancelled' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="mt-4"
            >
              <Button
                variant="outline"
                size="touch"
                onClick={() => setShowCancelConfirm(true)}
                className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-5 h-5" />
                {t('confirmation.cancelOrder')}
              </Button>
              <p className="text-xs text-gray-400 text-center mt-2">
                {t('confirmation.cancelHint')}
              </p>
            </motion.div>
          )}

          {/* Cancelled Order Notice */}
          {orderDetails?.status === 'cancelled' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 bg-red-50 rounded-xl p-4 border border-red-200 text-center"
            >
              <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="font-semibold text-red-700">Order Cancelled</p>
              <p className="text-sm text-red-600">This order has been cancelled</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Cancel Order?</h3>
              <p className="text-gray-500">
                Are you sure you want to cancel order <span className="font-bold">{orderDetails?.orderNumber}</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="touch"
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelling}
                className="flex-1"
              >
                Keep Order
              </Button>
              <Button
                size="touch"
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Yes, Cancel'
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Footer with actions */}
      <div className="p-4 border-t bg-white">
        <div className="max-w-2xl mx-auto space-y-3">
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
    </div>
  );
}
