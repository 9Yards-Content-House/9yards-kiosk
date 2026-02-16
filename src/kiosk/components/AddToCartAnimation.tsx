import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

interface AddToCartAnimationProps {
  show: boolean;
  onComplete?: () => void;
}

/**
 * A brief "Added! ✓" overlay animation that shows when an item is added to cart
 * Displays for 800ms and then fades out
 */
export default function AddToCartAnimation({ show, onComplete }: AddToCartAnimationProps) {
  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute inset-0 z-30 flex items-center justify-center bg-[#E6411C]/90 backdrop-blur-sm rounded-2xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 15 }}
            className="flex flex-col items-center gap-2"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 500, damping: 20 }}
              className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg"
            >
              <Check className="w-7 h-7 text-[#E6411C]" strokeWidth={3} />
            </motion.div>
            <span className="text-white font-bold text-lg">Added!</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to manage add-to-cart animation state
 * Returns [isAnimating, triggerAnimation] tuple
 */
export function useAddToCartAnimation(duration = 800): [boolean, () => void] {
  const [isAnimating, setIsAnimating] = useState(false);
  
  const triggerAnimation = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), duration);
  }, [duration]);
  
  return [isAnimating, triggerAnimation];
}
