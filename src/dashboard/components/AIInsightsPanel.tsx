import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Lightbulb,
  Users,
  DollarSign,
  BarChart3,
  Zap,
  Calendar,
} from "lucide-react";
import type { Order } from "@shared/types";
import { formatPrice } from "@shared/lib/utils";

interface Insight {
  id: string;
  type: "success" | "warning" | "info" | "prediction";
  icon: typeof TrendingUp;
  title: string;
  description: string;
  metric?: string;
  trend?: "up" | "down" | "neutral";
  priority: number;
}

// Generate AI insights from order data
export function generateInsights(orders: Order[]): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Filter orders by time period
  const todayOrders = orders.filter(o => new Date(o.created_at) >= today);
  const thisWeekOrders = orders.filter(o => new Date(o.created_at) >= thisWeekStart);
  const lastWeekOrders = orders.filter(o => {
    const date = new Date(o.created_at);
    return date >= lastWeekStart && date < thisWeekStart;
  });

  // Today's revenue
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
  
  // Calculate average order value
  const avgOrderValue = orders.length > 0 
    ? orders.reduce((sum, o) => sum + o.total, 0) / orders.length 
    : 0;

  // Week over week comparison
  const thisWeekRevenue = thisWeekOrders.reduce((sum, o) => sum + o.total, 0);
  const lastWeekRevenue = lastWeekOrders.reduce((sum, o) => sum + o.total, 0);
  const weekOverWeekChange = lastWeekRevenue > 0 
    ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 
    : 0;

  // 1. Revenue trend insight
  if (weekOverWeekChange > 10) {
    insights.push({
      id: "revenue-up",
      type: "success",
      icon: TrendingUp,
      title: "Revenue is Growing!",
      description: `This week's revenue is up ${weekOverWeekChange.toFixed(0)}% compared to last week`,
      metric: formatPrice(thisWeekRevenue),
      trend: "up",
      priority: 10,
    });
  } else if (weekOverWeekChange < -10) {
    insights.push({
      id: "revenue-down",
      type: "warning",
      icon: TrendingDown,
      title: "Revenue Decline Detected",
      description: `This week's revenue is down ${Math.abs(weekOverWeekChange).toFixed(0)}% compared to last week`,
      metric: formatPrice(thisWeekRevenue),
      trend: "down",
      priority: 10,
    });
  }

  // 2. Peak hours detection
  const hourCounts: Record<number, number> = {};
  orders.forEach(o => {
    const hour = new Date(o.created_at).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  if (peakHour) {
    const hourNum = parseInt(peakHour[0]);
    const hourLabel = hourNum === 0 ? "12 AM" 
      : hourNum < 12 ? `${hourNum} AM` 
      : hourNum === 12 ? "12 PM" 
      : `${hourNum - 12} PM`;
    
    insights.push({
      id: "peak-hour",
      type: "info",
      icon: Clock,
      title: "Peak Hour Detected",
      description: `Most orders come in around ${hourLabel}. Consider extra staffing during this time.`,
      metric: `${peakHour[1]} orders`,
      priority: 7,
    });
  }

  // 3. Order source distribution (kiosk / website / app)
  const sourceCounts: Record<string, number> = {};
  orders.forEach((o) => {
    const key = o.source || "unknown";
    sourceCounts[key] = (sourceCounts[key] || 0) + 1;
  });

  const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0];
  if (topSource && orders.length > 0) {
    const [source, count] = topSource;
    insights.push({
      id: "top-source",
      type: "info",
      icon: Users,
      title: "Top Order Source",
      description: `Most orders are coming from ${source}.`,
      metric: `${((count / orders.length) * 100).toFixed(0)}% of orders`,
      priority: 5,
    });
  }

  // 4. Average order value insight
  insights.push({
    id: "avg-order",
    type: "info",
    icon: DollarSign,
    title: "Average Order Value",
    description: avgOrderValue > 30000 
      ? "Great average order value! Upselling is working well."
      : "Consider upselling to increase average order value.",
    metric: formatPrice(avgOrderValue),
    trend: avgOrderValue > 30000 ? "up" : "neutral",
    priority: 6,
  });

  // 5. Payment method trends
  const momoCount = orders.filter(o => o.payment_method === "mobile_money").length;
  const cashCount = orders.filter(o => o.payment_method === "cash").length;
  
  if (momoCount > cashCount) {
    insights.push({
      id: "momo-preferred",
      type: "success",
      icon: Zap,
      title: "Mobile Money Leads",
      description: `${((momoCount / orders.length) * 100).toFixed(0)}% of customers pay with Mobile Money`,
      metric: `${momoCount} transactions`,
      priority: 4,
    });
  }

  // 6. Today's performance prediction
  const currentHour = now.getHours();
  const remainingHours = 22 - currentHour; // Assuming restaurant closes at 10 PM
  
  if (remainingHours > 0 && todayOrders.length > 0) {
    const hourlyRate = todayOrders.length / Math.max(currentHour - 8, 1); // Assuming open at 8 AM
    const predictedTotal = todayOrders.length + (hourlyRate * remainingHours);
    const predictedRevenue = todayRevenue + (todayRevenue / todayOrders.length * hourlyRate * remainingHours);
    
    insights.push({
      id: "daily-prediction",
      type: "prediction",
      icon: Lightbulb,
      title: "Today's Projection",
      description: `Based on current trends, expect ~${Math.round(predictedTotal)} orders today`,
      metric: formatPrice(predictedRevenue),
      priority: 8,
    });
  }

  // 7. Low inventory warning (simulated based on popular items)
  if (orders.length > 20) {
    insights.push({
      id: "inventory-alert",
      type: "warning",
      icon: AlertTriangle,
      title: "Check Inventory",
      description: "High order volume detected. Verify stock levels for popular items.",
      priority: 9,
    });
  }

  // Sort by priority
  return insights.sort((a, b) => b.priority - a.priority);
}

interface AIInsightsPanelProps {
  orders: Order[];
}

export default function AIInsightsPanel({ orders }: AIInsightsPanelProps) {
  const insights = generateInsights(orders);

  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">AI Insights</h3>
            <p className="text-sm text-gray-500">Smart business recommendations</p>
          </div>
        </div>
        <p className="text-gray-500 text-center py-8">
          More data needed to generate insights. Keep collecting orders!
        </p>
      </div>
    );
  }

  const typeConfig = {
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    prediction: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">AI Insights</h3>
          <p className="text-sm text-gray-500">Smart business recommendations</p>
        </div>
      </div>

      <div className="space-y-3">
        {insights.slice(0, 5).map((insight, idx) => {
          const config = typeConfig[insight.type];
          const Icon = insight.icon;
          
          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-4 rounded-xl border ${config.bg} ${config.border}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.iconBg}`}>
                  <Icon className={`w-4 h-4 ${config.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                    {insight.metric && (
                      <span className="text-sm font-bold text-gray-700 whitespace-nowrap">
                        {insight.metric}
                        {insight.trend === "up" && <TrendingUp className="inline w-3 h-3 ml-1 text-green-500" />}
                        {insight.trend === "down" && <TrendingDown className="inline w-3 h-3 ml-1 text-red-500" />}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{insight.description}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {insights.length > 5 && (
        <p className="text-center text-sm text-gray-500 mt-4">
          +{insights.length - 5} more insights available
        </p>
      )}
    </div>
  );
}
