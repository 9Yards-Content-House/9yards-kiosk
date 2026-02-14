import { useState, useMemo, useCallback } from "react";
import { Search, Phone, MessageCircle, Check, Maximize2, Minimize2, Package, User } from "lucide-react";
import { useAllOrders } from "@shared/hooks/useOrders";
import { useOrderSubscription } from "../hooks/useOrderSubscription";
import type { Order } from "@shared/types/orders";
import { Input } from "@shared/components/ui/input";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@shared/components/ui/card";
import { formatPrice, cn } from "@shared/lib/utils";
import { supabase } from "@shared/lib/supabase";
import { toast } from "sonner";

export default function Reception() {
  useOrderSubscription();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { data: allOrders = [], isLoading, refetch } = useAllOrders();

  // Filter orders that have arrived at reception
  const arrivedOrders = useMemo(() => {
    let orders = allOrders.filter((order) => order.status === "arrived");

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

  // Send arrival WhatsApp notification
  const handleSendArrivalNotification = useCallback(async (order: Order) => {
    if (!order.customer_phone) {
      toast.error("No phone number on this order");
      return;
    }

    try {
      const response = await supabase.functions.invoke("send-whatsapp", {
        body: {
          to: order.customer_phone,
          orderNumber: order.order_number,
          customerName: order.customer_name,
          type: "arrival",
          message: `Hi ${order.customer_name}, your order #${order.order_number} has arrived at reception! Please pick it up.`,
        },
      });

      if (response.error) throw response.error;
      toast.success("Arrival notification sent!");
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Failed to send notification");
    }
  }, []);

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

  // Format time since arrival
  const getTimeSinceArrival = (order: Order) => {
    const arrivalTime = new Date(order.delivered_at || order.updated_at);
    const now = new Date();
    const diffMs = now.getTime() - arrivalTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

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
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div>
          <h1 className="text-2xl font-bold text-[#212282]">Reception Dashboard</h1>
          <p className="text-gray-500 text-sm">
            {arrivedOrders.length} order{arrivedOrders.length !== 1 ? "s" : ""} waiting for pickup
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search order # or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Fullscreen Toggle */}
          <Button variant="outline" size="icon" onClick={toggleFullscreen}>
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        {arrivedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Package className="w-16 h-16 mb-4" />
            <p className="text-lg">No orders waiting for pickup</p>
            <p className="text-sm">Orders will appear here when they arrive</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {arrivedOrders.map((order) => (
              <Card
                key={order.id}
                className={cn(
                  "border-2 transition-all hover:shadow-lg",
                  isWaitingLong(order)
                    ? "border-red-300 bg-red-50"
                    : order.picked_up_at
                    ? "border-gray-200 bg-gray-50 opacity-60"
                    : "border-green-300 bg-green-50"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle
                      className={cn(
                        "text-3xl font-bold",
                        isWaitingLong(order) ? "text-red-600" : "text-green-700"
                      )}
                    >
                      #{order.order_number}
                    </CardTitle>
                    <Badge
                      className={cn(
                        "bg-green-100 text-green-800",
                        "text-xs"
                      )}
                    >
                      {getTimeSinceArrival(order)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {/* Customer Info */}
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{order.customer_name}</span>
                  </div>
                  
                  {order.customer_phone && (
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Phone className="w-4 h-4" />
                      <span>{order.customer_phone}</span>
                    </div>
                  )}

                  {/* Order Total */}
                  <div className="text-lg font-bold text-[#E6411C]">
                    {formatPrice(order.total)}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 pt-2">
                    {!order.picked_up_at ? (
                      <>
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() => handleMarkPickedUp(order)}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Mark as Picked Up
                        </Button>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleContactCustomer(order.customer_phone)}
                          >
                            <Phone className="w-4 h-4 mr-1" />
                            Call
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleSendArrivalNotification(order)}
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            WhatsApp
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Badge variant="secondary" className="justify-center py-2">
                        <Check className="w-4 h-4 mr-1" />
                        Picked Up
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
