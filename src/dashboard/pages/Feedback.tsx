import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Star,
  MessageSquare,
  Search,
  Filter,
  ChevronDown,
  Users,
  TrendingUp,
  Loader2,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";

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
  delay = 0,
}: {
  label: string;
  value: string;
  icon: typeof Star;
  subtitle?: string;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl border border-slate-100 p-4 md:p-5 shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between mb-2 md:mb-3 gap-2">
        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{label}</p>
        <div
          className={cn(
            "hidden md:flex w-10 h-10 rounded-xl items-center justify-center shrink-0 transition-colors",
            color
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl md:text-3xl font-black text-primary tracking-tighter">{value}</p>
      {subtitle && (
        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1 truncate">{subtitle}</p>
      )}
    </motion.div>
  );
}

/* ─── Main Feedback Page ─── */
export default function Feedback() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const navigate = useNavigate();

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
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-xl md:text-2xl font-black text-primary uppercase tracking-tight flex items-center gap-2">
          <MessageSquare className="w-6 h-6 md:w-7 md:h-7" />
          <span className="truncate">Feedback</span>
        </h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
          Service quality analysis
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
        <StatCard
          label="Rating"
          value={stats.avgRating.toFixed(1)}
          icon={Star}
          subtitle="Out of 5"
          color="bg-yellow-50 text-yellow-500"
          delay={0.1}
        />
        <StatCard
          label="Reviews"
          value={stats.total.toString()}
          icon={Users}
          subtitle="Total"
          color="bg-primary/5 text-primary"
          delay={0.2}
        />
        <StatCard
          label="Comments"
          value={stats.withComments.toString()}
          icon={TrendingUp}
          subtitle="With Text"
          color="bg-secondary/5 text-secondary"
          delay={0.3}
        />
      </div>

      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors" />
          <input
            type="text"
            placeholder="Search reviews..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary/10 outline-none transition-all shadow-sm"
          />
        </div>

        <div className="relative shrink-0">
          <Button
            variant="outline"
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="h-[46px] w-[46px] md:w-auto md:gap-2 rounded-2xl border-slate-100 p-0 md:px-5 font-bold text-slate-600 hover:text-primary hover:border-primary/20 transition-all bg-white shadow-sm flex items-center justify-center"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden md:inline">
              {filterRating !== null ? `${filterRating} Stars` : "All Ratings"}
            </span>
            <ChevronDown className={cn("hidden md:block w-3.5 h-3.5 transition-transform duration-300", showFilterDropdown && "rotate-180")} />
          </Button>

          <AnimatePresence>
            {showFilterDropdown && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 z-20 min-w-[180px] overflow-hidden"
              >
                <button
                  onClick={() => {
                    setFilterRating(null);
                    setShowFilterDropdown(false);
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-left hover:bg-slate-50 transition-colors",
                    filterRating === null ? "text-primary bg-primary/5" : "text-slate-400"
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
                      "w-full px-4 py-3 text-sm text-left hover:bg-slate-50 transition-colors flex items-center justify-between group",
                      filterRating === r && "bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                       <Stars value={r} size="xs" />
                       <span className={cn("text-xs font-bold", filterRating === r ? "text-primary" : "text-slate-600")}>{r} Stars</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-300 group-hover:text-slate-400 transition-colors">
                      {feedback.filter((f) => f.rating === r).length}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Feedback List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 3].map((i) => (
            <div key={i} className="bg-white rounded-[2rem] border border-slate-50 p-5 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-24 rounded" />
                    <Skeleton className="h-2.5 w-32 rounded" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16 rounded" />
              </div>
              <Skeleton className="h-10 w-full rounded-xl mb-4" />
              <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200"
        >
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <MessageSquare className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="text-lg font-black text-primary uppercase tracking-tight">No feedback found</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 max-w-[240px] mx-auto leading-relaxed">
            {searchTerm || filterRating !== null
              ? "Try adjusting your filters to find specific reviews"
              : "Feedback will appear here once customers start sharing their experience"}
          </p>
          {(searchTerm || filterRating !== null) && (
            <Button 
              variant="link" 
              onClick={() => { setSearchTerm(""); setFilterRating(null); }}
              className="mt-4 text-primary font-black uppercase tracking-widest text-[10px]"
            >
              Clear all filters
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                className="bg-white rounded-[2rem] border border-slate-100 p-4 md:p-6 shadow-sm transition-all"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-primary/5 flex items-center justify-center text-xs md:text-sm font-black text-primary border border-primary/10 shadow-inner shrink-0">
                        {entry.orders?.customer_name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-primary text-xs md:text-sm truncate uppercase tracking-tight leading-tight">
                          {entry.orders?.customer_name || "Guest Customer"}
                        </h4>
                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 md:gap-2 leading-none mt-1">
                           <span className="truncate">#{entry.orders?.order_number || "—"}</span>
                           <span className="w-1 h-1 rounded-full bg-slate-200 shrink-0" />
                           <span className="shrink-0">{timeAgo(entry.created_at)}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <Stars value={entry.rating} size="xs" />
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                        {entry.rating}.0 / 5.0
                      </span>
                    </div>
                  </div>

                  {entry.comment && (
                    <div className="relative pl-3">
                      <p className="text-xs md:text-sm text-slate-600 italic leading-relaxed">
                        "{entry.comment}"
                      </p>
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-secondary/20 rounded-full" />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-50 gap-2">
                    <div
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0",
                        entry.rating >= 4
                          ? "bg-green-500/10 text-green-700 border-green-500/20"
                          : entry.rating === 3
                            ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/20"
                            : "bg-red-500/10 text-red-700 border-red-500/20"
                      )}
                    >
                      <Star
                        className={cn(
                          "w-2.5 h-2.5",
                          entry.rating >= 4
                            ? "fill-green-500 text-green-500"
                            : entry.rating === 3
                              ? "fill-yellow-500 text-yellow-500"
                              : "fill-red-500 text-red-500"
                        )}
                      />
                      <span className="hidden xs:inline">
                        {entry.rating >= 4
                          ? "Positive"
                          : entry.rating === 3
                            ? "Neutral"
                            : "Action"}
                      </span>
                      <span className="xs:hidden">
                        {entry.rating >= 4 ? "Good" : entry.rating === 3 ? "OK" : "Alert"}
                      </span>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => entry.orders?.order_number && navigate(`/orders/${entry.orders.order_number}`)}
                      className="h-7 text-[9px] font-black tracking-widest uppercase text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full px-3 border border-transparent"
                    >
                      View Order <ChevronRight className="w-3 h-3 ml-0.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
