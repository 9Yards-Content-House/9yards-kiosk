import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Package,
  Printer,
  Phone,
  ArrowRight,
  Bike,
} from 'lucide-react';
import { cn, formatPrice, timeAgo, vibrate } from '@shared/lib/utils';
import { supabase, USE_MOCK_DATA } from '@shared/lib/supabase';
import {
  ORDER_STATUS_LABELS,
  type Order,
  type OrderStatus,
  type OrderItem,
} from '@shared/types/orders';
import { Button } from '@shared/components/ui/button';
import { usePrintTicket } from '../hooks/usePrintTicket';
import StatusBadge from './StatusBadge';
import { getMockOrdersStore } from '@shared/hooks/useOrders';
import { AssignRiderModal } from './AssignRiderModal';

interface OrderBoardEnhancedProps {
  grouped: Record<OrderStatus, Order[]>;
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
}

const DISPLAY_STATUSES: OrderStatus[] = ['new', 'preparing', 'out_for_delivery', 'arrived'];

const STATUS_COLORS: Record<OrderStatus, string> = {
  new: 'bg-blue-500',
  preparing: 'bg-amber-500',
  out_for_delivery: 'bg-green-500',
  arrived: 'bg-gray-400',
  cancelled: 'bg-red-500',
};

const STATUS_BG: Record<OrderStatus, string> = {
  new: 'bg-blue-50',
  preparing: 'bg-amber-50',
  out_for_delivery: 'bg-green-50',
  arrived: 'bg-gray-50',
  cancelled: 'bg-red-50',
};

export default function OrderBoardEnhanced({
  grouped,
  onStatusChange,
}: OrderBoardEnhancedProps) {
  const navigate = useNavigate();
  const { printTicket } = usePrintTicket();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState<Order | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Assign rider and move order to out_for_delivery
  const handleAssignRider = useCallback(
    async (orderId: string, riderId: string) => {
      setIsAssigning(true);
      try {
        if (USE_MOCK_DATA) {
          const mockOrders = getMockOrdersStore();
          const mockOrder = mockOrders.find(o => o.id === orderId);
          if (mockOrder) {
            mockOrder.status = 'out_for_delivery';
            mockOrder.rider_id = riderId;
            mockOrder.assigned_at = new Date().toISOString();
            mockOrder.ready_at = new Date().toISOString();
            mockOrder.updated_at = new Date().toISOString();
            console.log(`🚴 Mock order ${mockOrder.order_number} assigned to rider ${riderId}`);
          }
          onStatusChange?.(orderId, 'out_for_delivery');
          return;
        }

        const { error } = await supabase
          .from('orders')
          .update({
            status: 'out_for_delivery',
            rider_id: riderId,
            assigned_at: new Date().toISOString(),
            ready_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        if (error) throw error;
        onStatusChange?.(orderId, 'out_for_delivery');
      } catch (err) {
        console.error('Error assigning rider:', err);
      } finally {
        setIsAssigning(false);
      }
    },
    [onStatusChange]
  );

  const handleStatusAdvance = useCallback(
    async (order: Order, currentStatus: OrderStatus) => {
      const statusIndex = DISPLAY_STATUSES.indexOf(currentStatus);
      if (statusIndex === -1 || statusIndex >= DISPLAY_STATUSES.length - 1) return;

      const newStatus = DISPLAY_STATUSES[statusIndex + 1];
      
      // If transitioning to out_for_delivery, show rider assignment modal
      if (newStatus === 'out_for_delivery') {
        setOrderToAssign(order);
        setAssignModalOpen(true);
        vibrate();
        return;
      }

      setUpdatingId(order.id);
      vibrate();

      try {
        // Mock mode - update local store
        if (USE_MOCK_DATA) {
          const mockOrders = getMockOrdersStore();
          const mockOrder = mockOrders.find(o => o.id === order.id);
          if (mockOrder) {
            mockOrder.status = newStatus;
            mockOrder.updated_at = new Date().toISOString();
            console.log(`📦 Mock order ${mockOrder.order_number} → ${newStatus}`);
          }
          onStatusChange?.(order.id, newStatus);
          return;
        }

        const { error } = await supabase
          .from('orders')
          .update({
            status: newStatus,
          })
          .eq('id', order.id);

        if (error) throw error;
        onStatusChange?.(order.id, newStatus);
      } catch (err) {
        console.error('Error updating order status:', err);
      } finally {
        setUpdatingId(null);
      }
    },
    [onStatusChange]
  );

  const handlePrint = useCallback(
    (order: Order, e: React.MouseEvent) => {
      e.stopPropagation();
      vibrate();
      // Adapt Order type to printTicket's expected format
      const printOrder = {
        ...order,
        notes: order.special_instructions,
        order_items: (order.items || order.order_items || []).map((item) => ({
          ...item,
          menu_item: { name: item.sauce_name || 'Item', category: undefined },
        })),
      };
      printTicket(printOrder, { showPrices: false, copies: 1 });
    },
    [printTicket]
  );

  const getNextStatusLabel = (status: OrderStatus): string | null => {
    const statusIndex = DISPLAY_STATUSES.indexOf(status);
    if (statusIndex === -1 || statusIndex >= DISPLAY_STATUSES.length - 1)
      return null;
    return ORDER_STATUS_LABELS[DISPLAY_STATUSES[statusIndex + 1]];
  };

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
      {DISPLAY_STATUSES.map((status) => (
        <div
          key={status}
          className={cn(
            'flex flex-col rounded-xl border overflow-hidden',
            STATUS_BG[status]
          )}
        >
          {/* Column Header */}
          <div className="flex items-center gap-2 p-4 border-b bg-white/80 backdrop-blur-sm sticky top-0">
            <div
              className={cn('w-3 h-3 rounded-full', STATUS_COLORS[status])}
            />
            <h3 className="font-semibold">{ORDER_STATUS_LABELS[status]}</h3>
            <span className="ml-auto bg-white px-2 py-0.5 rounded-full text-sm font-medium text-muted-foreground shadow-sm">
              {grouped[status]?.length || 0}
            </span>
          </div>

          {/* Orders List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <AnimatePresence mode="popLayout">
              {grouped[status]?.map((order) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    onClick={() => navigate(`/orders/${order.order_number}`)}
                    className={cn(
                      'bg-white rounded-xl border p-4 cursor-pointer',
                      'hover:shadow-lg hover:border-primary/30 transition-all',
                      status === 'new' && 'new-order-pulse border-secondary',
                      updatingId === order.id && 'opacity-50 pointer-events-none'
                    )}
                  >
                    {/* Order Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-lg">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(order.created_at)}
                        </p>
                      </div>
                      <StatusBadge status={order.status} size="sm" />
                    </div>

                    {/* Customer Info */}
                    {order.customer_name && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <User className="w-4 h-4" />
                        <span className="truncate">{order.customer_name}</span>
                        {order.customer_phone && (
                          <a
                            href={`tel:${order.customer_phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary hover:underline ml-auto"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Rider Info (if assigned) */}
                    {order.rider_id && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 bg-green-50 rounded-lg p-2">
                        <Bike className="w-4 h-4 text-green-600" />
                        <span className="text-green-700">
                          {order.rider?.full_name || 'Rider assigned'}
                        </span>
                      </div>
                    )}

                    {/* Order Details */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Package className="w-4 h-4" />
                      <span>
                        {order.items?.length || 0} items •{' '}
                        {formatPrice(order.total)}
                      </span>
                    </div>

                    {/* Items Preview */}
                    <div className="text-xs text-muted-foreground bg-gray-50 rounded-lg p-2 mb-3">
                      {order.items?.slice(0, 2).map((item: OrderItem, idx: number) => (
                        <div key={idx} className="truncate">
                          {item.quantity}x {item.sauce_name || 'Item'}
                        </div>
                      ))}
                      {(order.items?.length || 0) > 2 && (
                        <div className="text-primary">
                          +{(order.items?.length || 0) - 2} more
                        </div>
                      )}
                    </div>

                    {/* Payment Info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                      <span className="capitalize">
                        {order.payment_method?.replace('_', ' ') || 'Unknown'}
                      </span>
                      <span
                        className={cn(
                          'capitalize px-2 py-0.5 rounded',
                          order.payment_status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        )}
                      >
                        {order.payment_status}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handlePrint(order, e)}
                        className="flex-1"
                      >
                        <Printer className="w-4 h-4 mr-1" />
                        Print
                      </Button>

                      {getNextStatusLabel(status) && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusAdvance(order, status);
                          }}
                          disabled={updatingId === order.id}
                          className="flex-1 gap-1"
                        >
                          {updatingId === order.id ? (
                            'Updating...'
                          ) : (
                            <>
                              {getNextStatusLabel(status)}
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {(!grouped[status] || grouped[status].length === 0) && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Package className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-sm">No {ORDER_STATUS_LABELS[status].toLowerCase()} orders</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>

    {/* Rider Assignment Modal */}
    <AssignRiderModal
      open={assignModalOpen}
      onOpenChange={setAssignModalOpen}
      order={orderToAssign}
      onAssign={handleAssignRider}
      isAssigning={isAssigning}
    />
    </>
  );
}
