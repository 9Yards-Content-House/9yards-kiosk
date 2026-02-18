import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, eachDayOfInterval, isSameDay } from "date-fns";
import type { Order } from "@shared/types/orders";
import { DateRange } from "react-day-picker";

interface RevenueChartProps {
  orders: Order[];
  dateRange?: DateRange;
}

export default function RevenueChart({ orders, dateRange }: RevenueChartProps) {
  // Generate date range bounds
  const startDate = dateRange?.from || new Date(new Date().setDate(new Date().getDate() - 29));
  const endDate = dateRange?.to || new Date();

  // Generate all days in interval to fill gaps
  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  // Pre-group orders by date string for efficiency
  const revenueMap = orders.reduce<Record<string, number>>((acc, order) => {
    const d = format(new Date(order.created_at), "yyyy-MM-dd");
    acc[d] = (acc[d] || 0) + order.total;
    return acc;
  }, {});

  const chartData = days.map(day => {
    const d = format(day, "yyyy-MM-dd");
    return {
      date: format(day, "MMM d"),
      fullDate: format(day, "PPPP"),
      revenue: revenueMap[d] || 0,
    };
  });

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground font-medium uppercase tracking-widest text-[10px]">
        No trend data available
      </div>
    );
  }

  // Calculate interval for XAxis to prevent crowding
  const interval = chartData.length > 14 ? Math.floor(chartData.length / 7) : 0;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#212282" stopOpacity={0.15}/>
            <stop offset="95%" stopColor="#212282" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid 
          strokeDasharray="4 4" 
          vertical={false} 
          stroke="rgba(0,0,0,0.03)" 
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          interval={interval}
          dy={10}
        />
        <YAxis
          tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()}
          width={40}
        />
        <Tooltip
          cursor={{ stroke: '#212282', strokeWidth: 1, strokeDasharray: '4 4' }}
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-100 min-w-[140px]">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1.5">{data.fullDate}</p>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[11px] font-bold text-slate-600">Revenue</span>
                    <span className="text-sm font-black text-[#212282]">
                      {payload[0].value?.toLocaleString()} <span className="text-[9px] opacity-70">UGX</span>
                    </span>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#212282"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorRevenue)"
          activeDot={{ 
            r: 5, 
            fill: '#ffffff', 
            stroke: '#212282', 
            strokeWidth: 2,
            boxShadow: '0 4px 10px rgba(33,34,130,0.2)' 
          }}
          animationDuration={1500}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
