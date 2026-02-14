import { useState, useMemo } from "react";
import { Search, Filter, X, Printer, Download } from "lucide-react";
import { useTodaysOrders, useAllOrders } from "@shared/hooks/useOrders";
import { useOrderSubscription } from "../hooks/useOrderSubscription";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "@shared/types/orders";
import type { Order, OrderStatus } from "@shared/types/orders";
import OrderBoard from "../components/OrderBoard";
import NewOrderAlert from "../components/NewOrderAlert";
import { Input } from "@shared/components/ui/input";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { exportOrders, type OrderExport } from "@shared/lib/export";

type ViewMode = "board" | "list";
type TimeFilter = "today" | "week" | "all";

export default function Orders() {
  useOrderSubscription();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today");
  const [viewMode, setViewMode] = useState<ViewMode>("board");

  // Fetch orders based on time filter
  const { data: todaysOrders, isLoading: loadingToday } = useTodaysOrders();
  const { data: allOrders, isLoading: loadingAll } = useAllOrders();

  const isLoading = timeFilter === "today" ? loadingToday : loadingAll;

  // Get the right orders based on time filter
  const baseOrders = useMemo(() => {
    if (timeFilter === "today") return todaysOrders || [];
    if (timeFilter === "all") return allOrders || [];
    // Week filter - last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return (allOrders || []).filter(
      (o) => new Date(o.created_at) >= weekAgo
    );
  }, [timeFilter, todaysOrders, allOrders]);

  // Filter orders based on search and status
  const filteredOrders = useMemo(() => {
    let result = baseOrders;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (order) =>
          order.order_number.toLowerCase().includes(query) ||
          order.customer_name?.toLowerCase().includes(query) ||
          order.customer_phone?.includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((order) => order.status === statusFilter);
    }

    return result;
  }, [baseOrders, searchQuery, statusFilter]);

  // Group orders by status for board view
  const grouped: Record<OrderStatus, Order[]> = useMemo(() => {
    const groups: Record<OrderStatus, Order[]> = {
      new: [],
      preparing: [],
      out_for_delivery: [],
      arrived: [],
      cancelled: [],
    };

    filteredOrders.forEach((order) => {
      if (groups[order.status]) {
        groups[order.status].push(order);
      }
    });

    return groups;
  }, [filteredOrders]);

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTimeFilter("today");
  };

  const hasFilters = searchQuery || statusFilter !== "all" || timeFilter !== "today";

  // Export orders
  const handleExport = () => {
    const rows: OrderExport[] = filteredOrders.map((o) => ({
      order_number: o.order_number,
      customer_name: o.customer_name || "Unknown",
      customer_phone: o.customer_phone,
      status: ORDER_STATUS_LABELS[o.status],
      payment_method: o.payment_method.replace("_", " "),
      payment_status: o.payment_status,
      total: o.total,
      created_at: o.created_at,
      items_count: o.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
    }));
    exportOrders(rows);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-secondary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">
            {filteredOrders.length} orders{hasFilters && " (filtered)"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NewOrderAlert count={grouped.new.length} />
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search order # or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Time filter */}
        <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as OrderStatus | "all")}
        >
          <SelectTrigger className="w-[140px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {ORDER_STATUS_FLOW.map((status) => (
              <SelectItem key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active filters badges */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: "{searchQuery}"
              <button onClick={() => setSearchQuery("")}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {statusFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Status: {ORDER_STATUS_LABELS[statusFilter]}
              <button onClick={() => setStatusFilter("all")}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {timeFilter !== "today" && (
            <Badge variant="secondary" className="gap-1">
              Time: {timeFilter === "week" ? "This Week" : "All Time"}
              <button onClick={() => setTimeFilter("today")}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Order Board */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No orders found</p>
          {hasFilters && (
            <Button variant="link" onClick={clearFilters} className="mt-2">
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <OrderBoard grouped={grouped} />
      )}
    </div>
  );
}
