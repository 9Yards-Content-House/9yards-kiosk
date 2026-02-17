import { useState, useCallback, useMemo } from "react";
import { CheckCircle2, XCircle, ClipboardList, ChefHat, Truck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Badge } from "@shared/components/ui/badge";
import {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
} from "@shared/types/orders";
import type { Order, OrderStatus } from "@shared/types/orders";
import { useUpdateOrderStatus, getMockOrdersStore } from "@shared/hooks/useOrders";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { toast } from "sonner";
import OrderCard from "./OrderCard";
import { AssignRiderModal } from "./AssignRiderModal";

interface OrderBoardProps {
  grouped: Record<OrderStatus, Order[]>;
  onStatusChange?: () => void;
}

// Active workflow statuses
const WORKFLOW_STATUSES: OrderStatus[] = ["new", "preparing", "out_for_delivery"];

// Time limit for completed/cancelled orders to remain visible (2 hours)
const COMPLETED_ORDER_VISIBILITY_MS = 2 * 60 * 60 * 1000;

export default function OrderBoard({ grouped, onStatusChange }: OrderBoardProps) {
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<OrderStatus | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState<Order | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const updateStatus = useUpdateOrderStatus();

  // Filter completed orders to only show recent ones
  const recentCompletedOrders = useMemo(() => {
    const now = Date.now();
    const arrived = grouped.arrived || [];
    const cancelled = grouped.cancelled || [];
    
    const recentArrived = arrived.filter(order => {
      const orderTime = new Date(order.updated_at || order.created_at).getTime();
      return now - orderTime < COMPLETED_ORDER_VISIBILITY_MS;
    });
    
    const recentCancelled = cancelled.filter(order => {
      const orderTime = new Date(order.updated_at || order.created_at).getTime();
      return now - orderTime < COMPLETED_ORDER_VISIBILITY_MS;
    });
    
    return [...recentArrived, ...recentCancelled].sort((a, b) => 
      new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    );
  }, [grouped.arrived, grouped.cancelled]);

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const orderId = e.currentTarget.dataset.orderId;
    if (orderId) {
      setDraggedOrderId(orderId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", orderId);
      // Add a slight delay to allow the drag image to be captured
      setTimeout(() => {
        e.currentTarget.style.opacity = "0.5";
      }, 0);
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = "1";
    setDraggedOrderId(null);
    setDragOverStatus(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, status: OrderStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverStatus(null);
  }, []);

  // Handler for rider assignment
  const handleAssignRider = useCallback(
    async (orderId: string, riderId: string) => {
      setIsAssigning(true);
      try {
        if (USE_MOCK_DATA) {
          const mockOrders = getMockOrdersStore();
          const mockOrder = mockOrders.find(o => o.id === orderId);
          if (mockOrder) {
            mockOrder.status = 'out_for_delivery';
            mockOrder.rider_id = riderId;
            mockOrder.assigned_at = new Date().toISOString();
            mockOrder.ready_at = new Date().toISOString();
            mockOrder.updated_at = new Date().toISOString();
          }
          toast.success("Rider assigned! Order is out for delivery.");
          onStatusChange?.();
          setAssignModalOpen(false);
          setOrderToAssign(null);
          return;
        }

        const { error } = await supabase
          .from('orders')
          .update({
            status: 'out_for_delivery',
            rider_id: riderId,
            assigned_at: new Date().toISOString(),
            ready_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        if (error) throw error;
        toast.success("Rider assigned! Order is out for delivery.");
        onStatusChange?.();
        setAssignModalOpen(false);
        setOrderToAssign(null);
      } catch (err) {
        console.error('Error assigning rider:', err);
        toast.error("Failed to assign rider");
      } finally {
        setIsAssigning(false);
      }
    },
    [onStatusChange]
  );

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, targetStatus: OrderStatus) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData("text/plain");
    setDragOverStatus(null);
    setDraggedOrderId(null);

    if (!orderId) return;

    // Find the order across all groups
    let order: Order | undefined;
    for (const status of WORKFLOW_STATUSES) {
      order = grouped[status]?.find(o => o.id === orderId);
      if (order) break;
    }

    if (!order) return;

    // Don't do anything if dropping on same status
    if (order.status === targetStatus) return;

    // Validate status transition (only allow moving forward or to adjacent columns)
    const currentIdx = ORDER_STATUS_FLOW.indexOf(order.status);
    const targetIdx = ORDER_STATUS_FLOW.indexOf(targetStatus);
    
    // Allow moving forward in the flow
    if (targetIdx > currentIdx) {
      // If moving to out_for_delivery, show rider assignment modal
      if (targetStatus === "out_for_delivery") {
        setOrderToAssign(order);
        setAssignModalOpen(true);
        return;
      }

      try {
        await updateStatus.mutateAsync({
          orderId: order.id,
          status: targetStatus,
        });
        toast.success(`Order moved to ${ORDER_STATUS_LABELS[targetStatus]}`);
        onStatusChange?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update order status";
        toast.error(message);
      }
    } else {
      toast.error("Orders can only move forward in the workflow");
    }
  }, [grouped, updateStatus, onStatusChange]);

  const getEmptyStateIcon = (status: OrderStatus) => {
    switch (status) {
      case "new": return <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-20" />;
      case "preparing": return <ChefHat className="w-10 h-10 mx-auto mb-2 opacity-20" />;
      case "out_for_delivery": return <Truck className="w-10 h-10 mx-auto mb-2 opacity-20" />;
      default: return <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-20" />;
    }
  };

  return (
    <>
      {/* Mobile View: Tabs */}
      <div className="md:hidden">
        <Tabs defaultValue="new" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-4 h-auto bg-muted/50 p-1 gap-1">
            {WORKFLOW_STATUSES.map((status) => (
              <TabsTrigger 
                key={status} 
                value={status} 
                className="relative text-[10px] xs:text-xs px-0 py-2 h-auto data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <div className="flex flex-col items-center gap-1">
                  <span>
                    {status === 'out_for_delivery' ? 'Delivery' : ORDER_STATUS_LABELS[status]}
                  </span>
                  {grouped[status]?.length > 0 && (
                    <Badge 
                      variant={status === 'new' ? "destructive" : "secondary"} 
                      className="h-4 px-1.5 min-w-[16px] text-[10px] justify-center"
                    >
                      {grouped[status].length}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
            ))}
            <TabsTrigger value="completed" className="relative text-[10px] xs:text-xs px-0 py-2 h-auto data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <div className="flex flex-col items-center gap-1">
                <span>Done</span>
                {recentCompletedOrders.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1.5 min-w-[16px] text-[10px] justify-center">
                    {recentCompletedOrders.length}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
          </TabsList>

          {WORKFLOW_STATUSES.map((status) => (
            <TabsContent key={status} value={status} className="mt-0">
              <div 
                className="kanban-column-content space-y-3 min-h-[50vh] pb-24"
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                {grouped[status]?.map((order) => (
                  <div key={order.id} className="relative">
                     <OrderCard
                        order={order}
                        isNew={status === "new"}
                        onAdvance={(order, nextStatus) => {
                          if (nextStatus === "out_for_delivery") {
                            setOrderToAssign(order);
                            setAssignModalOpen(true);
                          } else {
                            updateStatus.mutate({
                              orderId: order.id,
                              status: nextStatus,
                            });
                            toast.success(`Order moved to ${ORDER_STATUS_LABELS[nextStatus]}`);
                            onStatusChange?.();
                          }
                        }}
                      />
                  </div>
                ))}
                {(!grouped[status] || grouped[status].length === 0) && (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                    {getEmptyStateIcon(status)}
                    No {ORDER_STATUS_LABELS[status].toLowerCase()} orders
                  </div>
                )}
              </div>
            </TabsContent>
          ))}

          <TabsContent value="completed" className="mt-0">
            <div className="space-y-3 pb-24 min-h-[50vh]">
              {recentCompletedOrders.map((order) => (
                <div key={order.id} className="relative opacity-75">
                   <div className={`absolute -top-1 -right-1 z-10 w-5 h-5 rounded-full flex items-center justify-center ${
                      order.status === "arrived" ? "bg-green-500" : "bg-red-500"
                    }`}>
                      {order.status === "arrived" 
                        ? <CheckCircle2 className="w-3 h-3 text-white" />
                        : <XCircle className="w-3 h-3 text-white" />
                      }
                    </div>
                    <OrderCard order={order} isNew={false} />
                </div>
              ))}
              {recentCompletedOrders.length === 0 && (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  No recent completed orders
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop/Tablet View: Kanban Grid */}
      <div className="hidden md:grid kanban-board">
        {/* Active workflow columns */}
        {WORKFLOW_STATUSES.map((status) => (
          <div 
            key={status} 
            className="kanban-column"
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="flex items-center gap-2 mb-3 px-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  status === "new"
                    ? "bg-blue-500"
                    : status === "preparing"
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
              />
              <h3 className="font-semibold">{ORDER_STATUS_LABELS[status]}</h3>
              <span className="text-sm text-muted-foreground ml-auto">
                {grouped[status]?.length || 0}
              </span>
            </div>

            <div 
              className={`kanban-column-content space-y-3 min-h-[200px] rounded-xl p-2 transition-colors duration-200 ${
                dragOverStatus === status 
                  ? "bg-primary/5 border-2 border-dashed border-primary ring-1 ring-primary/20" 
                  : "border-2 border-transparent bg-muted/20"
              }`}
            >
              {grouped[status]?.map((order) => (
                <div
                  key={order.id}
                  draggable
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  data-order-id={order.id}
                  className={`${draggedOrderId === order.id ? "opacity-50 grayscale" : ""}`}
                >
                  <OrderCard
                    order={order}
                    isNew={status === "new"}
                    onAdvance={(order, nextStatus) => {
                      if (nextStatus === "out_for_delivery") {
                        setOrderToAssign(order);
                        setAssignModalOpen(true);
                      } else {
                        updateStatus.mutate({
                          orderId: order.id,
                          status: nextStatus,
                        });
                        toast.success(`Order moved to ${ORDER_STATUS_LABELS[nextStatus]}`);
                        onStatusChange?.();
                      }
                    }}
                  />
                </div>
              ))}
              {(!grouped[status] || grouped[status].length === 0) && (
                <div className={`text-center py-12 text-sm text-muted-foreground rounded-xl flex flex-col items-center justify-center ${
                  dragOverStatus === status ? "opacity-50" : ""
                }`}>
                  {getEmptyStateIcon(status)}
                  {dragOverStatus === status ? "Drop here" : "No orders"}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Completed/Cancelled column - shows recent orders only (last 2 hours) */}
        <div className="kanban-column">
          <div className="flex items-center gap-2 mb-3 px-2">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <h3 className="font-semibold">Completed</h3>
            <span className="text-sm text-muted-foreground ml-auto">
              {recentCompletedOrders.length}
            </span>
          </div>

          <div className="kanban-column-content space-y-3 min-h-[200px] rounded-xl p-2 border-2 border-transparent bg-muted/10">
            {recentCompletedOrders.map((order) => (
              <div key={order.id} className="relative">
                {/* Status indicator overlay */}
                <div className={`absolute -top-1 -right-1 z-10 w-5 h-5 rounded-full flex items-center justify-center ${
                  order.status === "arrived" ? "bg-green-500" : "bg-red-500"
                }`}>
                  {order.status === "arrived" 
                    ? <CheckCircle2 className="w-3 h-3 text-white" />
                    : <XCircle className="w-3 h-3 text-white" />
                  }
                </div>
                <OrderCard order={order} isNew={false} />
              </div>
            ))}
            {recentCompletedOrders.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground rounded-xl">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                No recent orders
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rider Assignment Modal */}
      <AssignRiderModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        order={orderToAssign}
        onAssign={handleAssignRider}
        isAssigning={isAssigning}
      />
    </>
  );
}
