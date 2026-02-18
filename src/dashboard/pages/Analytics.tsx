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
  ArrowDown,
  PieChart,
  BarChart3,
  Users,
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
      const from = dateRange?.from || subDays(new Date(), 29);
      const to = dateRange?.to || new Date();

      if (USE_MOCK_DATA) {
        return MOCK_ANALYTICS_ORDERS.filter(o => {
          const orderDate = new Date(o.created_at);
          return orderDate >= startOfDay(from) && orderDate <= endOfDay(to);
        });
      }
      
      let query = supabase
        .from('orders')
        .select('*, order_items(*)')
        .neq('status', 'cancelled')
        .gte('created_at', startOfDay(from).toISOString())
        .lte('created_at', endOfDay(to).toISOString())
        .order('created_at', { ascending: true });

      const { data, error } = await query;
      if (error) {
        console.error("Analytics query error:", error);
        throw error;
      }
      
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


    return {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
      avgOrderValue: orders.length > 0 ? Math.round(orders.reduce((sum, o) => sum + o.total, 0) / orders.length) : 0,
      todayOrders: todayOrders.length,
      todayRevenue: todayOrders.reduce((sum, o) => sum + o.total, 0),
      ordersByHour, ordersByDay, topItems, categoryBreakdown, paymentBreakdown,
      peakHour, avgPrepTime, repeatCustomers, prepTimeDistribution,
    };
  }, [orders]);


  if (authLoading) {
    return <div className="p-6 flex justify-center"><div className="w-6 h-6 animate-spin border-2 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!canView) {
    return <div className="p-6 text-center"><p className="text-muted-foreground">You don't have access to analytics.</p></div>;
  }

  const stats = [
    { 
      label: 'Total Orders', 
      value: metrics.totalOrders.toString(), 
      icon: ShoppingBag, 
      color: 'text-[#212282]', 
      bg: 'bg-[#212282]/5' 
    },
    { 
      label: 'Revenue', 
      value: formatPrice(metrics.totalRevenue), 
      icon: DollarSign, 
      color: 'text-[#212282]', 
      bg: 'bg-[#212282]/5' 
    },
    { 
      label: 'Avg Order', 
      value: formatPrice(metrics.avgOrderValue), 
      icon: TrendingUp, 
      color: 'text-[#212282]', 
      bg: 'bg-[#212282]/5' 
    },
    { 
      label: 'Avg Prep Time', 
      value: metrics.avgPrepTime > 0 ? `${metrics.avgPrepTime} min` : 'N/A', 
      icon: Clock, 
      color: 'text-secondary', 
      bg: 'bg-secondary/5',
    },
    { 
      label: 'Peak Hour', 
      value: metrics.totalOrders > 0 ? `${metrics.peakHour}:00` : 'N/A', 
      icon: Clock, 
      color: 'text-secondary', 
      bg: 'bg-secondary/5',
      subValue: 'Highest Demand'
    },
    { 
      label: 'Repeat Customers', 
      value: metrics.repeatCustomers.toString(), 
      icon: Users, 
      color: 'text-[#212282]', 
      bg: 'bg-[#212282]/5',
      subValue: 'Loyal Base'
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track performance and insights</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>
      

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            // For inverted metrics (like prep time), lower is better so we flip the color logic
            const isPositive = stat.invertedChange 
              ? (stat.change !== undefined && stat.change < 0) 
              : (stat.change !== undefined && stat.change > 0);
            
            return (
              <motion.div 
                key={stat.label} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: idx * 0.1 }} 
                className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
              >
                <div>
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300', 
                    stat.bg
                  )}>
                    <Icon className={cn('w-5 h-5', stat.color)} />
                  </div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mb-1">{stat.label}</p>
                  <p className="text-xl font-black text-[#212282] tracking-tight truncate">{stat.value}</p>
                </div>
                
                {stat.subValue && (
                  <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                    {stat.subValue}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full justify-start md:w-auto h-auto p-1 bg-muted/50 overflow-x-auto no-scrollbar">
          <TabsTrigger value="overview" className="flex-1 md:flex-none py-2 px-4 whitespace-nowrap"><BarChart3 className="w-4 h-4 mr-2" />Overview</TabsTrigger>
          <TabsTrigger value="categories" className="flex-1 md:flex-none py-2 px-4 whitespace-nowrap"><PieChart className="w-4 h-4 mr-2" />Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-2xl border shadow-sm p-4">
              <h3 className="font-bold text-lg mb-4 text-[#212282]">Revenue Trend</h3>
              <div className="h-[250px] md:h-[300px]">
                <RevenueChart 
                  orders={orders || []} 
                  dateRange={dateRange}
                />
              </div>
            </div>
            <div className="bg-card rounded-2xl border shadow-sm p-4">
              <h3 className="font-bold text-lg mb-4 text-[#212282]">Orders by Hour</h3>
              <div className="overflow-x-auto no-scrollbar pb-2">
                <div className="flex items-end gap-1 h-40 min-w-[500px] md:min-w-0">
                  {metrics.ordersByHour.map(({ hour, count }) => {
                    const maxCount = Math.max(...metrics.ordersByHour.map((h) => h.count)) || 1;
                    const height = (count / maxCount) * 100;
                    const isPeak = hour === metrics.peakHour;
                    return (
                      <div key={hour} className="flex-1 flex flex-col items-center group relative" title={`${hour}:00 - ${count} orders`}>
                        <div 
                          className={cn(
                            'w-full rounded-t transition-all', 
                            isPeak 
                              ? 'bg-secondary shadow-[0_4px_12px_rgba(240,82,35,0.3)] ring-1 ring-secondary/20' 
                              : 'bg-slate-100 group-hover:bg-slate-200'
                          )} 
                          style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }} 
                        />
                        {isPeak && (
                          <div className="absolute -top-6 bg-secondary text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm">
                            Peak
                          </div>
                        )}
                        {hour % 2 === 0 && <span className="text-[9px] md:text-[10px] text-muted-foreground mt-2 font-black tabular-nums">{hour}h</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-4 text-center bg-slate-50 py-2 rounded-xl font-medium">
                Peak demand usually starts at <span className="font-black text-[#212282]">{metrics.peakHour}:00</span>
              </p>
            </div>
          </div>

          {metrics.avgPrepTime > 0 && (
            <div className="bg-card rounded-2xl border shadow-sm p-4">
              <h3 className="font-bold text-lg mb-4 text-[#212282]">Preparation Time Distribution</h3>
              <div className="overflow-x-auto no-scrollbar">
                <div className="flex items-end gap-3 h-32 min-w-[300px] md:min-w-0 px-2 lg:px-4">
                  {metrics.prepTimeDistribution.map(({ range, count }) => {
                    const maxCount = Math.max(...metrics.prepTimeDistribution.map(p => p.count)) || 1;
                    const height = (count / maxCount) * 100;
                    const isOptimal = range === '0-10m' || range === '10-15m';
                    
                    return (
                      <div key={range} className="flex-1 flex flex-col items-center group">
                        <span className="text-[10px] font-black text-[#212282] mb-1.5 tabular-nums">{count}</span>
                        <div 
                          className={cn(
                            'w-full rounded-t-lg transition-all', 
                            isOptimal ? 'bg-emerald-400 group-hover:bg-emerald-500' : 'bg-slate-200 group-hover:bg-slate-300'
                          )} 
                          style={{ height: `${height}%`, minHeight: count > 0 ? '8px' : '0' }} 
                        />
                        <span className="text-[9px] md:text-[10px] text-slate-400 mt-2.5 font-black uppercase tracking-tighter">{range}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-6 pt-4 border-t flex items-center justify-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Optimal (&lt;15m)</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium italic">
                  Average Prep: <span className="font-black text-[#212282]">{metrics.avgPrepTime}m</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AIInsightsPanel orders={orders || []} />
            <div className="bg-card rounded-2xl border shadow-sm p-4">
              <h3 className="font-bold text-lg mb-4 text-[#212282]">Top Selling Items</h3>
              <div className="space-y-3">
                {metrics.topItems.map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm', 
                      idx === 0 ? 'bg-yellow-400 text-yellow-900' : 
                      idx === 1 ? 'bg-slate-200 text-slate-700' : 
                      idx === 2 ? 'bg-amber-600 text-white' : 
                      'bg-slate-100 text-slate-500'
                    )}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">{item.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {item.count} items • {formatPrice(item.revenue)}
                      </p>
                    </div>
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-secondary rounded-full" 
                        style={{ width: `${(item.count / (metrics.topItems[0]?.count || 1)) * 100}%` }} 
                      />
                    </div>
                  </div>
                ))}
                {metrics.topItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <ShoppingBag className="w-8 h-8 text-slate-100" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">No Sales Recorded</p>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-card rounded-2xl border shadow-sm p-4">
              <h3 className="font-bold text-lg mb-4 text-[#212282]">Payment Methods</h3>
              <div className="space-y-5">
                {Object.entries(metrics.paymentBreakdown).map(([method, data]) => {
                  const total = Object.values(metrics.paymentBreakdown).reduce((s, d) => s + d.amount, 0);
                  const pct = total > 0 ? (data.amount / total) * 100 : 0;
                  const methodLabel = method === 'mobile_money' ? 'Mobile Money' : method === 'pay_at_counter' ? 'Counter' : method === 'cash' ? 'Cash' : method;
                  return (
                    <div key={method}>
                      <div className="flex justify-between items-end mb-1.5">
                        <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{methodLabel}</span>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-[#212282]">{formatPrice(data.amount)}</span>
                          <span className="text-[10px] text-slate-300 ml-1.5">({data.count})</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${pct}%` }} 
                          className={cn(
                            'h-full rounded-full shadow-sm', 
                            method === 'mobile_money' ? 'bg-green-400' : 
                            method === 'pay_at_counter' ? 'bg-[#212282]' : 
                            method === 'cash' ? 'bg-amber-400' : 'bg-slate-400'
                          )} 
                        />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(metrics.paymentBreakdown).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <DollarSign className="w-8 h-8 text-slate-100" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">No Transactions</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-2xl border shadow-sm p-4">
              <h3 className="font-bold text-lg mb-4 text-[#212282]">Revenue by Category</h3>
              {metrics.categoryBreakdown.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie 
                        data={metrics.categoryBreakdown} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={60}
                        outerRadius={100} 
                        paddingAngle={5}
                        dataKey="revenue" 
                        nameKey="name"
                      >
                        {metrics.categoryBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [formatPrice(value), "Revenue"]}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                  <PieChart className="w-8 h-8 text-slate-100" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">No Category Data</p>
                </div>
              )}
            </div>
            <div className="bg-card rounded-2xl border shadow-sm p-4">
              <h3 className="font-bold text-lg mb-4 text-[#212282]">Category Breakdown</h3>
              <div className="space-y-4">
                {metrics.categoryBreakdown.map((cat, idx) => {
                  const totalRevenue = metrics.categoryBreakdown.reduce((s, c) => s + c.revenue, 0);
                  const pct = totalRevenue > 0 ? (cat.revenue / totalRevenue) * 100 : 0;
                  return (
                    <div key={cat.name} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} />
                          <span className="text-sm font-bold text-slate-900">{cat.name}</span>
                        </div>
                        <span className="text-sm font-black text-[#212282]">{formatPrice(cat.revenue)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        <span>{cat.count} items sold</span>
                        <span>{pct.toFixed(1)}% of total</span>
                      </div>
                    </div>
                  );
                })}
                {metrics.categoryBreakdown.length === 0 && (
                   <div className="flex flex-col items-center justify-center py-20 gap-2">
                    <BarChart3 className="w-8 h-8 text-slate-100" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">No Data Available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-card rounded-2xl border shadow-sm p-4">
            <h3 className="font-bold text-lg mb-4 text-[#212282] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-secondary" />
              Today's Performance
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-100/50 hover:bg-slate-100 transition-colors">
                <p className="text-2xl font-black text-[#212282] tabular-nums">{metrics.todayOrders}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Orders</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-100/50 hover:bg-slate-100 transition-colors">
                <p className="text-2xl font-black text-[#212282] tabular-nums">{formatPrice(metrics.todayRevenue)}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Revenue</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-100/50 hover:bg-slate-100 transition-colors">
                <p className="text-2xl font-black text-[#212282] tabular-nums">{metrics.avgPrepTime || 'N/A'}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Avg Prep (m)</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-100/50 hover:bg-slate-100 transition-colors">
                <p className="text-2xl font-black text-[#212282] tabular-nums">{metrics.repeatCustomers}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Loyal Users</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
