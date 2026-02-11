import { Minus, Plus } from "lucide-react";
import { vibrate } from "@shared/lib/utils";

interface QuantityControlProps {
  quantity: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
}

export default function QuantityControl({
  quantity,
  onChange,
  min = 0,
  max = 99,
}: QuantityControlProps) {
  return (
    <div className="flex items-center gap-3 bg-muted rounded-lg p-1">
      <button
        onClick={() => {
          vibrate();
          onChange(Math.max(min, quantity - 1));
        }}
        disabled={quantity <= min}
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-background shadow-sm disabled:opacity-40"
      >
        <Minus className="w-5 h-5" />
      </button>
      <span className="text-lg font-semibold w-8 text-center">{quantity}</span>
      <button
        onClick={() => {
          vibrate();
          onChange(Math.min(max, quantity + 1));
        }}
        disabled={quantity >= max}
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-background shadow-sm disabled:opacity-40"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}
