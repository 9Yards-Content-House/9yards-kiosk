import { motion } from "framer-motion";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { formatPrice } from "@shared/lib/utils";

interface CartBarProps {
  itemCount: number;
  total: number;
  onClick: () => void;
}

export default function CartBar({ itemCount, total, onClick }: CartBarProps) {
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="cart-bar"
    >
      <button
        onClick={onClick}
        className="w-full bg-secondary text-white px-6 py-4 flex items-center justify-between shadow-cta rounded-t-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 bg-white text-secondary text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {itemCount}
            </span>
          </div>
          <span className="text-lg font-bold">View Cart</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight">{formatPrice(total)}</span>
          <ArrowRight className="w-5 h-5" />
        </div>
      </button>
    </motion.div>
  );
}
