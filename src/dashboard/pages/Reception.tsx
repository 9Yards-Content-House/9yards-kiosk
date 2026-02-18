import { useState, useMemo, useCallback } from "react";
import { Search, Phone, MessageCircle, Check, Maximize2, Minimize2, Package, User, Clock, CreditCard, Banknote, Smartphone, ChevronRight } from "lucide-react";
import { useAllOrders } from "@shared/hooks/useOrders";
import { useOrderSubscription } from "../hooks/useOrderSubscription";
import type { Order } from "@shared/types/orders";
import { Input } from "@shared/components/ui/input";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@shared/components/ui/card";
import { formatPrice, cn, timeAgo, formatPaymentMethod } from "@shared/lib/utils";
import { formatPhoneDisplay } from "@shared/lib/validation";
import { supabase } from "@shared/lib/supabase";
import { toast } from "sonner";
import StatusBadge from "../components/StatusBadge";

const PaymentIcon = ({ method }: { method: string }) => {
  switch (method) {
    case "mobile_money": return <Smartphone className="w-3.5 h-3.5" />;
    case "cash": return <Banknote className="w-3.5 h-3.5" />;
    case "card": return <CreditCard className="w-3.5 h-3.5" />;
    default: return <CreditCard className="w-3.5 h-3.5" />;
  }
};

export default function Reception() {
  useOrderSubscription();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { data: allOrders = [], isLoading, refetch } = useAllOrders();

  // Filter orders that have arrived at reception
  const arrivedOrders = useMemo(() => {
    let orders = allOrders.filter((order) => order.status === "arrived" && !order.picked_up_at);

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      orders = orders.filter(
        (order) =>
          order.order_number.toLowerCase().includes(query) ||
          order.customer_name?.toLowerCase().includes(query) ||
          order.customer_phone?.includes(query)
      );
    }

    // Sort by arrival time (most recent first)
    return orders.sort(
      (a, b) =>
        new Date(b.delivered_at || b.updated_at).getTime() -
        new Date(a.delivered_at || a.updated_at).getTime()
    );
  }, [allOrders, searchQuery]);

  // Mark order as picked up
  const handleMarkPickedUp = useCallback(async (order: Order) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update order to mark as picked up
      const { error } = await supabase
        .from("orders")
        .update({
          status: "delivered",
          picked_up_at: new Date().toISOString(),
          picked_up_by: user?.id,
        })
        .eq("id", order.id);

      if (error) throw error;
      
      toast.success(`Order ${order.order_number} marked as picked up`);
      refetch();
    } catch (error) {
      console.error("Error marking order as picked up:", error);
      toast.error("Failed to mark order as picked up");
    }
  }, [refetch]);

  // Contact customer via phone
  const handleContactCustomer = useCallback((phone: string | null) => {
    if (!phone) {
      toast.error("No phone number on this order");
      return;
    }
    window.location.href = `tel:${phone}`;
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Check if order is waiting too long (> 15 minutes)
  const isWaitingLong = (order: Order) => {
    const arrivalTime = new Date(order.delivered_at || order.updated_at);
    const now = new Date();
    const diffMs = now.getTime() - arrivalTime.getTime();
    return diffMs > 15 * 60 * 1000; // 15 minutes
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-10 h-10 border-4 border-secondary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className={cn(
      "h-full flex flex-col",
      isFullscreen && "fixed inset-0 z-50 bg-background"
    )}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border-b bg-white">
        <div>
          <h1 className="text-2xl font-bold text-primary">Reception Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {arrivedOrders.length} order{arrivedOrders.length !== 1 ? "s" : ""} waiting for pickup
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search order # or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          
          {/* Fullscreen Toggle */}
          <Button variant="outline" size="icon" onClick={toggleFullscreen} className="flex-shrink-0">
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 p-4 overflow-y-auto bg-slate-50/50">
        {arrivedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Package className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">No orders waiting</p>
            <p className="text-sm">Orders will appear here when they arrive</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {arrivedOrders.map((order) => {
              const isUrgent = isWaitingLong(order);
              return (
              <div
                key={order.id}
                className={cn(
                  "bg-card rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col h-full",
                  isUrgent && "border-red-400 bg-red-50/30 dark:bg-red-900/10",
                  order.picked_up_at && "opacity-60"
                )}
              >
                {isUrgent && (
                  <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-bl-full md:w-3 md:h-3" title="Urgent: Over 15 mins" />
                )}
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-bold tracking-tight">{order.order_number}</p>
                    {isUrgent && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Overdue</Badge>}
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div className="space-y-2 text-sm flex-1">
                  {/* Customer Info Row */}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-4 h-4 shrink-0" />
                    <span className="font-medium text-foreground truncate">{order.customer_name}</span>
                  </div>

                  {/* Phone Row */}
                  {order.customer_phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4 shrink-0" />
                      <span className="font-mono">{formatPhoneDisplay(order.customer_phone)}</span>
                    </div>
                  )}

                  {/* Items count and Price Row */}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="w-4 h-4 shrink-0" />
                    <span>{order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} items • {formatPrice(order.total)}</span>
                  </div>

                  {/* Time Row */}
                  <div className={cn("flex items-center gap-2 text-muted-foreground transition-colors", isUrgent && "text-red-600 font-medium")}>
                    <Clock className="w-4 h-4 shrink-0" />
                    {timeAgo(order.delivered_at || order.updated_at)}
                  </div>

                  {/* Items Summary (Smaller) */}
                  <div className="mt-3 bg-slate-50/80 dark:bg-slate-900/40 rounded-lg p-2.5 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Items Summary</p>
                    <div className="space-y-1 max-h-[80px] overflow-y-auto thin-scrollbar">
                      {order.items?.map((item, idx) => {
                        const hasMainDish = item.main_dishes && item.main_dishes.length > 0;
                        let mainTitle = "Item";
                        if (hasMainDish) mainTitle = item.main_dishes.join(" + ");
                        else if (item.sauce_name) mainTitle = item.sauce_name;
                        else if (item.side_dish) mainTitle = item.side_dish;

                        return (
                          <div key={idx} className="text-xs flex items-start gap-2">
                            <span className="font-bold text-foreground opacity-70">{item.quantity}x</span>
                            <span className="text-slate-600 dark:text-slate-400 leading-tight line-clamp-1">{mainTitle}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Special Instructions */}
                  {order.special_instructions && (
                    <div className="mt-2 text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-2.5 py-2 rounded-lg flex items-start gap-2 border border-yellow-100 dark:border-yellow-900/30 italic">
                      “{order.special_instructions}”
                    </div>
                  )}
                </div>

                {/* Footer / Payment Info */}
                <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5" title={formatPaymentMethod(order.payment_method)}>
                    <PaymentIcon method={order.payment_method} />
                    <span className="capitalize">{formatPaymentMethod(order.payment_method)}</span>
                  </div>
                  <span className="capitalize font-medium">{order.payment_status}</span>
                </div>
                
                {/* Action Buttons */}
                <div className="mt-4 flex flex-col gap-2">
                  {!order.picked_up_at ? (
                    <>
                      <button
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-bold bg-secondary text-white rounded-xl hover:bg-secondary/90 active:scale-[0.98] transition-all shadow-sm"
                        onClick={() => handleMarkPickedUp(order)}
                      >
                        <Check className="w-4 h-4" />
                        Mark Picked Up
                      </button>
                      
                      <button
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-xl active:scale-[0.98] transition-all"
                        onClick={() => handleContactCustomer(order.customer_phone)}
                      >
                        <Phone className="w-4 h-4" />
                        Call Customer
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-3 px-4 bg-muted text-muted-foreground rounded-xl text-sm font-medium">
                      <Check className="w-4 h-4" />
                      Completed Pickup
                    </div>
                  )}
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
}
