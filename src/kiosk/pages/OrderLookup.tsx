import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Check, Clock, ChefHat, Package, Delete } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@shared/context/LanguageContext';
import { supabase } from '@shared/lib/supabase';
import { cn, formatPrice, timeAgo } from '@shared/lib/utils';
import { Order, OrderItem } from '@shared/types';
import { Button } from '@shared/components/ui/button';
import { useWaitTime, formatWaitTime } from '@shared/hooks/useWaitTime';
import KioskHeader from '../components/KioskHeader';

export default function OrderLookup() {
  const navigate = useNavigate();
  const { orderNumber: urlOrderNumber } = useParams();
  const { t } = useTranslation();
  const [orderNumber, setOrderNumber] = useState(urlOrderNumber || '');
  const [searchNumber, setSearchNumber] = useState(urlOrderNumber || '');

  // Search for order when searchNumber changes
  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order-lookup', searchNumber],
    queryFn: async () => {
      if (!searchNumber) return null;
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .eq('order_number', searchNumber.toUpperCase())
        .single();

      if (error) throw error;
      return data as Order & { order_items: OrderItem[] };
    },
    enabled: !!searchNumber,
    retry: false,
  });

  const { data: waitTime } = useWaitTime();

  // Handle numpad input
  const handleNumpadPress = useCallback((digit: string) => {
    if (digit === 'clear') {
      setOrderNumber('');
    } else if (digit === 'delete') {
      setOrderNumber((prev) => prev.slice(0, -1));
    } else {
      setOrderNumber((prev) => {
        const newValue = prev + digit;
        // Max 4 digits for the number part
        if (prev.replace(/\D/g, '').length >= 4) return prev;
        return newValue;
      });
    }
  }, []);

  const handleSearch = useCallback(() => {
    // Format as 9Y-XXXX
    const digits = orderNumber.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 0) {
      const formatted = `9Y-${digits.padStart(4, '0')}`;
      setSearchNumber(formatted);
    }
  }, [orderNumber]);

  // Auto-search if URL has order number
  useEffect(() => {
    if (urlOrderNumber) {
      setSearchNumber(urlOrderNumber.toUpperCase());
    }
  }, [urlOrderNumber]);

  // Subscribe to order updates
  useEffect(() => {
    if (!order) return;

    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id, refetch]);

  const displayNumber = orderNumber
    ? `9Y-${orderNumber.replace(/\D/g, '').padStart(4, '0')}`
    : '9Y-____';

  return (
    <div className="kiosk-screen flex flex-col bg-background">
      <KioskHeader
        title={t('tracking.title')}
        showBack
        onBack={() => navigate('/')}
      />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Numpad / Input section */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-muted/30">
          <h2 className="text-lg font-semibold text-muted-foreground mb-4">
            {t('tracking.enterNumber')}
          </h2>

          {/* Order number display */}
          <div className="bg-white rounded-2xl px-8 py-4 mb-6 shadow-sm border-2 border-primary/20">
            <span className="text-3xl md:text-4xl font-mono font-bold text-primary tracking-widest">
              {displayNumber}
            </span>
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3 max-w-xs">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'delete'].map(
              (key) => (
                <Button
                  key={key}
                  variant={key === 'clear' ? 'destructive' : 'outline'}
                  size="touch"
                  onClick={() => handleNumpadPress(key)}
                  className={cn(
                    'text-xl font-bold h-16 w-16',
                    key === 'clear' && 'text-sm',
                    key === 'delete' && 'text-sm'
                  )}
                >
                  {key === 'delete' ? (
                    <Delete className="w-6 h-6" />
                  ) : key === 'clear' ? (
                    'CLR'
                  ) : (
                    key
                  )}
                </Button>
              )
            )}
          </div>

          {/* Search button */}
          <Button
            size="touch"
            onClick={handleSearch}
            disabled={orderNumber.replace(/\D/g, '').length === 0}
            className="mt-6 gap-2 bg-secondary hover:bg-secondary/90 px-8"
          >
            <Search className="w-5 h-5" />
            {t('tracking.lookup')}
          </Button>
        </div>

        {/* Order details section */}
        <div className="flex-1 p-6 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          )}

          {error && !isLoading && searchNumber && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {t('tracking.notFound')}
              </h3>
              <p className="text-muted-foreground">
                Order {searchNumber} was not found. Please check the number and try again.
              </p>
            </div>
          )}

          {order && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Order number header */}
              <div className="text-center">
                <h2 className="text-3xl font-black text-primary">
                  {order.order_number}
                </h2>
                <p className="text-muted-foreground">
                  {order.customer_name}
                </p>
              </div>

              {/* Status badge */}
              <OrderStatusBadge status={order.status} />

              {/* Wait time (if applicable) */}
              {(order.status === 'new' || order.status === 'preparing') &&
                waitTime && (
                  <div className="bg-amber-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-amber-600 mb-1">
                      {t('confirmation.estimatedWait')}
                    </p>
                    <p className="text-2xl font-bold text-amber-700">
                      {formatWaitTime(waitTime.estimatedMinutes)}
                    </p>
                    <p className="text-sm text-amber-600">
                      {waitTime.ordersAhead} {t('confirmation.ordersAhead')}
                    </p>
                  </div>
                )}

              {/* Timeline */}
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold mb-4">{t('tracking.timeline')}</h3>
                <OrderTimeline order={order} />
              </div>

              {/* Order items */}
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold mb-3">Items</h3>
                <div className="space-y-2">
                  {order.order_items?.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="font-medium">
                          {item.quantity}x{' '}
                          {item.type === 'combo'
                            ? `${item.sauce_name} Combo`
                            : item.sauce_name || 'Item'}
                        </p>
                        {item.type === 'combo' && (
                          <p className="text-sm text-muted-foreground">
                            {item.main_dishes?.join(', ')}
                          </p>
                        )}
                      </div>
                      <span className="font-medium">
                        {formatPrice(item.total_price)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-3 mt-3 border-t font-bold">
                  <span>{t('cart.total')}</span>
                  <span className="text-lg">{formatPrice(order.total)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-background flex gap-3">
        <Button
          variant="outline"
          size="touch"
          onClick={() => navigate('/')}
          className="flex-1 gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('common.back')}
        </Button>
        <Button
          size="touch"
          onClick={() => navigate('/menu')}
          className="flex-1 bg-secondary hover:bg-secondary/90"
        >
          {t('confirmation.newOrder')}
        </Button>
      </div>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();

  const config = {
    new: {
      label: t('tracking.preparing'),
      icon: Clock,
      className: 'bg-amber-100 text-amber-700 border-amber-300',
    },
    preparing: {
      label: t('tracking.preparing'),
      icon: ChefHat,
      className: 'bg-amber-100 text-amber-700 border-amber-300',
    },
    ready: {
      label: t('tracking.ready'),
      icon: Package,
      className: 'bg-green-100 text-green-700 border-green-300',
    },
    delivered: {
      label: t('tracking.delivered'),
      icon: Check,
      className: 'bg-blue-100 text-blue-700 border-blue-300',
    },
    cancelled: {
      label: 'Cancelled',
      icon: Clock,
      className: 'bg-red-100 text-red-700 border-red-300',
    },
  }[status] || {
    label: status,
    icon: Clock,
    className: 'bg-gray-100 text-gray-700',
  };

  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 px-6 py-3 rounded-full border-2 mx-auto',
        config.className
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="font-semibold text-lg">{config.label}</span>
    </div>
  );
}

function OrderTimeline({ order }: { order: Order }) {
  const { t } = useTranslation();

  const steps = [
    {
      label: t('tracking.placedAt'),
      time: order.created_at,
      completed: true,
      icon: Clock,
    },
    {
      label: t('tracking.startedAt'),
      time: order.prepared_at,
      completed: !!order.prepared_at || order.status !== 'new',
      icon: ChefHat,
    },
    {
      label: t('tracking.readyAt'),
      time: order.ready_at,
      completed: !!order.ready_at,
      icon: Package,
    },
    {
      label: t('tracking.deliveredAt'),
      time: order.delivered_at,
      completed: !!order.delivered_at,
      icon: Check,
    },
  ];

  return (
    <div className="space-y-4">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isLast = idx === steps.length - 1;
        
        return (
          <div key={idx} className="relative flex gap-3">
            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'absolute left-4 top-8 w-0.5 h-full -translate-x-1/2',
                  step.completed ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}

            {/* Icon */}
            <div
              className={cn(
                'relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                step.completed
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
            </div>

            {/* Content */}
            <div className="pb-4">
              <p
                className={cn(
                  'font-medium',
                  step.completed ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </p>
              {step.time && (
                <p className="text-sm text-muted-foreground">
                  {new Date(step.time).toLocaleTimeString('en-UG', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
