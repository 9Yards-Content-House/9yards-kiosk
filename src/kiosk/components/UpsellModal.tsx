import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Sparkles, Check, ArrowRight } from "lucide-react";
import { formatPrice, vibrate } from "@shared/lib/utils";
import type { MenuItem } from "@shared/types";

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: {
    item: MenuItem;
    promptText: string;
  }[];
  onAddItem: (item: MenuItem) => void;
  onSkip: () => void;
}

export default function UpsellModal({
  isOpen,
  onClose,
  suggestions,
  onAddItem,
  onSkip,
}: UpsellModalProps) {
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  if (!isOpen || suggestions.length === 0) return null;

  const handleAddItem = (item: MenuItem) => {
    vibrate([30, 30]);
    onAddItem(item);
    setAddedItems((prev) => new Set(prev).add(item.id));
  };

  const handleContinue = () => {
    // Mark that user has seen upsell in this session
    sessionStorage.setItem('kiosk_upsell_shown', 'true');
    onSkip();
  };

  const handleSkip = () => {
    sessionStorage.setItem('kiosk_upsell_shown', 'true');
    onSkip();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Clean, no gradient */}
          <div className="bg-[#212282] p-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Complete Your Meal</h2>
                  <p className="text-white/70 text-sm">Add a drink or dessert?</p>
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Suggestions */}
          <div className="p-5 space-y-3 max-h-[50vh] overflow-y-auto">
            {suggestions.slice(0, 3).map(({ item, promptText }, idx) => {
              const isAdded = addedItems.has(item.id);
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl border border-gray-100"
                >
                  {/* Image */}
                  <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-200">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Sparkles className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[#E6411C] font-bold uppercase tracking-wide mb-0.5">
                      {promptText}
                    </p>
                    <h3 className="font-bold text-[#212282] text-sm truncate">{item.name}</h3>
                    <p className="text-base font-bold text-[#E6411C]">
                      {formatPrice(item.price)}
                    </p>
                  </div>

                  {/* Add button */}
                  {isAdded ? (
                    <div className="w-12 h-12 flex-shrink-0 bg-green-500 text-white rounded-full flex items-center justify-center">
                      <Check className="w-6 h-6" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddItem(item)}
                      className="w-12 h-12 flex-shrink-0 bg-[#E6411C] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#d13a18] active:scale-95 transition-all"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-5 pt-2 border-t border-gray-100">
            <button
              onClick={handleContinue}
              className="w-full py-4 px-6 rounded-2xl bg-[#E6411C] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#d13a18] transition-all active:scale-[0.98]"
            >
              {addedItems.size > 0 ? (
                <>
                  <Check className="w-5 h-5" />
                  Continue to Checkout
                </>
              ) : (
                <>
                  No Thanks, Continue
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
