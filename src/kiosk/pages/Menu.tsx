import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useGroupedMenu } from "@shared/hooks/useMenu";
import { formatPrice } from "@shared/lib/utils";
import { useKioskCart } from "../context/KioskCartContext";
import KioskHeader from "../components/KioskHeader";
import CategoryTabs from "../components/CategoryTabs";
import MenuItemCard from "../components/MenuItemCard";
import ComboBuilder from "../components/ComboBuilder";
import CartBar from "../components/CartBar";
import type { MenuItem } from "@shared/types/menu";

export default function Menu() {
  const navigate = useNavigate();
  const { data: groups, isLoading, error } = useGroupedMenu();
  const { itemCount, subtotal } = useKioskCart();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [comboItem, setComboItem] = useState<MenuItem | null>(null);

  // Default to first category
  const currentSlug = activeCategory || groups?.[0]?.category.slug || null;
  const currentGroup = groups?.find((g) => g.category.slug === currentSlug);

  const isSauceCategory = currentSlug === "sauces";

  if (isLoading) {
    return (
      <div className="kiosk-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-yards-orange border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="kiosk-screen flex flex-col items-center justify-center p-8">
        <p className="text-xl text-red-500 mb-4">Failed to load menu</p>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-4 bg-yards-orange text-white rounded-xl text-lg"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="kiosk-screen flex flex-col bg-background">
      <KioskHeader title="Menu" showBack onBack={() => navigate("/")} />

      {/* Category tabs */}
      {groups && (
        <CategoryTabs
          categories={groups.map((g) => g.category)}
          active={currentSlug}
          onChange={setActiveCategory}
        />
      )}

      {/* Items grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlug}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4"
          >
            {currentGroup?.items.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                isComboStarter={isSauceCategory}
                onAdd={() => {
                  if (isSauceCategory) {
                    setComboItem(item);
                  }
                }}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Cart bar */}
      {itemCount > 0 && (
        <CartBar
          itemCount={itemCount}
          total={subtotal}
          onClick={() => navigate("/cart")}
        />
      )}

      {/* Combo builder modal */}
      {comboItem && (
        <ComboBuilder
          sauce={comboItem}
          groups={groups || []}
          onClose={() => setComboItem(null)}
        />
      )}
    </div>
  );
}
