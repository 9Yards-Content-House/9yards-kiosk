import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { subDays, endOfDay, startOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Clock,
  Calendar,
  ArrowUp,
  ArrowDown,
  Download,
  PieChart,
  BarChart3,
} from 'lucide-react';
import { supabase, USE_MOCK_DATA } from '@shared/lib/supabase';
import { formatPrice, cn } from '@shared/lib/utils';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '@shared/types/auth';
import RevenueChart from '../components/RevenueChart';
import AIInsightsPanel from '../components/AIInsightsPanel';
import { Button } from '@shared/components/ui/button';
import { DateRangePicker } from '@shared/components/ui/date-range-picker';
import { Skeleton } from '@shared/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { exportAnalyticsSummary, type AnalyticsSummary } from '@shared/lib/export';
import type { Order, OrderItem } from '@shared/types/orders';

// Extended OrderItem type for analytics (includes optional menu_item relationship)
interface AnalyticsOrderItem extends OrderItem {
  menu_item?: { name: string; category?: { name: string } };
}
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

// Generate mock analytics data for development
function generateMockAnalyticsOrders(): Order[] {
  const orders: Order[] = [];
  const now = Date.now();
  const menuItemsData = [
    { name: "G-Nuts", category: "Sauces" },
    { name: "Chicken Stew", category: "Sauces" },
    { name: "Beef Stew", category: "Sauces" },
    { name: "Fish", category: "Sauces" },
    { name: "Cowpeas", category: "Sauces" },
    { name: "Matooke", category: "Main Dishes" },
    { name: "White Rice", category: "Main Dishes" },
    { name: "Pilao", category: "Main Dishes" },
    { name: "Passion Fruit Juice", category: "Juices" },
    { name: "Mango Juice", category: "Juices" },
    { name: "Chapati", category: "Desserts" },
    { name: "Samosa", category: "Desserts" },
    { name: "Ordinary Lusaniya", category: "Lusaniya" },
  ];
  const paymentMethods: Array<"cash" | "mobile_money" | "pay_at_counter"> = ["cash", "mobile_money", "pay_at_counter"];
  const customers = ["John Doe", "Jane Smith", "Peter Otieno", "Mary Nakato", "Moses Ocheng", "Sarah Namugalu"];
  
  for (let i = 0; i < 80; i++) {
    const daysAgo = Math.floor(Math.random() * 90);
    const hoursAgo = Math.floor(Math.random() * 24);
    const orderDate = new Date(now - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000));
    const numItems = Math.floor(Math.random() * 3) + 1;
    const itemsTotal = (Math.floor(Math.random() * 40) + 15) * 1000;
    
    const prepTimeMinutes = Math.floor(Math.random() * 20) + 8;
    const preparedDate = new Date(orderDate.getTime() + prepTimeMinutes * 60 * 1000);
    const readyDate = new Date(preparedDate.getTime() + 5 * 60 * 1000);
    
    orders.push({
      id: `analytics-order-${i}`,
      order_number: String(Math.floor(100000 + Math.random() * 900000)),
      status: "arrived",
      customer_name: customers[Math.floor(Math.random() * customers.length)],
      customer_phone: `+25670${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
      customer_location: `Office ${Math.floor(Math.random() * 500)}`,
      payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      payment_status: "paid",
      momo_transaction_id: null,
      subtotal: itemsTotal,
      delivery_fee: 5000,
      total: itemsTotal + 5000,
      special_instructions: null,
      source: "kiosk",
      created_at: orderDate.toISOString(),
      updated_at: orderDate.toISOString(),
      prepared_at: preparedDate.toISOString(),
      ready_at: readyDate.toISOString(),
      delivered_at: readyDate.toISOString(),
      rider_id: null,
      assigned_at: null,
      picked_up_at: null,
      picked_up_by: null,
      scheduled_for: null,
      is_scheduled: false,
      location_id: null,
      items: Array.from({ length: numItems }, (_, j) => {
        const item = menuItemsData[Math.floor(Math.random() * menuItemsData.length)];
        return {
          id: `item-${i}-${j}`,
          order_id: `analytics-order-${i}`,
          type: "single" as const,
          main_dishes: [],
          sauce_name: item.name,
          sauce_preparation: null,
          sauce_size: null,
          side_dish: null,
          extras: null,
          quantity: Math.floor(Math.random() * 2) + 1,
          unit_price: Math.floor(itemsTotal / numItems),
          total_price: Math.floor(itemsTotal / numItems),
          menu_item: { name: item.name, category_id: "cat-1", category: { name: item.category } },
        };
      }),
    });
  }
  
  return orders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

const MOCK_ANALYTICS_ORDERS = generateMockAnalyticsOrders();

const CATEGORY_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
];

export default function Analytics() {
  const { role, loading: authLoading } = useAuth();
  const canView = role ? hasPermission(role, 'analytics:read') : false;
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['analytics', 'orders', dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        console.log("📦 Mock mode: returning mock analytics orders");
        if (!dateRange?.from) return MOCK_ANALYTICS_ORDERS;
        return MOCK_ANALYTICS_ORDERS.filter(o => {
          const orderDate = new Date(o.created_at);
          return orderDate >= (dateRange.from || new Date(0)) && 
                 orderDate <= (dateRange.to || new Date());
        });
      }
      
      // Query orders with their items - order_items stores item names directly, not via FK
      let query = supabase
        .from('orders')
        .select('*, order_items(*)')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true });

      if (dateRange?.from) {
        query = query.gte('created_at', startOfDay(dateRange.from).toISOString());
      }
      if (dateRange?.to) {
        // Use end of day to include all orders from the selected end date
        query = query.lte('created_at', endOfDay(dateRange.to).toISOString());
      }

      const { data, error } = await query;
      if (error) {
        console.error("Analytics query error:", error);
        throw error;
      }
      
      console.log(`📊 Analytics: fetched ${data?.length || 0} orders`);
      
      return (data || []).map(order => ({
        ...order,
        items: order.order_items || [],
      }));
    },
    enabled: canView,
  });

  const metrics = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        totalOrders: 0, totalRevenue: 0, avgOrderValue: 0, todayOrders: 0, todayRevenue: 0,
        ordersByHour: [] as { hour: number; count: number }[],
        ordersByDay: [] as { day: string; count: number; revenue: number }[],
        topItems: [] as { name: string; count: number; revenue: number }[],
        categoryBreakdown: [] as { name: string; count: number; revenue: number }[],
        paymentBreakdown: {} as Record<string, { count: number; amount: number }>,
        peakHour: 12, avgPrepTime: 0, repeatCustomers: 0, revenueChange: 0, ordersChange: 0,
        prepTimeDistribution: [] as { range: string; count: number }[],
      };
    }

    const today = new Date().toDateString();
    const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today);

    const hourCounts: Record<number, number> = {};
    orders.forEach((o) => {
      const hour = new Date(o.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const ordersByHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourCounts[h] || 0 }));
    const peakHour = ordersByHour.reduce((max, curr) => curr.count > max.count ? curr : max).hour;

    const dayCounts: Record<string, { count: number; revenue: number }> = {};
    orders.forEach((o) => {
      const day = new Date(o.created_at).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' });
      if (!dayCounts[day]) dayCounts[day] = { count: 0, revenue: 0 };
      dayCounts[day].count++;
      dayCounts[day].revenue += o.total;
    });
    const ordersByDay = Object.entries(dayCounts).map(([day, data]) => ({ day, ...data }));

    const itemCounts: Record<string, { count: number; revenue: number }> = {};
    const categoryCounts: Record<string, { count: number; revenue: number }> = {};
    orders.forEach((o) => {
      const orderItems = (o.order_items || o.items || []) as AnalyticsOrderItem[];
      orderItems.forEach((item) => {
        // Get item name from available fields
        const name = item.sauce_name || item.menu_item?.name || (item.main_dishes?.[0]) || 'Unknown';
        if (name && name !== 'Unknown') {
          if (!itemCounts[name]) itemCounts[name] = { count: 0, revenue: 0 };
          itemCounts[name].count += item.quantity || 1;
          itemCounts[name].revenue += (item.unit_price || 0) * (item.quantity || 1);
        }
        
        // Infer category from item data - real order_items don't have menu_item relationship
        let category = 'Other';
        if (item.menu_item?.category?.name) {
          category = item.menu_item.category.name;
        } else if (item.type === 'combo') {
          category = 'Combos';
        } else if (item.main_dishes && item.main_dishes.length > 0) {
          category = 'Main Dishes';
        } else if (item.sauce_name) {
          category = 'Sauces';
        } else if (item.side_dish) {
          category = 'Side Dishes';
        }
        
        if (!categoryCounts[category]) categoryCounts[category] = { count: 0, revenue: 0 };
        categoryCounts[category].count += item.quantity || 1;
        categoryCounts[category].revenue += (item.unit_price || 0) * (item.quantity || 1);
      });
    });
    const topItems = Object.entries(itemCounts).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.count - a.count).slice(0, 10);
    const categoryBreakdown = Object.entries(categoryCounts).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue);

    const paymentBreakdown: Record<string, { count: number; amount: number }> = {};
    orders.forEach((o) => {
      const method = o.payment_method || 'unknown';
      if (!paymentBreakdown[method]) paymentBreakdown[method] = { count: 0, amount: 0 };
      paymentBreakdown[method].count++;
      paymentBreakdown[method].amount += o.total;
    });

    const customerCounts: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.customer_phone) customerCounts[o.customer_phone] = (customerCounts[o.customer_phone] || 0) + 1;
    });
    const repeatCustomers = Object.values(customerCounts).filter((c) => c > 1).length;

    const prepTimes: number[] = [];
    orders.forEach((o) => {
      if (o.created_at && o.prepared_at) {
        const prepMinutes = Math.round((new Date(o.prepared_at).getTime() - new Date(o.created_at).getTime()) / 60000);
        if (prepMinutes > 0 && prepMinutes < 120) prepTimes.push(prepMinutes);
      }
    });
    const avgPrepTime = prepTimes.length > 0 ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length) : 0;

    const prepRanges = [
      { label: '0-10m', min: 0, max: 10 }, { label: '10-15m', min: 10, max: 15 },
      { label: '15-20m', min: 15, max: 20 }, { label: '20-30m', min: 20, max: 30 }, { label: '30+m', min: 30, max: 999 },
    ];
    const prepTimeDistribution = prepRanges.map(range => ({
      range: range.label,
      count: prepTimes.filter(t => t >= range.min && t < range.max).length,
    }));

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
      ordersByHour, ordersByDay, topItems, categoryBreakdown, paymentBreakdown,
      peakHour, avgPrepTime, repeatCustomers, revenueChange, ordersChange, prepTimeDistribution,
    };
  }, [orders]);

  const handleExport = () => {
    if (!orders || orders.length === 0) return;
    const summary: AnalyticsSummary = {
      totalOrders: metrics.totalOrders, totalRevenue: metrics.totalRevenue,
      avgOrderValue: metrics.avgOrderValue, avgPrepTime: metrics.avgPrepTime,
      topItems: metrics.topItems,
      categoryBreakdown: metrics.categoryBreakdown.map(c => ({ category: c.name, count: c.count, revenue: c.revenue })),
      paymentMethods: Object.entries(metrics.paymentBreakdown).map(([method, data]) => ({
        method, count: data.count, percent: (data.amount / metrics.totalRevenue) * 100,
      })),
      dateRange: {
        start: dateRange?.from?.toLocaleDateString() || 'All time',
        end: dateRange?.to?.toLocaleDateString() || 'Now',
      },
    };
    exportAnalyticsSummary(summary);
  };

  if (authLoading) {
    return <div className="p-6 flex justify-center"><div className="w-6 h-6 animate-spin border-2 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!canView) {
    return <div className="p-6 text-center"><p className="text-muted-foreground">You don't have access to analytics.</p></div>;
  }

  const stats = [
    { label: 'Total Orders', value: metrics.totalOrders.toString(), icon: ShoppingBag, change: metrics.ordersChange, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Revenue', value: formatPrice(metrics.totalRevenue), icon: DollarSign, change: metrics.revenueChange, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Avg Order', value: formatPrice(metrics.avgOrderValue), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Avg Prep Time', value: metrics.avgPrepTime > 0 ? `${metrics.avgPrepTime} min` : 'N/A', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track performance and insights</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button variant="outline" onClick={handleExport} disabled={!orders || orders.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="bg-card rounded-xl border p-4">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', stat.bg)}>
                  <Icon className={cn('w-5 h-5', stat.color)} />
                </div>
                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
                {stat.change !== undefined && stat.change !== 0 && (
                  <div className={cn('flex items-center gap-1 text-xs mt-1', stat.change > 0 ? 'text-green-600' : 'text-red-600')}>
                    {stat.change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {Math.abs(stat.change).toFixed(1)}% vs prev period
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview"><BarChart3 className="w-4 h-4 mr-2" />Overview</TabsTrigger>
          <TabsTrigger value="categories"><PieChart className="w-4 h-4 mr-2" />Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl border p-4">
              <h3 className="font-semibold text-lg mb-4">Revenue Trend</h3>
              <RevenueChart orders={orders || []} />
            </div>
            <div className="bg-card rounded-xl border p-4">
              <h3 className="font-semibold text-lg mb-4">Orders by Hour</h3>
              <div className="flex items-end gap-1 h-40">
                {metrics.ordersByHour.map(({ hour, count }) => {
                  const maxCount = Math.max(...metrics.ordersByHour.map((h) => h.count)) || 1;
                  const height = (count / maxCount) * 100;
                  const isPeak = hour === metrics.peakHour;
                  return (
                    <div key={hour} className="flex-1 flex flex-col items-center" title={`${hour}:00 - ${count} orders`}>
                      <div className={cn('w-full rounded-t transition-all', isPeak ? 'bg-primary' : 'bg-muted')} style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }} />
                      {hour % 4 === 0 && <span className="text-[10px] text-muted-foreground mt-1">{hour}h</span>}
                    </div>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground mt-3 text-center">Peak hour: <span className="font-medium text-foreground">{metrics.peakHour}:00</span></p>
            </div>
          </div>

          {metrics.avgPrepTime > 0 && (
            <div className="bg-card rounded-xl border p-4">
              <h3 className="font-semibold text-lg mb-4">Preparation Time Distribution</h3>
              <div className="flex items-end gap-2 h-32">
                {metrics.prepTimeDistribution.map(({ range, count }) => {
                  const maxCount = Math.max(...metrics.prepTimeDistribution.map(p => p.count)) || 1;
                  const height = (count / maxCount) * 100;
                  return (
                    <div key={range} className="flex-1 flex flex-col items-center">
                      <span className="text-xs text-muted-foreground mb-1">{count}</span>
                      <div className="w-full bg-primary/80 rounded-t transition-all" style={{ height: `${height}%`, minHeight: count > 0 ? '8px' : '0' }} />
                      <span className="text-[10px] text-muted-foreground mt-2 text-center">{range}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground mt-4 text-center">Average: <span className="font-medium text-foreground">{metrics.avgPrepTime} minutes</span></p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AIInsightsPanel orders={orders || []} />
            <div className="bg-card rounded-xl border p-4">
              <h3 className="font-semibold text-lg mb-4">Top Selling Items</h3>
              <div className="space-y-3">
                {metrics.topItems.map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold', idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-gray-200 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground')}>{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.count} sold • {formatPrice(item.revenue)}</p>
                    </div>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(item.count / (metrics.topItems[0]?.count || 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
                {metrics.topItems.length === 0 && <p className="text-muted-foreground text-center py-8">No data available</p>}
              </div>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <h3 className="font-semibold text-lg mb-4">Payment Methods</h3>
              <div className="space-y-4">
                {Object.entries(metrics.paymentBreakdown).map(([method, data]) => {
                  const total = Object.values(metrics.paymentBreakdown).reduce((s, d) => s + d.amount, 0);
                  const pct = total > 0 ? (data.amount / total) * 100 : 0;
                  const methodLabel = method === 'mobile_money' ? 'Mobile Money' : method === 'pay_at_counter' ? 'Pay at Counter' : method === 'cash' ? 'Cash' : method;
                  return (
                    <div key={method}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium capitalize">{methodLabel}</span>
                        <span className="text-muted-foreground">{data.count} orders • {formatPrice(data.amount)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className={cn('h-full rounded-full', method === 'mobile_money' ? 'bg-green-500' : method === 'pay_at_counter' ? 'bg-blue-500' : method === 'cash' ? 'bg-amber-500' : 'bg-gray-500')} />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(metrics.paymentBreakdown).length === 0 && <p className="text-muted-foreground text-center py-8">No data available</p>}
              </div>
              <div className="mt-6 pt-4 border-t grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Peak Hour</p><p className="font-bold">{metrics.peakHour}:00</p></div>
                <div><p className="text-xs text-muted-foreground">Repeat Customers</p><p className="font-bold">{metrics.repeatCustomers}</p></div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl border p-4">
              <h3 className="font-semibold text-lg mb-4">Revenue by Category</h3>
              {metrics.categoryBreakdown.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie data={metrics.categoryBreakdown} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={100} fill="#8884d8" dataKey="revenue" nameKey="name">
                        {metrics.categoryBreakdown.map((_, index) => <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatPrice(value)} />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-muted-foreground text-center py-20">No category data available</p>}
            </div>
            <div className="bg-card rounded-xl border p-4">
              <h3 className="font-semibold text-lg mb-4">Category Breakdown</h3>
              <div className="space-y-3">
                {metrics.categoryBreakdown.map((cat, idx) => {
                  const totalRevenue = metrics.categoryBreakdown.reduce((s, c) => s + c.revenue, 0);
                  const pct = totalRevenue > 0 ? (cat.revenue / totalRevenue) * 100 : 0;
                  return (
                    <div key={cat.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} />
                      <div className="flex-1">
                        <div className="flex justify-between"><span className="font-medium">{cat.name}</span><span className="text-muted-foreground">{formatPrice(cat.revenue)}</span></div>
                        <div className="flex justify-between text-xs text-muted-foreground"><span>{cat.count} items sold</span><span>{pct.toFixed(1)}%</span></div>
                      </div>
                    </div>
                  );
                })}
                {metrics.categoryBreakdown.length === 0 && <p className="text-muted-foreground text-center py-8">No data available</p>}
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Calendar className="w-5 h-5" />Today's Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg"><p className="text-2xl font-bold">{metrics.todayOrders}</p><p className="text-sm text-muted-foreground">Orders</p></div>
              <div className="text-center p-4 bg-muted/50 rounded-lg"><p className="text-2xl font-bold">{formatPrice(metrics.todayRevenue)}</p><p className="text-sm text-muted-foreground">Revenue</p></div>
              <div className="text-center p-4 bg-muted/50 rounded-lg"><p className="text-2xl font-bold">{metrics.avgPrepTime || 'N/A'}</p><p className="text-sm text-muted-foreground">Avg Prep (min)</p></div>
              <div className="text-center p-4 bg-muted/50 rounded-lg"><p className="text-2xl font-bold">{metrics.repeatCustomers}</p><p className="text-sm text-muted-foreground">Repeat Customers</p></div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
