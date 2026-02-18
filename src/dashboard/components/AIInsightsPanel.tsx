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
import type { Order } from "@shared/types/orders";
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
  if (weekOverWeekChange > 5) {
    insights.push({
      id: "revenue-up",
      type: "success",
      icon: TrendingUp,
      title: "Revenue is Growing!",
      description: `This week's revenue is up ${weekOverWeekChange.toFixed(0)}% compared to last week. Demand is high!`,
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
      description: `This week's revenue is down ${Math.abs(weekOverWeekChange).toFixed(0)}% compared to last week. Consider a promotion.`,
      metric: formatPrice(thisWeekRevenue),
      trend: "down",
      priority: 10,
    });
  }

  // 2. Peak hours detection - Using Uganda Time (+3)
  const hourCounts: Record<number, number> = {};
  orders.forEach(o => {
    const date = new Date(o.created_at);
    const hour = (date.getUTCHours() + 3) % 24;
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
      description: `Most orders come in around ${hourLabel}. Ensure kitchen staff is ready for the surge.`,
      metric: `${peakHour[1]} orders`,
      priority: 7,
      actionable: "Optimize staff shifts",
    });
  }

  // 3. Order source distribution
  const sourceCounts: Record<string, number> = {};
  orders.forEach((o) => {
    const key = o.source || "unknown";
    sourceCounts[key] = (sourceCounts[key] || 0) + 1;
  });

  const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0];
  if (topSource && orders.length > 5) {
    const [source, count] = topSource;
    const sourceLabel = source === 'kiosk' ? 'In-Store Kiosk' : source === 'app' ? 'Mobile App' : source;
    insights.push({
      id: "top-source",
      type: "info",
      icon: Users,
      title: "Top Order Source",
      description: `Most orders are coming from the ${sourceLabel}.`,
      metric: `${((count / orders.length) * 100).toFixed(0)}% of orders`,
      priority: 5,
    });
  }

  // 4. Average order value insight
  if (orders.length >= 5) {
    insights.push({
      id: "avg-order",
      type: "info",
      icon: DollarSign,
      title: "Average Order Value",
      description: avgOrderValue > 35000 
        ? "Excellent volume per order! Your premium combos are performing well."
        : "Consider suggesting side dishes or drinks to increase average order value.",
      metric: formatPrice(avgOrderValue),
      trend: avgOrderValue > 35000 ? "up" : "neutral",
      priority: 6,
      actionable: avgOrderValue <= 35000 ? "Add cross-sell prompts" : undefined,
    });
  }

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

  // 6. Today's performance prediction - Weighted for Lunch/Dinner peaks
  // Current hour in Uganda (UTC+3)
  const ugandaHour = (now.getUTCHours() + 3) % 24;
  const remainingHours = 22 - ugandaHour; // Closing at 10 PM
  
  if (remainingHours > 0 && ugandaHour >= 8 && todayOrders.length > 0) {
    const hoursOpen = ugandaHour - 8;
    let hourlyRate = todayOrders.length / Math.max(hoursOpen, 1);
    
    // Weighted adjustment: If we haven't hit lunch (12-2pm) or dinner (6-8pm) peaks yet, 
    // the linear average might be too low.
    const hasHitLunch = ugandaHour > 14;
    const hasHitDinner = ugandaHour > 20;
    
    if (!hasHitLunch) hourlyRate *= 1.25; // Boost for upcoming lunch
    else if (!hasHitDinner && ugandaHour < 18) hourlyRate *= 1.15; // Boost for upcoming dinner
    
    const predictedTotal = Math.round(todayOrders.length + (hourlyRate * remainingHours));
    const avgOrderVal = todayRevenue / todayOrders.length;
    const predictedRevenue = predictedTotal * avgOrderVal;
    
    insights.push({
      id: "daily-prediction",
      type: "prediction",
      icon: Lightbulb,
      title: "Today's Projection",
      description: `Based on current velocity, we expect ~${predictedTotal} orders by close.`,
      metric: formatPrice(predictedRevenue),
      priority: 10,
    });
  }

  // 7. Preparation time analysis
  const prepStats = getAvgPrepTime(orders);
  if (prepStats.avg > 0) {
    const avgMins = Math.round(prepStats.avg);
    if (avgMins <= 15) {
      insights.push({
        id: "prep-time-good",
        type: "success",
        icon: ChefHat,
        title: "Optimal Kitchen Speed",
        description: "Kitchen is operating at peak efficiency. Customer wait times are minimal.",
        metric: `${avgMins}m avg`,
        trend: "up",
        priority: 6,
      });
    } else if (avgMins >= 25) {
      insights.push({
        id: "prep-time-slow",
        type: "warning",
        icon: Clock,
        title: "Prep Time Alert",
        description: "Wait times are climbing. Consider streamlining the assembly line.",
        metric: `${avgMins}m avg`,
        trend: "down",
        priority: 9,
        actionable: "Audit prep workflow",
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
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center border border-primary/10">
          <Sparkles className="w-5 h-5 text-secondary" />
        </div>
        <div>
          <h3 className="font-black text-primary uppercase tracking-tight">AI Insights</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Business Intelligence</p>
        </div>
      </div>
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="p-4 bg-slate-50 rounded-full">
            <Zap className="w-8 h-8 text-slate-200" />
          </div>
          <p className="text-xs font-bold text-slate-400 text-center max-w-[200px]">
            More data needed to generate smart recommendations.
          </p>
        </div>
      </div>
    );
  }

  const typeConfig = {
    success: {
      bg: "bg-white",
      border: "border-slate-100",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
      metricColor: "text-emerald-600",
    },
    warning: {
      bg: "bg-white",
      border: "border-slate-100",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      metricColor: "text-amber-600",
    },
    info: {
      bg: "bg-white",
      border: "border-slate-100",
      iconBg: "bg-primary/5",
      iconColor: "text-primary",
      metricColor: "text-primary",
    },
    prediction: {
      bg: "bg-white",
      border: "border-slate-100",
      iconBg: "bg-secondary/5",
      iconColor: "text-secondary",
      metricColor: "text-secondary",
    },
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center border border-primary/10">
          <Sparkles className="w-5 h-5 text-secondary" />
        </div>
        <div>
          <h3 className="font-black text-primary uppercase tracking-tight">AI Insights</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Business Intelligence</p>
        </div>
      </div>

      <div className="space-y-4">
        {insights.slice(0, 5).map((insight, idx) => {
          const config = typeConfig[insight.type];
          const Icon = insight.icon;
          
          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={cn(
                "p-4 rounded-2xl border transition-all hover:border-secondary/20 hover:shadow-md group",
                config.bg,
                config.border
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                  config.iconBg
                )}>
                  <Icon className={cn("w-5 h-5", config.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-bold text-slate-900 text-sm leading-none">{insight.title}</h4>
                    {insight.metric && (
                      <span className={cn(
                        "text-xs font-black whitespace-nowrap flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg",
                        config.metricColor
                      )}>
                        {insight.metric}
                        {insight.trend === "up" && <TrendingUp className="w-3 h-3" />}
                        {insight.trend === "down" && <TrendingDown className="w-3 h-3" />}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal font-medium mb-2">{insight.description}</p>
                  {insight.actionable && (
                    <div className="flex items-center gap-2">
                       <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-secondary bg-secondary/5 px-2.5 py-1 rounded-lg border border-secondary/10 uppercase tracking-tight">
                        <Zap className="w-3 h-3 fill-secondary" />
                        {insight.actionable}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {insights.length > 5 && (
        <div className="mt-6 pt-4 border-t border-slate-50 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            +{insights.length - 5} additional perspectives
          </p>
        </div>
      )}
    </div>
  );
}
