import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Sparkles, Check } from "lucide-react";
import { formatPrice } from "@shared/lib/utils";
import { MenuItem } from "@shared/types/database";

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
  if (!isOpen || suggestions.length === 0) return null;

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
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Make It Better!</h2>
                  <p className="text-white/80 text-sm">Recommended for you</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Suggestions */}
          <div className="p-6 space-y-4">
            {suggestions.slice(0, 3).map(({ item, promptText }, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-secondary/30 hover:bg-secondary/5 transition-all"
              >
                {/* Image */}
                <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-200">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Sparkles className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-secondary font-semibold uppercase tracking-wide mb-1">
                    {promptText}
                  </p>
                  <h3 className="font-bold text-gray-900 truncate">{item.name}</h3>
                  <p className="text-lg font-bold text-primary">
                    {formatPrice(item.price)}
                  </p>
                </div>

                {/* Add button */}
                <button
                  onClick={() => onAddItem(item)}
                  className="w-14 h-14 flex-shrink-0 bg-secondary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-secondary/90 active:scale-95 transition-all"
                >
                  <Plus className="w-7 h-7" />
                </button>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-6 pt-0 flex gap-3">
            <button
              onClick={onSkip}
              className="flex-1 py-4 px-6 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              No Thanks
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-4 px-6 rounded-2xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all"
            >
              <Check className="w-5 h-5" />
              Continue
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
