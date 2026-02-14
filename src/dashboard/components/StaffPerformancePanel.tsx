import { useQuery } from "@tanstack/react-query";
import { Trophy, TrendingUp, Clock, Award } from "lucide-react";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@shared/components/ui/card";
import { cn } from "@shared/lib/utils";

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

function useStaffPerformance() {
  return useQuery({
    queryKey: ["staff-performance"],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise((r) => setTimeout(r, 300));
        return mockStaffData.sort((a, b) => b.orders_today - a.orders_today);
      }

      const { data, error } = await supabase
        .from("staff_activity")
        .select("*")
        .order("orders_today", { ascending: false });

      if (error) throw error;
      return (data || []) as StaffPerformance[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
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
        <span className="inline-flex items-center gap-1 text-yellow-500">
          <Trophy className="w-4 h-4 fill-yellow-400" />
          <span className="text-xs font-bold">1st</span>
        </span>
      );
    case 2:
      return (
        <span className="inline-flex items-center gap-1 text-gray-400">
          <Award className="w-4 h-4" />
          <span className="text-xs font-bold">2nd</span>
        </span>
      );
    case 3:
      return (
        <span className="inline-flex items-center gap-1 text-amber-700">
          <Award className="w-4 h-4" />
          <span className="text-xs font-bold">3rd</span>
        </span>
      );
    default:
      return <span className="text-xs text-muted-foreground">#{rank}</span>;
  }
}

export default function StaffPerformancePanel() {
  const { data: staff = [], isLoading, error } = useStaffPerformance();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Staff Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || staff.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Staff Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-6">
            No staff activity recorded yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Staff Performance
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Today's leaderboard based on orders completed
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {staff.slice(0, 5).map((person, index) => (
            <div
              key={person.user_id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                index === 0 && "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10",
                index === 1 && "bg-gray-50 border-gray-200 dark:bg-gray-800/50",
                index === 2 && "bg-amber-50 border-amber-200 dark:bg-amber-900/10",
                index > 2 && "bg-muted/30"
              )}
            >
              {/* Rank */}
              <div className="w-10 text-center">{getRankBadge(index + 1)}</div>

              {/* Avatar & Name */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {person.staff_name}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {person.total_orders} total
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatPrepTime(person.average_prep_time_seconds)} avg
                  </span>
                </div>
              </div>

              {/* Today's count */}
              <div className="text-right">
                <div className="text-2xl font-bold text-[#212282]">
                  {person.orders_today}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">
                  Today
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
