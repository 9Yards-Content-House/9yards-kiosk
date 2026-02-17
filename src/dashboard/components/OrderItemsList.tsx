import { formatPrice } from "@shared/lib/utils";
import { Order } from "@shared/types/orders";
import { AlertTriangle } from "lucide-react";

interface OrderItemsListProps {
  order: Order;
}

export default function OrderItemsList({ order }: OrderItemsListProps) {
  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 md:p-6 mb-6">
      <h3 className="font-semibold text-lg mb-4">Items</h3>
      <div className="divide-y">
        {order.items?.map((item) => {
          // Build a descriptive name for the item
          const itemName =
            item.type === "combo"
              ? item.sauce_name
                ? `${item.sauce_name} Lusaniya`
                : "Combo Meal"
              : item.sauce_name || "Item";

          return (
            <div
              key={item.id}
              className="flex justify-between py-4 last:pb-0"
            >
              <div className="space-y-1.5">
                <p className="font-medium text-base">
                  {itemName} <span className="text-muted-foreground text-sm ml-1">x{item.quantity}</span>
                </p>
                {item.main_dishes && item.main_dishes.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {item.main_dishes.join(", ")}
                  </p>
                )}
                {item.sauce_preparation && (
                  <p className="text-sm text-muted-foreground">
                    {item.sauce_preparation}
                    {item.sauce_size && ` — ${item.sauce_size}`}
                  </p>
                )}
                {item.side_dish && (
                  <p className="text-sm text-muted-foreground">
                    Side: {item.side_dish}
                  </p>
                )}
              </div>
              <span className="font-semibold whitespace-nowrap ml-4 text-base">
                {formatPrice(item.total_price)}
              </span>
            </div>
          );
        })}
      </div>

      {order.special_instructions && (
        <div className="mt-4 pt-4 border-t">
            <div className="bg-yellow-50 dark:bg-yellow-900/10 text-yellow-800 dark:text-yellow-300 px-3 py-2 rounded-md text-sm border border-yellow-100 dark:border-yellow-900/30 flex gap-2 items-start">
               <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
               <div className="space-y-0.5">
                   <p className="font-medium">Special Instructions</p>
                   <p>{order.special_instructions}</p>
               </div>
            </div>
        </div>
      )}

      <div className="flex justify-between items-center py-4 mt-2 font-bold text-xl border-t">
        <span>Total Amount</span>
        <span className="text-secondary text-2xl">{formatPrice(order.total)}</span>
      </div>
    </div>
  );
}
