import { useState, useCallback } from "react";
import {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "@shared/types/orders";
import type { Order, OrderStatus } from "@shared/types/orders";
import { useUpdateOrderStatus } from "@shared/hooks/useOrders";
import { toast } from "sonner";
import OrderCard from "./OrderCard";

interface OrderBoardProps {
  grouped: Record<OrderStatus, Order[]>;
}

const DISPLAY_STATUSES: OrderStatus[] = ["new", "preparing", "ready", "delivered"];

export default function OrderBoard({ grouped }: OrderBoardProps) {
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<OrderStatus | null>(null);
  const updateStatus = useUpdateOrderStatus();

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

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, targetStatus: OrderStatus) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData("text/plain");
    setDragOverStatus(null);
    setDraggedOrderId(null);

    if (!orderId) return;

    // Find the order across all groups
    let order: Order | undefined;
    for (const status of DISPLAY_STATUSES) {
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
      try {
        await updateStatus.mutateAsync({
          orderId: order.id,
          status: targetStatus,
        });
        toast.success(`Order moved to ${ORDER_STATUS_LABELS[targetStatus]}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update order status";
        toast.error(message);
      }
    } else {
      toast.error("Orders can only move forward in the workflow");
    }
  }, [grouped, updateStatus]);

  return (
    <div className="kanban-board">
      {DISPLAY_STATUSES.map((status) => (
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
                  : status === "ready"
                  ? "bg-green-500"
                  : "bg-gray-400"
              }`}
            />
            <h3 className="font-semibold">{ORDER_STATUS_LABELS[status]}</h3>
            <span className="text-sm text-muted-foreground ml-auto">
              {grouped[status]?.length || 0}
            </span>
          </div>

          <div 
            className={`kanban-column-content space-y-3 min-h-[200px] rounded-xl p-2 transition-colors ${
              dragOverStatus === status 
                ? "bg-secondary/10 border-2 border-dashed border-secondary" 
                : "border-2 border-transparent"
            }`}
          >
            {grouped[status]?.map((order) => (
              <div
                key={order.id}
                draggable={order.status !== "delivered" && order.status !== "cancelled"}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                data-order-id={order.id}
                className={`${draggedOrderId === order.id ? "opacity-50" : ""}`}
              >
                <OrderCard
                  order={order}
                  isNew={status === "new"}
                />
              </div>
            ))}
            {(!grouped[status] || grouped[status].length === 0) && (
              <div className={`text-center py-8 text-sm text-muted-foreground rounded-xl border border-dashed ${
                dragOverStatus === status ? "border-secondary bg-secondary/5" : ""
              }`}>
                {dragOverStatus === status ? "Drop here" : "No orders"}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
