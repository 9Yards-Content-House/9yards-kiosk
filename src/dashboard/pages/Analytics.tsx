import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Clock } from "lucide-react";
import { supabase } from "@shared/lib/supabase";
import { formatPrice } from "@shared/lib/utils";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "@shared/types/auth";
import RevenueChart from "../components/RevenueChart";
import type { Order } from "@shared/types/orders";

export default function Analytics() {
  const { role } = useAuth();
  const canView = role ? hasPermission(role, "analytics:read") : false;

  const { data: orders } = useQuery<Order[]>({
    queryKey: ["analytics", "orders"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .neq("status", "cancelled")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: canView,
  });

  if (!canView) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">You don't have access to analytics.</p>
      </div>
    );
  }

  const totalOrders = orders?.length || 0;
  const totalRevenue = orders?.reduce((sum, o) => sum + o.total, 0) || 0;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const todayOrders = orders?.filter(
    (o) => new Date(o.created_at).toDateString() === new Date().toDateString()
  ).length || 0;

  const stats = [
    { label: "Total Orders (30d)", value: totalOrders.toString(), icon: ShoppingBag },
    { label: "Revenue (30d)", value: formatPrice(totalRevenue), icon: DollarSign },
    { label: "Avg Order Value", value: formatPrice(avgOrderValue), icon: TrendingUp },
    { label: "Today's Orders", value: todayOrders.toString(), icon: Clock },
  ];

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card rounded-xl border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{stat.label}</span>
              </div>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Revenue chart */}
      <div className="bg-card rounded-xl border p-4">
        <h3 className="font-semibold text-lg mb-4">Daily Revenue (30 days)</h3>
        <RevenueChart orders={orders || []} />
      </div>
    </div>
  );
}
