import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Order } from "@shared/types/orders";

interface RevenueChartProps {
  orders: Order[];
}

export default function RevenueChart({ orders }: RevenueChartProps) {
  // Group by date
  const dailyData = orders.reduce<Record<string, number>>((acc, order) => {
    const date = new Date(order.created_at).toLocaleDateString("en-UG", {
      month: "short",
      day: "numeric",
    });
    acc[date] = (acc[date] || 0) + order.total;
    return acc;
  }, {});

  const chartData = Object.entries(dailyData).map(([date, revenue]) => ({
    date,
    revenue,
  }));

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fontWeight: 700 }}
          axisLine={false}
          tickLine={false}
          stroke="hsl(var(--muted-foreground))"
        />
        <YAxis
          tick={{ fontSize: 10, fontWeight: 700 }}
          axisLine={false}
          tickLine={false}
          stroke="hsl(var(--muted-foreground))"
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.02)' }}
          formatter={(value: number) => [`${value.toLocaleString()} UGX`, "Revenue"]}
          contentStyle={{
            backgroundColor: "#fff",
            border: "none",
            borderRadius: "12px",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
            padding: "12px",
          }}
          itemStyle={{ fontSize: '12px', fontWeight: 800, color: '#212282' }}
          labelStyle={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}
        />
        <Bar dataKey="revenue" fill="#F05223" radius={[4, 4, 0, 0]} barSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
