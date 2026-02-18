import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy, TrendingUp, Clock, Award, Calendar } from "lucide-react";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@shared/components/ui/card";
import { cn } from "@shared/lib/utils";
import { Badge } from "@shared/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@shared/components/ui/tabs";

interface StaffPerformance {
  user_id: string;
  staff_name: string;
  total_orders: number;
  average_prep_time_seconds: number;
  orders_today: number;
  last_activity: string;
}

// Mock data for development
const mockStaffData: StaffPerformance[] = [
  {
    user_id: "staff-1",
    staff_name: "John Doe",
    total_orders: 156,
    average_prep_time_seconds: 720,
    orders_today: 12,
    last_activity: new Date().toISOString(),
  },
  {
    user_id: "staff-2",
    staff_name: "Jane Smith",
    total_orders: 203,
    average_prep_time_seconds: 540,
    orders_today: 18,
    last_activity: new Date().toISOString(),
  },
  {
    user_id: "staff-3",
    staff_name: "Mike Johnson",
    total_orders: 89,
    average_prep_time_seconds: 900,
    orders_today: 8,
    last_activity: new Date(Date.now() - 3600000).toISOString(),
  },
];

type PerformancePeriod = "today" | "weekly" | "monthly";

function useStaffPerformance(period: PerformancePeriod = "today") {
  const queryClient = useQueryClient();

  // Real-time subscription
  useEffect(() => {
    if (USE_MOCK_DATA) return;

    const channel = supabase
      .channel('staff-activity-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' }, // Listen to orders for activity updates
        () => {
          queryClient.invalidateQueries({ queryKey: ["staff-performance"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["staff-performance", period],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise((r) => setTimeout(r, 400));
        const multiplier = period === "today" ? 1 : period === "weekly" ? 7 : 30;
        return mockStaffData
          .map(s => ({
            ...s,
            orders_today: Math.floor(s.orders_today * multiplier),
            total_orders: s.total_orders + (multiplier * 5)
          }))
          .sort((a, b) => b.orders_today - a.orders_today);
      }

      const daysBack = period === "today" ? 1 : period === "weekly" ? 7 : 30;
      
      const { data, error } = await supabase
        .rpc('get_staff_leaderboard', { days_back: daysBack });

      if (error) throw error;

      // Map RPC results to StaffPerformance interface
      return (data || []).map((item: any) => ({
        user_id: item.user_id,
        staff_name: item.full_name,
        total_orders: item.orders_count + item.deliveries_count, // Total activity
        average_prep_time_seconds: 0, // Not provided by RPC yet
        orders_today: item.orders_count, // Display as primary metric
        last_activity: new Date().toISOString()
      })) as StaffPerformance[];
    },
    staleTime: 30000,
  });
}

function formatPrepTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes === 0) return `${secs}s`;
  if (secs === 0) return `${minutes}m`;
  return `${minutes}m ${secs}s`;
}

function getRankBadge(rank: number) {
  switch (rank) {
    case 1:
      return (
        <div className="flex flex-col items-center">
          <Trophy className="w-5 h-5 text-yellow-500 fill-yellow-200 animate-bounce transition-all duration-1000" />
          <span className="text-[10px] font-black text-yellow-600 uppercase tracking-tighter">Gold</span>
        </div>
      );
    case 2:
      return (
        <div className="flex flex-col items-center">
          <Award className="w-5 h-5 text-slate-400 fill-slate-100" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Silver</span>
        </div>
      );
    case 3:
      return (
        <div className="flex flex-col items-center">
          <Award className="w-5 h-5 text-amber-600 fill-amber-100" />
          <span className="text-[10px] font-black text-amber-700 uppercase tracking-tighter">Bronze</span>
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
          <span className="text-xs font-bold text-slate-500">#{rank}</span>
        </div>
      );
  }
}

function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function StaffPerformancePanel() {
  const [period, setPeriod] = useState<PerformancePeriod>("today");
  const { data: staff = [], isLoading, error } = useStaffPerformance(period);

  if (isLoading) {
    return (
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 pb-4">
          <div className="h-6 w-48 bg-slate-100 animate-pulse rounded-md" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-50">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 animate-pulse rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-slate-100 animate-pulse rounded-md" />
                  <div className="h-3 w-48 bg-slate-100 animate-pulse rounded-md" />
                </div>
                <div className="w-12 h-8 bg-slate-100 animate-pulse rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || staff.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">No activity recorded for this period</h3>
            <p className="text-sm text-muted-foreground max-w-[240px] mx-auto mt-1">
              Complete orders to see staff performance rankings here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as PerformancePeriod)} className="w-auto">
          <TabsList className="bg-slate-100 p-1 h-9 rounded-lg">
            <TabsTrigger value="today" className="text-xs h-7 rounded-md px-4">Today</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs h-7 rounded-md px-4">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs h-7 rounded-md px-4">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <Clock className="w-3 h-3" />
          Live Updates
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-[#212282]">
              <Trophy className="w-5 h-5 text-yellow-500 fill-yellow-100" />
              Performance Ranking
            </CardTitle>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {staff.slice(0, 10).map((person, index) => (
              <div
                key={person.user_id}
                className={cn(
                  "flex items-center gap-4 p-4 transition-all hover:bg-slate-50/80 group border-l-4",
                  index === 0 ? "border-yellow-400 bg-yellow-50/30" : 
                  index === 1 ? "border-slate-300 bg-slate-50/30" : 
                  index === 2 ? "border-amber-600 bg-amber-50/30" : 
                  "border-transparent"
                )}
              >
                {/* Rank */}
                <div className="w-12 flex justify-center">{getRankBadge(index + 1)}</div>

                {/* Avatar & Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm shrink-0 overflow-hidden border-2 border-white shadow-sm bg-gradient-to-br from-slate-100 to-slate-200">
                    {getInitials(person.staff_name)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">
                      {person.staff_name}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                        <TrendingUp className="w-3 h-3 text-slate-400" />
                        {person.total_orders} Total Orders
                      </span>
                      {person.average_prep_time_seconds > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatPrepTime(person.average_prep_time_seconds)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Today's count */}
                <div className="text-right">
                  <div className={cn(
                    "text-2xl font-black tabular-nums transition-colors",
                    index === 0 ? "text-yellow-600" : "text-[#212282]"
                  )}>
                    {person.orders_today}
                  </div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                    {period === "today" ? "Orders" : period === "weekly" ? "This Week" : "This Month"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <p className="text-[10px] text-center text-slate-400 font-medium px-4">
        Ranking is calculated based on total orders completed and efficiency during the selected period.
      </p>
    </div>
  );
}
