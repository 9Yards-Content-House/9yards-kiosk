import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarClock, Clock, User, Phone, ChevronRight } from 'lucide-react';
import { formatPrice, cn } from '@shared/lib/utils';
import StatusBadge from './StatusBadge';
import type { Order } from '@shared/types/orders';

interface ScheduledOrdersListProps {
  orders: Order[];
}

function formatScheduledTime(isoString: string): { date: string; time: string; isToday: boolean; isSoon: boolean } {
  const scheduledDate = new Date(isoString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const scheduledDay = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());
  
  const isToday = today.getTime() === scheduledDay.getTime();
  const minutesUntil = (scheduledDate.getTime() - now.getTime()) / (1000 * 60);
  const isSoon = minutesUntil > 0 && minutesUntil <= 60; // Within the next hour
  
  const date = isToday
    ? 'Today'
    : scheduledDate.toLocaleDateString('en-UG', { weekday: 'short', month: 'short', day: 'numeric' });
  
  const time = scheduledDate.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' });
  
  return { date, time, isToday, isSoon };
}

function getTimeUntil(isoString: string): string {
  const scheduledDate = new Date(isoString);
  const now = new Date();
  const diff = scheduledDate.getTime() - now.getTime();
  
  if (diff < 0) return 'Past due';
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `in ${days}d ${hours % 24}h`;
  if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
  return `in ${minutes}m`;
}

export default function ScheduledOrdersList({ orders }: ScheduledOrdersListProps) {
  const navigate = useNavigate();
  
  // Sort by scheduled time (soonest first)
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aTime = a.scheduled_for ? new Date(a.scheduled_for).getTime() : 0;
      const bTime = b.scheduled_for ? new Date(b.scheduled_for).getTime() : 0;
      return aTime - bTime;
    });
  }, [orders]);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <CalendarClock className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Scheduled Orders</h3>
        <p className="text-sm text-gray-500 max-w-xs">
          Orders scheduled for later will appear here. They'll automatically move to the board when it's time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline View */}
      <div className="grid gap-3">
        {sortedOrders.map((order, index) => {
          const scheduled = order.scheduled_for ? formatScheduledTime(order.scheduled_for) : null;
          const timeUntil = order.scheduled_for ? getTimeUntil(order.scheduled_for) : '';
          const isPastDue = timeUntil === 'Past due';
          
          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/orders/${order.order_number}`)}
              className={cn(
                "bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow",
                scheduled?.isSoon && "border-amber-400 bg-amber-50/50",
                isPastDue && "border-red-400 bg-red-50/50"
              )}
            >
              <div className="flex items-start gap-4">
                {/* Time Indicator */}
                <div className={cn(
                  "shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center text-center",
                  scheduled?.isSoon ? "bg-amber-100" : isPastDue ? "bg-red-100" : "bg-primary/10"
                )}>
                  <Clock className={cn(
                    "w-4 h-4 mb-1",
                    scheduled?.isSoon ? "text-amber-600" : isPastDue ? "text-red-600" : "text-primary"
                  )} />
                  <span className={cn(
                    "text-sm font-bold",
                    scheduled?.isSoon ? "text-amber-700" : isPastDue ? "text-red-700" : "text-primary"
                  )}>
                    {scheduled?.time}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {scheduled?.date}
                  </span>
                </div>

                {/* Order Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">{order.order_number}</h3>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-medium px-2 py-1 rounded-full",
                        scheduled?.isSoon ? "bg-amber-200 text-amber-800" : 
                        isPastDue ? "bg-red-200 text-red-800" : "bg-blue-100 text-blue-700"
                      )}>
                        {timeUntil}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-3.5 h-3.5" />
                      <span className="truncate">{order.customer_name}</span>
                    </div>
                    {order.customer_phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-3.5 h-3.5" />
                        <span className="truncate">{order.customer_phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <span className="text-sm text-gray-500">
                      {order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} items
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#E6411C]">{formatPrice(order.total)}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
