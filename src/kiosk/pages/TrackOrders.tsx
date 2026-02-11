import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, Volume2, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@shared/context/LanguageContext';
import { supabase } from '@shared/lib/supabase';
import { cn, timeAgo } from '@shared/lib/utils';
import { Order } from '@shared/types';
import { Button } from '@shared/components/ui/button';
import KioskHeader from '../components/KioskHeader';

interface TrackingOrder extends Order {
  itemCount?: number;
}

export default function TrackOrders() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [lastReadyOrder, setLastReadyOrder] = useState<string | null>(null);

  // Fetch today's orders that are preparing or ready
  const { data: orders, refetch } = useQuery({
    queryKey: ['tracking-orders'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(count)
        `)
        .in('status', ['new', 'preparing', 'ready'])
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((order: any) => ({
        ...order,
        itemCount: order.order_items?.[0]?.count || 0,
      })) as TrackingOrder[];
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('tracking-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          refetch();
          
          // Play sound when order becomes ready
          if (payload.new && (payload.new as any).status === 'ready') {
            const orderNum = (payload.new as any).order_number;
            if (orderNum !== lastReadyOrder) {
              setLastReadyOrder(orderNum);
              playReadySound();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, lastReadyOrder]);

  const playReadySound = () => {
    try {
      const audio = new Audio('/sounds/order-ready.mp3');
      audio.volume = 0.7;
      audio.play().catch(() => {});
    } catch {}
  };

  const preparingOrders = (orders || []).filter(
    (o) => o.status === 'new' || o.status === 'preparing'
  );
  const readyOrders = (orders || []).filter((o) => o.status === 'ready');

  return (
    <div className="kiosk-screen flex flex-col bg-background">
      <KioskHeader
        title={t('board.title')}
        showBack
        onBack={() => navigate('/')}
      />

      {/* Live updates indicator */}
      <div className="px-6 py-2 flex items-center justify-between bg-muted/50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          {t('tracking.liveUpdates')}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="gap-1 text-muted-foreground"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Two-column board */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-6 overflow-hidden">
        {/* Preparing Column */}
        <div className="flex flex-col rounded-2xl bg-amber-50 border-2 border-amber-200 overflow-hidden">
          <div className="bg-amber-500 text-white px-4 py-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">{t('board.preparingColumn')}</h2>
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-sm">
              <Users className="w-4 h-4" />
              {preparingOrders.length}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence mode="popLayout">
              {preparingOrders.length === 0 ? (
                <p className="text-center text-amber-600/60 py-8">
                  {t('board.noOrders')}
                </p>
              ) : (
                preparingOrders.map((order) => (
                  <OrderBoardCard
                    key={order.id}
                    order={order}
                    status="preparing"
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Ready Column */}
        <div className="flex flex-col rounded-2xl bg-green-50 border-2 border-green-200 overflow-hidden">
          <div className="bg-green-500 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              <h2 className="text-lg font-bold">{t('board.readyColumn')}</h2>
            </div>
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-sm">
              <Users className="w-4 h-4" />
              {readyOrders.length}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence mode="popLayout">
              {readyOrders.length === 0 ? (
                <p className="text-center text-green-600/60 py-8">
                  {t('board.noOrders')}
                </p>
              ) : (
                readyOrders.map((order) => (
                  <OrderBoardCard
                    key={order.id}
                    order={order}
                    status="ready"
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Footer with back button */}
      <div className="p-4 border-t bg-muted/30">
        <Button
          variant="outline"
          size="touch"
          onClick={() => navigate('/')}
          className="w-full gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('common.back')}
        </Button>
      </div>
    </div>
  );
}

interface OrderBoardCardProps {
  order: TrackingOrder;
  status: 'preparing' | 'ready';
}

function OrderBoardCard({ order, status }: OrderBoardCardProps) {
  const isReady = status === 'ready';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, x: 100 }}
      className={cn(
        'rounded-xl p-4 shadow-sm',
        isReady
          ? 'bg-white border-2 border-green-400 animate-pulse-glow'
          : 'bg-white border border-amber-200'
      )}
    >
      {/* Order number - large and prominent */}
      <div
        className={cn(
          'text-2xl md:text-3xl font-black text-center mb-2',
          isReady ? 'text-green-600' : 'text-amber-600'
        )}
      >
        {order.order_number}
      </div>

      {/* Customer name */}
      <div className="text-center text-base font-medium text-foreground truncate">
        {order.customer_name}
      </div>

      {/* Time */}
      <div className="text-center text-sm text-muted-foreground mt-1">
        {timeAgo(order.created_at)}
      </div>
    </motion.div>
  );
}
