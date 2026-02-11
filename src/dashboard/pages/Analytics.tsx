import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Clock,
  Users,
  Utensils,
  Calendar,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { supabase } from '@shared/lib/supabase';
import { formatPrice, cn } from '@shared/lib/utils';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '@shared/types/auth';
import RevenueChart from '../components/RevenueChart';
import { Button } from '@shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/components/ui/select';
import type { Order } from '@shared/types/orders';

type TimeRange = '7d' | '30d' | '90d' | 'all';

export default function Analytics() {
  const { role } = useAuth();
  const canView = role ? hasPermission(role, 'analytics:read') : false;
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const getDateRange = (range: TimeRange): Date | null => {
    if (range === 'all') return null;
    const date = new Date();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    date.setDate(date.getDate() - days);
    return date;
  };

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['analytics', 'orders', timeRange],
    queryFn: async () => {
      const startDate = getDateRange(timeRange);
      let query = supabase
        .from('orders')
        .select('*, order_items(*, menu_item:menu_items(name, category_id))')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true });

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: canView,
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        todayOrders: 0,
        todayRevenue: 0,
        ordersByHour: [] as { hour: number; count: number }[],
        ordersByDay: [] as { day: string; count: number; revenue: number }[],
        topItems: [] as { name: string; count: number; revenue: number }[],
        paymentBreakdown: {} as Record<string, { count: number; amount: number }>,
        peakHour: 12,
        avgPrepTime: 0,
        repeatCustomers: 0,
        revenueChange: 0,
        ordersChange: 0,
      };
    }

    const today = new Date().toDateString();
    const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today);

    // Calculate by hour distribution
    const hourCounts: Record<number, number> = {};
    orders.forEach((o) => {
      const hour = new Date(o.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const ordersByHour = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      count: hourCounts[h] || 0,
    }));
    const peakHour = ordersByHour.reduce((max, curr) =>
      curr.count > max.count ? curr : max
    ).hour;

    // Calculate by day
    const dayCounts: Record<string, { count: number; revenue: number }> = {};
    orders.forEach((o) => {
      const day = new Date(o.created_at).toLocaleDateString('en-UG', {
        month: 'short',
        day: 'numeric',
      });
      if (!dayCounts[day]) dayCounts[day] = { count: 0, revenue: 0 };
      dayCounts[day].count++;
      dayCounts[day].revenue += o.total;
    });
    const ordersByDay = Object.entries(dayCounts).map(([day, data]) => ({
      day,
      ...data,
    }));

    // Top menu items
    const itemCounts: Record<string, { count: number; revenue: number }> = {};
    orders.forEach((o) => {
      o.order_items?.forEach((item: any) => {
        const name = item.menu_item?.name || 'Unknown';
        if (!itemCounts[name]) itemCounts[name] = { count: 0, revenue: 0 };
        itemCounts[name].count += item.quantity;
        itemCounts[name].revenue += item.unit_price * item.quantity;
      });
    });
    const topItems = Object.entries(itemCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Payment method breakdown
    const paymentBreakdown: Record<string, { count: number; amount: number }> = {};
    orders.forEach((o) => {
      const method = o.payment_method || 'unknown';
      if (!paymentBreakdown[method]) paymentBreakdown[method] = { count: 0, amount: 0 };
      paymentBreakdown[method].count++;
      paymentBreakdown[method].amount += o.total;
    });

    // Repeat customers (by phone)
    const customerCounts: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.customer_phone) {
        customerCounts[o.customer_phone] = (customerCounts[o.customer_phone] || 0) + 1;
      }
    });
    const repeatCustomers = Object.values(customerCounts).filter((c) => c > 1).length;

    // Calculate change from previous period
    const midPoint = Math.floor(orders.length / 2);
    const firstHalf = orders.slice(0, midPoint);
    const secondHalf = orders.slice(midPoint);
    const firstRevenue = firstHalf.reduce((sum, o) => sum + o.total, 0);
    const secondRevenue = secondHalf.reduce((sum, o) => sum + o.total, 0);
    const revenueChange = firstRevenue > 0 ? ((secondRevenue - firstRevenue) / firstRevenue) * 100 : 0;
    const ordersChange = firstHalf.length > 0 ? ((secondHalf.length - firstHalf.length) / firstHalf.length) * 100 : 0;

    return {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
      avgOrderValue: Math.round(orders.reduce((sum, o) => sum + o.total, 0) / orders.length),
      todayOrders: todayOrders.length,
      todayRevenue: todayOrders.reduce((sum, o) => sum + o.total, 0),
      ordersByHour,
      ordersByDay,
      topItems,
      paymentBreakdown,
      peakHour,
      avgPrepTime: 15, // Would need actual data
      repeatCustomers,
      revenueChange,
      ordersChange,
    };
  }, [orders]);

  if (!canView) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">You don't have access to analytics.</p>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Orders',
      value: metrics.totalOrders.toString(),
      icon: ShoppingBag,
      change: metrics.ordersChange,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Revenue',
      value: formatPrice(metrics.totalRevenue),
      icon: DollarSign,
      change: metrics.revenueChange,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Avg Order',
      value: formatPrice(metrics.avgOrderValue),
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Today',
      value: `${metrics.todayOrders} orders`,
      subValue: formatPrice(metrics.todayRevenue),
      icon: Calendar,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track performance and insights</p>
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Summary cards */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-card rounded-xl border p-4"
              >
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', stat.bg)}>
                  <Icon className={cn('w-5 h-5', stat.color)} />
                </div>
                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
                {stat.subValue && (
                  <p className="text-sm text-muted-foreground">{stat.subValue}</p>
                )}
                {stat.change !== undefined && stat.change !== 0 && (
                  <div
                    className={cn(
                      'flex items-center gap-1 text-xs mt-1',
                      stat.change > 0 ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {stat.change > 0 ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )}
                    {Math.abs(stat.change).toFixed(1)}% vs prev period
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <div className="bg-card rounded-xl border p-4">
          <h3 className="font-semibold text-lg mb-4">Revenue Trend</h3>
          <RevenueChart orders={orders || []} />
        </div>

        {/* Peak hours */}
        <div className="bg-card rounded-xl border p-4">
          <h3 className="font-semibold text-lg mb-4">Orders by Hour</h3>
          <div className="flex items-end gap-1 h-40">
            {metrics.ordersByHour.map(({ hour, count }) => {
              const maxCount = Math.max(...metrics.ordersByHour.map((h) => h.count)) || 1;
              const height = (count / maxCount) * 100;
              const isNow = new Date().getHours() === hour;
              const isPeak = hour === metrics.peakHour;
              return (
                <div
                  key={hour}
                  className="flex-1 flex flex-col items-center"
                  title={`${hour}:00 - ${count} orders`}
                >
                  <div
                    className={cn(
                      'w-full rounded-t transition-all',
                      isPeak ? 'bg-primary' : isNow ? 'bg-secondary' : 'bg-muted'
                    )}
                    style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                  />
                  {hour % 4 === 0 && (
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {hour}h
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground mt-3 text-center">
            Peak hour: <span className="font-medium text-foreground">{metrics.peakHour}:00</span>
          </p>
        </div>
      </div>

      {/* Top Items & Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top selling items */}
        <div className="bg-card rounded-xl border p-4">
          <h3 className="font-semibold text-lg mb-4">Top Selling Items</h3>
          <div className="space-y-3">
            {metrics.topItems.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                  idx === 0 ? 'bg-amber-100 text-amber-700' :
                  idx === 1 ? 'bg-gray-200 text-gray-700' :
                  idx === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-muted text-muted-foreground'
                )}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.count} sold • {formatPrice(item.revenue)}
                  </p>
                </div>
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{
                      width: `${(item.count / (metrics.topItems[0]?.count || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {metrics.topItems.length === 0 && (
              <p className="text-muted-foreground text-center py-8">No data available</p>
            )}
          </div>
        </div>

        {/* Payment breakdown */}
        <div className="bg-card rounded-xl border p-4">
          <h3 className="font-semibold text-lg mb-4">Payment Methods</h3>
          <div className="space-y-4">
            {Object.entries(metrics.paymentBreakdown).map(([method, data]) => {
              const total = Object.values(metrics.paymentBreakdown).reduce((s, d) => s + d.amount, 0);
              const pct = total > 0 ? (data.amount / total) * 100 : 0;
              const methodLabel =
                method === 'momo' ? 'Mobile Money' :
                method === 'counter' ? 'Pay at Counter' :
                method === 'cash' ? 'Cash' : method;
              return (
                <div key={method}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium capitalize">{methodLabel}</span>
                    <span className="text-muted-foreground">
                      {data.count} orders • {formatPrice(data.amount)}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      className={cn(
                        'h-full rounded-full',
                        method === 'momo' ? 'bg-green-500' :
                        method === 'counter' ? 'bg-blue-500' :
                        method === 'cash' ? 'bg-amber-500' : 'bg-gray-500'
                      )}
                    />
                  </div>
                </div>
              );
            })}
            {Object.keys(metrics.paymentBreakdown).length === 0 && (
              <p className="text-muted-foreground text-center py-8">No data available</p>
            )}
          </div>

          {/* Quick stats */}
          <div className="mt-6 pt-4 border-t grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Peak Hour</p>
              <p className="font-bold">{metrics.peakHour}:00</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Repeat Customers</p>
              <p className="font-bold">{metrics.repeatCustomers}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
