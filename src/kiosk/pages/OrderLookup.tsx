import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Check, Clock, ChefHat, Package, Delete, MessageSquare } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@shared/context/LanguageContext';
import { supabase, USE_MOCK_DATA } from '@shared/lib/supabase';
import { cn, formatPrice } from '@shared/lib/utils';
import { Order, OrderItem } from '@shared/types';
import { Button } from '@shared/components/ui/button';
import { useWaitTime, formatWaitTime } from '@shared/hooks/useWaitTime';
import { getMockOrdersStore, applyLocalOverlay } from '@shared/hooks/useOrders';
import FeedbackModal from '../components/FeedbackModal';

export default function OrderLookup() {
  const navigate = useNavigate();
  const { orderNumber: urlOrderNumber } = useParams();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [orderNumber, setOrderNumber] = useState(urlOrderNumber || '');
  const [searchNumber, setSearchNumber] = useState(urlOrderNumber || '');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order-lookup', searchNumber],
    queryFn: async () => {
      if (!searchNumber) return null;

      // Mock mode - search local store
      if (USE_MOCK_DATA) {
        const mockOrders = getMockOrdersStore();
        const found = mockOrders.find(o => o.order_number === searchNumber.toUpperCase());
        if (!found) throw new Error('Order not found');
        // Apply any local overlay from dashboard updates
        return applyLocalOverlay(found) as Order & { order_items: OrderItem[] };
      }

      // Real Supabase query
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .eq('order_number', searchNumber.toUpperCase())
        .single();

      if (error) throw error;
      // Apply any local overlay from dashboard updates
      return applyLocalOverlay(data as Order) as Order & { order_items: OrderItem[] };
    },
    enabled: !!searchNumber,
    retry: false,
    // Poll as fallback, but realtime subscription provides instant updates
    refetchInterval: 5000,
  });

  // Subscribe to realtime updates for the tracked order
  useEffect(() => {
    if (!order?.id || USE_MOCK_DATA) return;
    
    const channel = supabase
      .channel(`order-track-${order.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` },
        () => {
          // Refetch the order when it's updated
          refetch();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id, refetch]);

  const { data: waitTime } = useWaitTime();

  // Handle numpad input
  const handleNumpadPress = useCallback((digit: string) => {
    if (digit === 'clear') {
      setOrderNumber('');
      setSearchNumber('');
    } else if (digit === 'delete') {
      setOrderNumber((prev) => prev.slice(0, -1));
    } else {
      setOrderNumber((prev) => {
        // Allow up to 6 digits for numeric order numbers
        if (prev.length >= 6) return prev;
        return prev + digit;
      });
    }
  }, []);

  // Manual search handler
  const handleSearch = useCallback(() => {
    const digits = orderNumber.replace(/\D/g, '');
    if (digits.length > 0) {
      // Search with plain numeric order number
      setSearchNumber(digits);
    }
  }, [orderNumber]);

  // Auto-search if URL has order number
  useEffect(() => {
    if (urlOrderNumber) {
      setSearchNumber(urlOrderNumber.toUpperCase());
    }
  }, [urlOrderNumber]);

  // Note: Realtime subscription is handled above (lines 63-78) - this duplicate was removed
  // The first subscription already calls refetch() on updates
  
  // Invalidate query cache when order is updated (via the subscription above)
  useEffect(() => {
    if (!order?.id) return;
    // Already handled by subscription
    return () => {
    };
  }, [order?.id, refetch, queryClient]);

  const digits = orderNumber.replace(/\D/g, '');
  // Display as plain number (6 digits max)
  const displayNumber = digits.length > 0
    ? digits.padEnd(6, '_')
    : '______';

  const hasDigits = digits.length > 0;
  const hasResult = !!searchNumber && (isLoading || !!order || !!error);

  return (
    <div className="kiosk-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-[clamp(0.5rem,1.5vmin,1rem)] px-[clamp(0.75rem,3vmin,1.5rem)] py-[clamp(0.625rem,2vmin,1rem)] bg-primary shrink-0">
        <button
          onClick={() => navigate('/')}
          aria-label={t('common.back')}
          className="w-[clamp(2.5rem,5.5vmin,3.25rem)] h-[clamp(2.5rem,5.5vmin,3.25rem)] flex items-center justify-center rounded-xl bg-white/10 text-white active:bg-primary-foreground/20 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-[clamp(1.125rem,2.5vmin,1.5rem)] h-[clamp(1.125rem,2.5vmin,1.5rem)]" />
        </button>
        <h1 className="text-[clamp(1rem,2.5vmin,1.375rem)] font-bold text-white flex-1">
          {t('tracking.title')}
        </h1>
      </header>

      {/* Main content - side by side layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left side - Numpad (always visible) */}
        <div className="w-[clamp(16rem,40%,22rem)] shrink-0 flex flex-col items-center justify-center px-[clamp(0.75rem,2vmin,1.25rem)] py-[clamp(0.75rem,2vmin,1.25rem)] bg-muted/30 border-r">
          <h2 className="text-[clamp(0.75rem,1.8vmin,1rem)] font-semibold text-muted-foreground mb-[clamp(0.375rem,1vmin,0.625rem)]">
            {t('tracking.enterNumber')}
          </h2>

          {/* Order number display */}
          <div className="bg-white rounded-[clamp(0.625rem,1.5vmin,1rem)] px-[clamp(1rem,3vmin,2rem)] py-[clamp(0.375rem,1vmin,0.625rem)] mb-[clamp(0.5rem,1.5vmin,1rem)] shadow-card border-2 border-primary/20">
            <span className="text-[clamp(1.25rem,4vmin,2.25rem)] font-mono font-bold text-primary tracking-[0.1em]">
              {displayNumber}
            </span>
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-[clamp(0.1875rem,0.5vmin,0.375rem)] w-full max-w-[clamp(10rem,28vmin,16rem)]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'delete'].map(
              (key) => (
                <button
                  key={key}
                  onClick={() => handleNumpadPress(key)}
                  className={cn(
                    'aspect-square rounded-[clamp(0.375rem,1vmin,0.625rem)] font-bold transition-all active:scale-95',
                    'text-[clamp(1rem,2.5vmin,1.5rem)]',
                    'flex items-center justify-center',
                    key === 'clear'
                      ? 'bg-destructive/10 text-destructive active:bg-destructive/20 text-[clamp(0.6rem,1.4vmin,0.8rem)]'
                      : key === 'delete'
                        ? 'bg-muted active:bg-muted/60 text-muted-foreground'
                        : 'bg-white border border-border active:bg-muted/50 text-foreground shadow-sm'
                  )}
                >
                  {key === 'delete' ? (
                    <Delete className="w-[clamp(0.875rem,2vmin,1.125rem)] h-[clamp(0.875rem,2vmin,1.125rem)]" />
                  ) : key === 'clear' ? (
                    'CLR'
                  ) : (
                    key
                  )}
                </button>
              )
            )}
          </div>

          {/* Search button */}
          <Button
            size="touch"
            onClick={handleSearch}
            disabled={!hasDigits}
            className={cn(
              'mt-[clamp(0.5rem,1.5vmin,1rem)] w-full max-w-[clamp(10rem,28vmin,16rem)]',
              'gap-[clamp(0.25rem,0.6vmin,0.375rem)]',
              'bg-secondary hover:bg-secondary active:bg-secondary/80 text-white',
              'text-[clamp(0.75rem,1.6vmin,0.9375rem)] font-semibold',
              'py-[clamp(0.5rem,1.5vmin,0.875rem)] rounded-xl',
              'active:scale-[0.98] transition-all',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            <Search className="w-[clamp(0.75rem,1.6vmin,0.9375rem)] h-[clamp(0.75rem,1.6vmin,0.9375rem)]" />
            {t('tracking.lookup')}
          </Button>

          <p className="text-[clamp(0.55rem,1.1vmin,0.7rem)] text-muted-foreground mt-[clamp(0.375rem,1vmin,0.625rem)] text-center">
            {t('tracking.enterHint')}
          </p>
        </div>

        {/* Right side - Results */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {!hasResult ? (
              /* Empty state */
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center px-[clamp(1rem,4vmin,2rem)]"
              >
                <div className="w-[clamp(4rem,10vmin,6rem)] h-[clamp(4rem,10vmin,6rem)] bg-muted/50 rounded-full flex items-center justify-center mb-[clamp(0.75rem,2vmin,1.25rem)]">
                  <Search className="w-[clamp(1.5rem,4vmin,2.5rem)] h-[clamp(1.5rem,4vmin,2.5rem)] text-muted-foreground/50" />
                </div>
                <p className="text-[clamp(0.875rem,2vmin,1.125rem)] font-medium text-muted-foreground">
                  {t('tracking.emptyState')}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Loading */}
                {isLoading && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin w-[clamp(2rem,5vmin,3rem)] h-[clamp(2rem,5vmin,3rem)] border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                )}

                {/* Not found */}
                {error && !isLoading && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-[clamp(1rem,4vmin,2rem)]">
                    <div className="w-[clamp(3rem,8vmin,4.5rem)] h-[clamp(3rem,8vmin,4.5rem)] bg-destructive/10 rounded-full flex items-center justify-center mb-[clamp(0.5rem,1.5vmin,1rem)]">
                      <Search className="w-[clamp(1.25rem,3.5vmin,2rem)] h-[clamp(1.25rem,3.5vmin,2rem)] text-destructive" />
                    </div>
                    <h3 className="text-[clamp(1rem,2.5vmin,1.375rem)] font-bold mb-[clamp(0.25rem,0.6vmin,0.375rem)]">
                      {t('tracking.notFound')}
                    </h3>
                    <p className="text-[clamp(0.75rem,1.6vmin,0.9375rem)] text-muted-foreground">
                      {t('tracking.notFoundDesc')}
                    </p>
                  </div>
                )}

                {/* Order found */}
                {order && !isLoading && (
                  <div className="flex-1 flex flex-col px-[clamp(0.75rem,3vmin,1.5rem)] py-[clamp(0.75rem,2vmin,1.25rem)] overflow-y-auto">
                    <div className="max-w-[clamp(22rem,55vmin,30rem)] mx-auto w-full space-y-[clamp(0.5rem,1.5vmin,1rem)]">
                      {/* Order header */}
                      <div className="text-center">
                        <p className="text-[clamp(1.75rem,5vmin,2.75rem)] font-black text-primary tracking-wide">
                          {order.order_number}
                        </p>
                        <p className="text-[clamp(0.75rem,1.6vmin,1rem)] text-muted-foreground">
                          {order.customer_name}
                        </p>
                      </div>

                      {/* Status badge */}
                      <OrderStatusBadge status={order.status} />

                      {/* Wait time */}
                      {(order.status === 'new' || order.status === 'preparing') && waitTime && (
                        <div className="bg-amber-50 rounded-[clamp(0.625rem,1.5vmin,0.875rem)] p-[clamp(0.625rem,2vmin,1rem)] text-center border border-amber-200">
                          <p className="text-[clamp(0.6rem,1.2vmin,0.75rem)] text-amber-600 mb-[clamp(0.0625rem,0.2vmin,0.125rem)]">
                            {t('confirmation.estimatedWait')}
                          </p>
                          <p className="text-[clamp(1.25rem,3.5vmin,2rem)] font-bold text-amber-700">
                            {formatWaitTime(waitTime.estimatedMinutes)}
                          </p>
                          <p className="text-[clamp(0.6rem,1.2vmin,0.75rem)] text-amber-600">
                            {waitTime.ordersAhead} {t('confirmation.ordersAhead')}
                          </p>
                        </div>
                      )}

                      {/* Out for Delivery celebration */}
                      {order.status === 'out_for_delivery' && (
                        <motion.div
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          className="bg-green-50 rounded-[clamp(0.625rem,1.5vmin,0.875rem)] p-[clamp(0.75rem,2.5vmin,1.25rem)] text-center border-2 border-green-300"
                        >
                          <p className="text-[clamp(1.125rem,3vmin,1.75rem)] font-bold text-green-700">
                            {t('tracking.readyPickup')}
                          </p>
                          <p className="text-[clamp(0.65rem,1.4vmin,0.8125rem)] text-green-600 mt-[clamp(0.0625rem,0.2vmin,0.125rem)]">
                            {t('tracking.readyDesc')}
                          </p>
                        </motion.div>
                      )}

                      {/* Arrived - Show feedback button */}
                      {order.status === 'arrived' && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-primary/5 rounded-[clamp(0.625rem,1.5vmin,0.875rem)] p-[clamp(0.75rem,2.5vmin,1.25rem)] text-center border border-primary/20"
                        >
                          <p className="text-[clamp(0.875rem,2vmin,1.125rem)] font-bold text-primary mb-2">
                            {t('tracking.delivered')}
                          </p>
                          <p className="text-[clamp(0.65rem,1.4vmin,0.8125rem)] text-muted-foreground mb-3">
                            {t('feedback.howWasYourMeal')}
                          </p>
                          <Button
                            onClick={() => setShowFeedbackModal(true)}
                            className="gap-2 bg-secondary hover:bg-secondary/90"
                          >
                            <MessageSquare className="w-4 h-4" />
                            {t('feedback.leaveFeedback')}
                          </Button>
                        </motion.div>
                      )}

                      {/* Timeline */}
                      <div className="bg-white rounded-[clamp(0.625rem,1.5vmin,0.875rem)] p-[clamp(0.5rem,1.5vmin,0.875rem)] shadow-card">
                        <h3 className="font-semibold text-[clamp(0.75rem,1.6vmin,0.9375rem)] mb-[clamp(0.25rem,0.8vmin,0.5rem)]">
                          {t('tracking.timeline')}
                        </h3>
                        <OrderTimeline order={order} />
                      </div>

                      {/* Order items */}
                      <div className="bg-white rounded-[clamp(0.625rem,1.5vmin,0.875rem)] p-[clamp(0.5rem,1.5vmin,0.875rem)] shadow-card">
                        <h3 className="font-semibold text-[clamp(0.75rem,1.6vmin,0.9375rem)] mb-[clamp(0.1875rem,0.6vmin,0.375rem)]">
                          {t('tracking.yourItems')}
                        </h3>
                        <div className="space-y-[clamp(0.125rem,0.4vmin,0.25rem)]">
                          {order.order_items?.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center py-[clamp(0.1875rem,0.6vmin,0.375rem)] border-b last:border-0"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-[clamp(0.7rem,1.5vmin,0.875rem)] truncate">
                                  {item.quantity}x{' '}
                                  {item.type === 'combo'
                                    ? `${item.sauce_name} Combo`
                                    : item.sauce_name || 'Item'}
                                </p>
                                {item.type === 'combo' && item.main_dishes?.length > 0 && (
                                  <p className="text-[clamp(0.55rem,1.1vmin,0.6875rem)] text-muted-foreground truncate">
                                    {item.main_dishes.join(', ')}
                                  </p>
                                )}
                              </div>
                              <span className="font-medium text-[clamp(0.7rem,1.5vmin,0.875rem)] ml-[clamp(0.25rem,0.6vmin,0.375rem)] shrink-0">
                                {formatPrice(item.total_price)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center pt-[clamp(0.25rem,0.8vmin,0.5rem)] mt-[clamp(0.25rem,0.8vmin,0.5rem)] border-t font-bold text-[clamp(0.75rem,1.6vmin,0.9375rem)]">
                          <span>{t('cart.total')}</span>
                          <span className="text-secondary">{formatPrice(order.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-[clamp(0.75rem,3vmin,1.5rem)] py-[clamp(0.5rem,1.5vmin,0.75rem)] border-t bg-background">
        <Button
          variant="outline"
          size="touch"
          onClick={() => navigate('/')}
          className={cn(
            'w-full gap-[clamp(0.25rem,0.6vmin,0.375rem)]',
            'text-[clamp(0.8rem,1.8vmin,1rem)]',
            'py-[clamp(0.625rem,2vmin,1rem)] rounded-xl',
            'border-primary/30 text-primary',
            'active:scale-[0.98] active:bg-primary/5 transition-all'
          )}
        >
          <ArrowLeft className="w-[clamp(0.875rem,1.8vmin,1.125rem)] h-[clamp(0.875rem,1.8vmin,1.125rem)]" />
          {t('common.back')}
        </Button>
      </div>

      {/* Feedback Modal */}
      {order && (
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          orderId={order.id}
          orderNumber={order.order_number}
        />
      )}
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();

  const config: Record<string, { label: string; icon: typeof Clock; className: string }> = {
    new: {
      label: t('tracking.preparing'),
      icon: Clock,
      className: 'bg-amber-50 text-amber-700 border-amber-300',
    },
    preparing: {
      label: t('tracking.preparing'),
      icon: ChefHat,
      className: 'bg-amber-50 text-amber-700 border-amber-300',
    },
    ready: {
      label: t('tracking.ready'),
      icon: Package,
      className: 'bg-green-50 text-green-700 border-green-400',
    },
    delivered: {
      label: t('tracking.delivered'),
      icon: Check,
      className: 'bg-primary/5 text-primary border-primary/30',
    },
    cancelled: {
      label: t('tracking.cancelled'),
      icon: Clock,
      className: 'bg-red-50 text-red-700 border-red-300',
    },
  };

  const { label, icon: Icon, className } = config[status] || {
    label: status,
    icon: Clock,
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-[clamp(0.375rem,1vmin,0.625rem)]',
        'px-[clamp(1.25rem,4vmin,2rem)] py-[clamp(0.625rem,1.8vmin,1rem)]',
        'rounded-full border-2 mx-auto',
        'text-[clamp(0.875rem,2.2vmin,1.25rem)] font-semibold',
        className
      )}
    >
      <Icon className="w-[clamp(1rem,2.2vmin,1.375rem)] h-[clamp(1rem,2.2vmin,1.375rem)]" />
      <span>{label}</span>
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
    <div className="space-y-[clamp(0.125rem,0.5vmin,0.375rem)]">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isLast = idx === steps.length - 1;

        return (
          <div key={idx} className="relative flex gap-[clamp(0.5rem,1.2vmin,0.75rem)]">
            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'absolute left-[clamp(0.875rem,2vmin,1.125rem)] top-[clamp(1.75rem,4.2vmin,2.25rem)] w-0.5 h-[calc(100%-clamp(0.5rem,1vmin,0.75rem))] -translate-x-1/2',
                  step.completed ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}

            {/* Icon */}
            <div
              className={cn(
                'relative z-10 shrink-0 flex items-center justify-center rounded-full',
                'w-[clamp(1.75rem,4vmin,2.25rem)] h-[clamp(1.75rem,4vmin,2.25rem)]',
                step.completed
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <Icon className="w-[clamp(0.75rem,1.8vmin,1rem)] h-[clamp(0.75rem,1.8vmin,1rem)]" />
            </div>

            {/* Content */}
            <div className="pb-[clamp(0.5rem,1.5vmin,1rem)]">
              <p
                className={cn(
                  'text-[clamp(0.8rem,1.8vmin,1rem)] font-medium',
                  step.completed ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </p>
              {step.time && (
                <p className="text-[clamp(0.65rem,1.3vmin,0.8rem)] text-muted-foreground">
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
