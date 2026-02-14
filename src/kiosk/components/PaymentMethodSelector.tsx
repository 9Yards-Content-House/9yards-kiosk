import { Banknote, Smartphone, Split } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { vibrate } from "@shared/lib/utils";
import type { PaymentMethod } from "@shared/types/orders";

interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  showSplitOption?: boolean;
  onSplitChange?: (isSplit: boolean) => void;
  isSplit?: boolean;
}

const methods: { value: PaymentMethod; label: string; desc: string; icon: typeof Banknote }[] = [
  {
    value: "mobile_money",
    label: "Mobile Money",
    desc: "Pay now via MTN/Airtel",
    icon: Smartphone,
  },
  {
    value: "cash",
    label: "Cash",
    desc: "Pay on delivery",
    icon: Banknote,
  },
];

export default function PaymentMethodSelector({
  selected,
  onChange,
  showSplitOption = false,
  onSplitChange,
  isSplit = false,
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
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
                "p-3 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition-all active:scale-[0.98]",
                isActive
                  ? "border-[#E6411C] bg-[#E6411C]/5"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                  isActive ? "bg-[#E6411C] text-white" : "bg-gray-100 text-gray-500"
                )}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className={cn(
                  "font-bold text-sm",
                  isActive ? "text-[#212282]" : "text-gray-700"
                )}>{m.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{m.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Split Payment Option */}
      {showSplitOption && (
        <button
          onClick={() => {
            vibrate();
            onSplitChange?.(!isSplit);
          }}
          className={cn(
            "w-full p-3 rounded-xl border-2 flex items-center gap-3 transition-all",
            isSplit
              ? "border-purple-500 bg-purple-50"
              : "border-gray-200 hover:border-gray-300 bg-white"
          )}
        >
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isSplit ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-500"
            )}
          >
            <Split className="w-5 h-5" />
          </div>
          <div className="text-left flex-1">
            <p className={cn(
              "font-semibold text-sm",
              isSplit ? "text-purple-700" : "text-gray-700"
            )}>
              Split Payment
            </p>
            <p className="text-xs text-gray-500">
              Pay part now with MoMo, rest in cash
            </p>
          </div>
          <div
            className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center",
              isSplit ? "border-purple-500 bg-purple-500" : "border-gray-300"
            )}
          >
            {isSplit && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
        </button>
      )}
    </div>
  );
}
