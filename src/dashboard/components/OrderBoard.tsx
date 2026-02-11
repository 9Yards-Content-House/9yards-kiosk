import {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "@shared/types/orders";
import type { Order, OrderStatus } from "@shared/types/orders";
import OrderCard from "./OrderCard";

interface OrderBoardProps {
  grouped: Record<OrderStatus, Order[]>;
}

const DISPLAY_STATUSES: OrderStatus[] = ["new", "preparing", "ready", "delivered"];

export default function OrderBoard({ grouped }: OrderBoardProps) {
  return (
    <div className="kanban-board">
      {DISPLAY_STATUSES.map((status) => (
        <div key={status} className="min-w-[280px]">
          <div className="flex items-center gap-2 mb-3">
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

          <div className="space-y-3">
            {grouped[status]?.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isNew={status === "new"}
              />
            ))}
            {(!grouped[status] || grouped[status].length === 0) && (
              <div className="text-center py-8 text-sm text-muted-foreground rounded-xl border border-dashed">
                No orders
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
