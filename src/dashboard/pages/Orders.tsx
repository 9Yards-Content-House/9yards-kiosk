import { useTodaysOrders } from "@shared/hooks/useOrders";
import { useOrderSubscription } from "../hooks/useOrderSubscription";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "@shared/types/orders";
import type { Order, OrderStatus } from "@shared/types/orders";
import OrderBoard from "../components/OrderBoard";
import NewOrderAlert from "../components/NewOrderAlert";

export default function Orders() {
  useOrderSubscription();
  const { data: orders, isLoading } = useTodaysOrders();

  // Group orders by status
  const grouped: Record<OrderStatus, Order[]> = {
    new: [],
    preparing: [],
    ready: [],
    delivered: [],
    cancelled: [],
  };

  orders?.forEach((order) => {
    if (grouped[order.status]) {
      grouped[order.status].push(order);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-yards-orange border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">
            {orders?.length || 0} orders today
          </p>
        </div>
        <NewOrderAlert count={grouped.new.length} />
      </div>

      <OrderBoard grouped={grouped} />
    </div>
  );
}
