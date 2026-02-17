import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Star,
  MessageSquare,
  Search,
  Filter,
  ChevronDown,
  Users,
  TrendingUp,
} from "lucide-react";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";

/* ─── Types ─── */
interface FeedbackEntry {
  id: string;
  order_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  orders?: {
    order_number: string;
    customer_name: string;
  };
}

/* ─── Mock Data ─── */
const MOCK_FEEDBACK: FeedbackEntry[] = [
  {
    id: "1",
    order_id: "o1",
    rating: 5,
    comment: "Amazing food! Loved the Rolex combo.",
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    orders: { order_number: "286459", customer_name: "Senoga" },
  },
  {
    id: "2",
    order_id: "o2",
    rating: 4,
    comment: "Good but delivery was a bit slow.",
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    orders: { order_number: "173820", customer_name: "Nakato Sarah" },
  },
  {
    id: "3",
    order_id: "o3",
    rating: 3,
    comment: null,
    created_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    orders: { order_number: "492017", customer_name: "David Ochieng" },
  },
  {
    id: "4",
    order_id: "o4",
    rating: 5,
    comment: "Best chicken combo in Kampala! 🔥",
    created_at: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    orders: { order_number: "831456", customer_name: "Aisha Kirabo" },
  },
  {
    id: "5",
    order_id: "o5",
    rating: 2,
    comment: "Food was cold when it arrived.",
    created_at: new Date(Date.now() - 1000 * 60 * 900).toISOString(),
    orders: { order_number: "657293", customer_name: "Brian Mugisha" },
  },
  {
    id: "6",
    order_id: "o6",
    rating: 4,
    comment: "Food was great but the order took a while.",
    created_at: new Date(Date.now() - 1000 * 60 * 1200).toISOString(),
    orders: { order_number: "394821", customer_name: "Grace Nambi" },
  },
];

/* ─── Star Display (Read-Only) ─── */
function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "xs" }) {
  const iconSize = size === "sm" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            iconSize,
            star <= value
              ? "fill-yellow-400 text-yellow-400"
              : "fill-gray-200 text-gray-200"
          )}
        />
      ))}
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({
  label,
  value,
  icon: Icon,
  subtitle,
  color,
}: {
  label: string;
  value: string;
  icon: typeof Star;
  subtitle?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            color
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

/* ─── Main Feedback Page ─── */
export default function Feedback() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Fetch feedback
  const { data: feedback = [], isLoading } = useQuery<FeedbackEntry[]>({
    queryKey: ["admin-feedback"],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        return MOCK_FEEDBACK;
      }

      const { data, error } = await supabase
        .from("order_feedback")
        .select(
          `
          *,
          orders(order_number, customer_name)
        `
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as FeedbackEntry[];
    },
    refetchInterval: 30000,
  });

  const stats = useMemo(() => {
    if (feedback.length === 0)
      return { avgRating: 0, total: 0, withComments: 0 };

    const avgRating =
      feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;
    const withComments = feedback.filter((f) => f.comment).length;

    return {
      avgRating: Math.round(avgRating * 10) / 10,
      total: feedback.length,
      withComments,
    };
  }, [feedback]);

  // Filtered feedback
  const filtered = useMemo(() => {
    let result = [...feedback];
    if (filterRating !== null) {
      result = result.filter((f) => f.rating === filterRating);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (f) =>
          f.orders?.order_number?.toLowerCase().includes(term) ||
          f.orders?.customer_name?.toLowerCase().includes(term) ||
          f.comment?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [feedback, filterRating, searchTerm]);

  // Time ago helper
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-7 h-7 text-[#212282]" />
          Customer Feedback
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          View and analyze customer feedback from orders
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Average Rating"
          value={stats.avgRating.toFixed(1)}
          icon={Star}
          subtitle={`out of 5 stars`}
          color="bg-yellow-50 text-yellow-600"
        />
        <StatCard
          label="Total Reviews"
          value={stats.total.toString()}
          icon={Users}
          subtitle="all time"
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="With Comments"
          value={stats.withComments.toString()}
          icon={TrendingUp}
          subtitle={`out of ${stats.total} reviews`}
          color="bg-green-50 text-green-600"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order #, customer, or comment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#212282] focus:ring-2 focus:ring-[#212282]/20 outline-none transition-all"
          />
        </div>

        {/* Rating Filter */}
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="gap-2 rounded-xl h-[42px] border-gray-200"
          >
            <Filter className="w-4 h-4" />
            {filterRating !== null ? `${filterRating} Stars` : "All Ratings"}
            <ChevronDown className="w-3 h-3" />
          </Button>
          {showFilterDropdown && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10 min-w-[140px]">
              <button
                onClick={() => {
                  setFilterRating(null);
                  setShowFilterDropdown(false);
                }}
                className={cn(
                  "w-full px-4 py-2 text-sm text-left hover:bg-gray-50 transition-colors",
                  filterRating === null && "bg-gray-50 font-medium"
                )}
              >
                All Ratings
              </button>
              {[5, 4, 3, 2, 1].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setFilterRating(r);
                    setShowFilterDropdown(false);
                  }}
                  className={cn(
                    "w-full px-4 py-2 text-sm text-left hover:bg-gray-50 transition-colors flex items-center gap-2",
                    filterRating === r && "bg-gray-50 font-medium"
                  )}
                >
                  <Stars value={r} size="xs" />
                  <span className="text-gray-400 text-xs">
                    ({feedback.filter((f) => f.rating === r).length})
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Feedback List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-[#212282] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No feedback found</p>
          <p className="text-gray-400 text-sm mt-1">
            {searchTerm || filterRating !== null
              ? "Try adjusting your filters"
              : "Feedback will appear here when customers leave reviews"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                {/* Left: Customer info + rating */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-[#212282]/10 flex items-center justify-center text-sm font-bold text-[#212282] flex-shrink-0">
                      {entry.orders?.customer_name?.charAt(0) || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {entry.orders?.customer_name || "Customer"}
                      </p>
                      <p className="text-xs text-gray-400">
                        Order #{entry.orders?.order_number || "—"} ·{" "}
                        {timeAgo(entry.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                      <Stars value={entry.rating} />
                      <span className="text-xs font-medium text-gray-600">
                        {entry.rating}/5
                      </span>
                    </div>

                  {/* Comment */}
                  {entry.comment && (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 mt-2">
                      "{entry.comment}"
                    </p>
                  )}
                </div>

                {/* Right: Rating badge */}
                <div
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0",
                    entry.rating >= 4
                      ? "bg-green-50 text-green-700"
                      : entry.rating === 3
                        ? "bg-yellow-50 text-yellow-700"
                        : "bg-red-50 text-red-700"
                  )}
                >
                  <Star
                    className={cn(
                      "w-3.5 h-3.5",
                      entry.rating >= 4
                        ? "fill-green-500 text-green-500"
                        : entry.rating === 3
                          ? "fill-yellow-500 text-yellow-500"
                          : "fill-red-500 text-red-500"
                    )}
                  />
                  {entry.rating >= 4
                    ? "Positive"
                    : entry.rating === 3
                      ? "Neutral"
                      : "Needs Attention"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
