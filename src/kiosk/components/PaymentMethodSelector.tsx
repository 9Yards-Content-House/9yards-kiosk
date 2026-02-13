import { Banknote, Smartphone } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { vibrate } from "@shared/lib/utils";
import type { PaymentMethod } from "@shared/types/orders";

interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

const methods: { value: PaymentMethod; label: string; desc: string; icon: typeof Banknote }[] = [
  {
    value: "cash",
    label: "Cash",
    desc: "Pay when you collect your order",
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
    <div className="flex gap-3">
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
              "flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition-all active:scale-[0.98]",
              isActive
                ? "border-[#E6411C] bg-[#E6411C]/5"
                : "border-gray-200 hover:border-gray-300 bg-white"
            )}
          >
            <div
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                isActive ? "bg-[#E6411C] text-white" : "bg-gray-100 text-gray-500"
              )}
            >
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <p className={cn(
                "font-bold text-base",
                isActive ? "text-[#212282]" : "text-gray-700"
              )}>{m.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
