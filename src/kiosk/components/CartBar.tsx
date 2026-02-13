import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { formatPrice } from "@shared/lib/utils";
import { useEffect, useState, useRef } from "react";

interface CartBarProps {
  itemCount: number;
  total: number;
  onClick: () => void;
}

export default function CartBar({ itemCount, total, onClick }: CartBarProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevCountRef = useRef(itemCount);

  // Animate when item count changes
  useEffect(() => {
    if (itemCount !== prevCountRef.current && itemCount > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      prevCountRef.current = itemCount;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = itemCount;
  }, [itemCount]);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="cart-bar"
    >
      <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-secondary text-white px-6 py-4 flex items-center justify-between shadow-cta rounded-t-2xl relative overflow-hidden group"
      >
        {/* Animated shine effect */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ 
            repeat: Infinity, 
            repeatDelay: 3,
            duration: 1,
            ease: 'easeInOut',
          }}
        />
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="relative">
            <motion.div
              animate={isAnimating ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <ShoppingCart className="w-6 h-6" />
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.span 
                key={itemCount}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute -top-2 -right-2 bg-white text-secondary text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
              >
                {itemCount}
              </motion.span>
            </AnimatePresence>
          </div>
          <span className="text-lg font-bold">View Cart</span>
        </div>
        <div className="flex items-center gap-2 relative z-10">
          <AnimatePresence mode="wait">
            <motion.span 
              key={total}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-xl font-extrabold tracking-tight"
            >
              {formatPrice(total)}
            </motion.span>
          </AnimatePresence>
          <motion.div
            animate={{ x: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          >
            <ArrowRight className="w-5 h-5" />
          </motion.div>
        </div>
      </motion.button>
    </motion.div>
  );
}
