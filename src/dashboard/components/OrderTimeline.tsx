import { Clock, ChefHat, Package, Truck } from "lucide-react";
import type { Order } from "@shared/types/orders";

interface OrderTimelineProps {
  order: Order;
}

const steps = [
  { status: "new", label: "Order Placed", icon: Clock, field: "created_at" },
  { status: "preparing", label: "Preparing", icon: ChefHat, field: "prepared_at" },
  { status: "out_for_delivery", label: "Out for Delivery", icon: Package, field: "ready_at" },
  { status: "arrived", label: "Arrived", icon: Truck, field: "delivered_at" },
] as const;

export default function OrderTimeline({ order }: OrderTimelineProps) {
  return (
    <div className="relative pl-2">
      {/* Continuous vertical line */}
      <div 
        className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-muted" 
        style={{ zIndex: 0 }}
      />
      
      <div className="space-y-6 relative z-10">
        {steps.map((step, index) => {
          const timestamp = order[step.field as keyof Order] as string | null;
          const isActive = !!timestamp;
          const Icon = step.icon;

          return (
            <div key={step.status} className="flex gap-4">
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-card ${
                    isActive
                      ? "bg-secondary text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="pt-1">
                <p className={`text-sm font-medium ${!isActive && "text-muted-foreground"}`}>
                  {step.label}
                </p>
                {timestamp && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(timestamp).toLocaleTimeString("en-UG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
