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
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          stroke="hsl(var(--muted-foreground))"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          stroke="hsl(var(--muted-foreground))"
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value: number) => [`UGX ${value.toLocaleString()}`, "Revenue"]}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Bar dataKey="revenue" fill="hsl(12, 82%, 50%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
