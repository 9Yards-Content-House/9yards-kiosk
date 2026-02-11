import { Banknote, CreditCard, Smartphone } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { vibrate } from "@shared/lib/utils";
import type { PaymentMethod } from "@shared/types/orders";

interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

const methods: { value: PaymentMethod; label: string; desc: string; icon: typeof Banknote }[] = [
  {
    value: "pay_at_counter",
    label: "Pay at Counter",
    desc: "Pay when you pick up",
    icon: CreditCard,
  },
  {
    value: "cash",
    label: "Cash on Delivery",
    desc: "Pay when delivered to your desk",
    icon: Banknote,
  },
  {
    value: "mobile_money",
    label: "Mobile Money",
    desc: "MTN or Airtel Money",
    icon: Smartphone,
  },
];

export default function PaymentMethodSelector({
  selected,
  onChange,
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      {methods.map((m) => {
        const Icon = m.icon;
        const isActive = selected === m.value;

        return (
          <button
            key={m.value}
            onClick={() => {
              vibrate();
              onChange(m.value);
            }}
            className={cn(
              "w-full p-4 rounded-xl border-2 flex items-center gap-4 text-left transition-colors",
              isActive
                ? "border-yards-orange bg-yards-orange/10"
                : "border-muted hover:border-muted-foreground/30"
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                isActive ? "bg-yards-orange text-white" : "bg-muted"
              )}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-lg">{m.label}</p>
              <p className="text-sm text-muted-foreground">{m.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
