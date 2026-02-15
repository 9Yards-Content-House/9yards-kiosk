import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Lightbulb,
  Users,
  DollarSign,
  Zap,
  Calendar,
  Target,
  Sparkles,
  ChefHat,
  ThumbsUp,
} from "lucide-react";
import type { Order } from "@shared/types";
import { formatPrice, cn } from "@shared/lib/utils";

interface Insight {
  id: string;
  type: "success" | "warning" | "info" | "prediction";
  icon: typeof TrendingUp;
  title: string;
  description: string;
  metric?: string;
  trend?: "up" | "down" | "neutral";
  priority: number;
  actionable?: string;
}

// Calculate preparation time statistics
function getAvgPrepTime(orders: Order[]): { avg: number; fast: number; slow: number } {
  const prepTimes = orders
    .filter(o => o.prepared_at && o.created_at)
    .map(o => {
      const created = new Date(o.created_at).getTime();
      const prepared = new Date(o.prepared_at!).getTime();
      return (prepared - created) / (1000 * 60); // minutes
    })
    .filter(t => t > 0 && t < 120); // filter out outliers
  
  if (prepTimes.length === 0) return { avg: 0, fast: 0, slow: 0 };
  
  const sorted = [...prepTimes].sort((a, b) => a - b);
  return {
    avg: prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length,
    fast: sorted[Math.floor(sorted.length * 0.1)] || 0,
    slow: sorted[Math.floor(sorted.length * 0.9)] || 0,
  };
}

// Get day of week performance
function getDayPerformance(orders: Order[]): { bestDay: string; worstDay: string } {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayRevenue: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  
  orders.forEach(o => {
    const day = new Date(o.created_at).getDay();
    dayRevenue[day] += o.total;
  });
  
  const sorted = Object.entries(dayRevenue).sort((a, b) => b[1] - a[1]);
  return {
    bestDay: dayNames[parseInt(sorted[0][0])],
    worstDay: dayNames[parseInt(sorted[sorted.length - 1][0])],
  };
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

  // 6. Today's performance prediction - more accurate
  const currentHour = now.getHours();
  const remainingHours = 22 - currentHour; // Assuming restaurant closes at 10 PM
  
  if (remainingHours > 0 && currentHour >= 8 && todayOrders.length > 0) {
    const hoursOpen = currentHour - 8;
    const hourlyRate = todayOrders.length / Math.max(hoursOpen, 1);
    const predictedTotal = Math.round(todayOrders.length + (hourlyRate * remainingHours));
    const avgOrderVal = todayRevenue / todayOrders.length;
    const predictedRevenue = Math.round(todayOrders.length * avgOrderVal + (hourlyRate * remainingHours * avgOrderVal));
    
    insights.push({
      id: "daily-prediction",
      type: "prediction",
      icon: Lightbulb,
      title: "Today's Projection",
      description: `Based on current trends, expect ~${predictedTotal} orders today`,
      metric: formatPrice(predictedRevenue),
      priority: 10,
    });
  }

  // 7. Preparation time analysis
  const prepStats = getAvgPrepTime(orders);
  if (prepStats.avg > 0) {
    const avgMins = Math.round(prepStats.avg);
    if (avgMins <= 12) {
      insights.push({
        id: "prep-time-good",
        type: "success",
        icon: ChefHat,
        title: "Fast Kitchen",
        description: "Preparation times are excellent. Keep up the great work!",
        metric: `${avgMins} min avg`,
        trend: "up",
        priority: 6,
      });
    } else if (avgMins >= 20) {
      insights.push({
        id: "prep-time-slow",
        type: "warning",
        icon: Clock,
        title: "Review Prep Times",
        description: "Average preparation time is higher than usual. Consider optimizing kitchen workflow.",
        metric: `${avgMins} min avg`,
        trend: "down",
        priority: 8,
        actionable: "Check kitchen workflow",
      });
    }
  }

  // 8. Best performing day
  if (orders.length >= 14) {
    const dayPerf = getDayPerformance(orders);
    insights.push({
      id: "best-day",
      type: "info",
      icon: Calendar,
      title: "Best Sales Day",
      description: `${dayPerf.bestDay}s generate the most revenue. Consider promotions on ${dayPerf.worstDay}s.`,
      metric: dayPerf.bestDay,
      priority: 4,
      actionable: `Run ${dayPerf.worstDay} special`,
    });
  }

  // 9. Customer satisfaction hint (based on no order issues)
  const completedOrders = orders.filter(o => o.status === "arrived").length;
  const cancelledOrders = orders.filter(o => o.status === "cancelled").length;
  const completionRate = orders.length > 0 ? (completedOrders / orders.length) * 100 : 0;
  
  if (completionRate >= 95 && orders.length >= 10) {
    insights.push({
      id: "high-completion",
      type: "success",
      icon: ThumbsUp,
      title: "Excellent Fulfillment",
      description: `${completionRate.toFixed(0)}% order completion rate. Customers are happy!`,
      metric: `${completedOrders}/${orders.length}`,
      trend: "up",
      priority: 5,
    });
  } else if (cancelledOrders > 3 && orders.length >= 10) {
    insights.push({
      id: "high-cancellation",
      type: "warning",
      icon: AlertTriangle,
      title: "Review Cancellations",
      description: `${cancelledOrders} orders cancelled. Investigate and address root causes.`,
      metric: `${((cancelledOrders / orders.length) * 100).toFixed(1)}%`,
      trend: "down",
      priority: 9,
      actionable: "Check cancellation reasons",
    });
  }

  // 10. Growth opportunity
  if (avgOrderValue < 35000 && orders.length >= 5) {
    insights.push({
      id: "upsell-opportunity",
      type: "info",
      icon: Target,
      title: "Upsell Opportunity",
      description: "Average order is below UGX 35,000. Suggest drinks or extras at checkout.",
      metric: formatPrice(avgOrderValue),
      actionable: "Enable upselling prompts",
      priority: 7,
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
      <div className="bg-gradient-to-br from-slate-50 to-purple-50/50 rounded-2xl p-6 shadow-sm border border-purple-100/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-[#212282]">AI Insights</h3>
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
      bg: "bg-gradient-to-br from-green-50 to-emerald-50/50",
      border: "border-green-200/60",
      iconBg: "bg-gradient-to-br from-green-400 to-emerald-500",
      iconColor: "text-white",
      metricColor: "text-green-700",
    },
    warning: {
      bg: "bg-gradient-to-br from-amber-50 to-orange-50/50",
      border: "border-amber-200/60",
      iconBg: "bg-gradient-to-br from-amber-400 to-orange-500",
      iconColor: "text-white",
      metricColor: "text-amber-700",
    },
    info: {
      bg: "bg-gradient-to-br from-blue-50 to-indigo-50/50",
      border: "border-blue-200/60",
      iconBg: "bg-gradient-to-br from-blue-400 to-indigo-500",
      iconColor: "text-white",
      metricColor: "text-blue-700",
    },
    prediction: {
      bg: "bg-gradient-to-br from-purple-50 to-pink-50/50",
      border: "border-purple-200/60",
      iconBg: "bg-gradient-to-br from-purple-400 to-pink-500",
      iconColor: "text-white",
      metricColor: "text-purple-700",
    },
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-purple-50/50 rounded-2xl p-6 shadow-sm border border-purple-100/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-[#212282]">AI Insights</h3>
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, type: "spring", stiffness: 400, damping: 25 }}
              className={cn(
                "p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow",
                config.bg,
                config.border
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0",
                  config.iconBg
                )}>
                  <Icon className={cn("w-4 h-4", config.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 text-sm">{insight.title}</h4>
                    {insight.metric && (
                      <span className={cn(
                        "text-sm font-bold whitespace-nowrap flex items-center gap-1",
                        config.metricColor
                      )}>
                        {insight.metric}
                        {insight.trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-green-500" />}
                        {insight.trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{insight.description}</p>
                  {insight.actionable && (
                    <span className="inline-block mt-2 text-xs font-medium text-[#212282] bg-[#212282]/10 px-2 py-0.5 rounded-full">
                      💡 {insight.actionable}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {insights.length > 5 && (
        <p className="text-center text-xs text-gray-500 mt-4 font-medium">
          +{insights.length - 5} more insights available
        </p>
      )}
    </div>
  );
}
