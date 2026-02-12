import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Clock, Plus, Trash2, History, Star } from "lucide-react";
import type { MenuItem } from "@shared/types";
import { formatPrice } from "@shared/lib/utils";

const FAVORITES_KEY = "kiosk-favorites";
const ORDER_HISTORY_KEY = "kiosk-order-history";
const MAX_HISTORY = 5;

interface OrderHistoryItem {
  id: string;
  items: { menuItem: MenuItem; quantity: number }[];
  total: number;
  date: string;
}

// Load favorites from localStorage
export function loadFavorites(): string[] {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// Save favorites to localStorage
export function saveFavorites(favorites: string[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    // Ignore storage errors
  }
}

// Add a favorite
export function addFavorite(itemId: string) {
  const favorites = loadFavorites();
  if (!favorites.includes(itemId)) {
    favorites.push(itemId);
    saveFavorites(favorites);
  }
}

// Remove a favorite
export function removeFavorite(itemId: string) {
  const favorites = loadFavorites().filter(id => id !== itemId);
  saveFavorites(favorites);
}

// Check if item is a favorite
export function isFavorite(itemId: string): boolean {
  return loadFavorites().includes(itemId);
}

// Toggle favorite
export function toggleFavorite(itemId: string): boolean {
  const favorites = loadFavorites();
  if (favorites.includes(itemId)) {
    removeFavorite(itemId);
    return false;
  } else {
    addFavorite(itemId);
    return true;
  }
}

// Load order history
export function loadOrderHistory(): OrderHistoryItem[] {
  try {
    const saved = localStorage.getItem(ORDER_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// Save order to history
export function saveOrderToHistory(
  items: { menuItem: MenuItem; quantity: number }[],
  total: number
) {
  const history = loadOrderHistory();
  const newOrder: OrderHistoryItem = {
    id: Date.now().toString(),
    items,
    total,
    date: new Date().toISOString(),
  };
  
  history.unshift(newOrder);
  
  // Keep only the most recent orders
  if (history.length > MAX_HISTORY) {
    history.pop();
  }
  
  try {
    localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Ignore storage errors
  }
}

// Clear order history
export function clearOrderHistory() {
  try {
    localStorage.removeItem(ORDER_HISTORY_KEY);
  } catch {
    // Ignore storage errors
  }
}

interface FavoriteButtonProps {
  itemId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function FavoriteButton({ itemId, className = "", size = "md" }: FavoriteButtonProps) {
  const [favorite, setFavorite] = useState(() => isFavorite(itemId));
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = toggleFavorite(itemId);
    setFavorite(newState);
  };
  
  const sizeClasses = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };
  
  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };
  
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={handleToggle}
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all ${
        favorite 
          ? "bg-red-500 text-white" 
          : "bg-white/90 text-gray-400 hover:text-red-500"
      } ${className}`}
      aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={favorite ? "filled" : "empty"}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Heart 
            className={iconSizes[size]} 
            fill={favorite ? "currentColor" : "none"} 
          />
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}

interface QuickReorderPanelProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  onAddToCart: (items: { menuItem: MenuItem; quantity: number }[]) => void;
}

export function QuickReorderPanel({
  isOpen,
  onClose,
  menuItems,
  onAddToCart,
}: QuickReorderPanelProps) {
  const [activeTab, setActiveTab] = useState<"favorites" | "history">("favorites");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<OrderHistoryItem[]>([]);
  
  useEffect(() => {
    if (isOpen) {
      setFavorites(loadFavorites());
      setHistory(loadOrderHistory());
    }
  }, [isOpen]);
  
  const favoriteItems = menuItems.filter(item => favorites.includes(item.id));
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };
  
  if (!isOpen) return null;
  
  return (
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
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-secondary to-secondary/80 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Quick Reorder</h2>
              <p className="text-white/80 text-sm">Your favorites & recent orders</p>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("favorites")}
            className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 font-semibold transition-colors ${
              activeTab === "favorites"
                ? "text-secondary border-b-2 border-secondary"
                : "text-gray-500"
            }`}
          >
            <Heart className="w-5 h-5" />
            Favorites ({favoriteItems.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 font-semibold transition-colors ${
              activeTab === "history"
                ? "text-secondary border-b-2 border-secondary"
                : "text-gray-500"
            }`}
          >
            <History className="w-5 h-5" />
            Recent ({history.length})
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "favorites" ? (
            favoriteItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Heart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No favorites yet</p>
                <p className="text-sm">Tap the heart icon on items to save them</p>
              </div>
            ) : (
              <div className="space-y-3">
                {favoriteItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                      <p className="text-secondary font-bold">{formatPrice(item.price)}</p>
                    </div>
                    <button
                      onClick={() => onAddToCart([{ menuItem: item, quantity: 1 }])}
                      className="w-10 h-10 bg-secondary text-white rounded-full flex items-center justify-center hover:bg-secondary/90 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            history.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No order history</p>
                <p className="text-sm">Your recent orders will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((order) => (
                  <div
                    key={order.id}
                    className="bg-gray-50 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-500">{formatDate(order.date)}</span>
                      <span className="font-bold text-primary">{formatPrice(order.total)}</span>
                    </div>
                    <div className="space-y-2 mb-3">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-xs font-bold">
                            {item.quantity}
                          </span>
                          <span className="text-gray-700 truncate">{item.menuItem.name}</span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-sm text-gray-500">
                          +{order.items.length - 3} more items
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => onAddToCart(order.items)}
                      className="w-full py-2.5 bg-secondary text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-secondary/90 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add All to Cart
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full py-4 px-6 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
