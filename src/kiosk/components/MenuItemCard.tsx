import { motion } from "framer-motion";
import { Plus, Flame } from "lucide-react";
import { formatPrice, vibrate } from "@shared/lib/utils";
import { useKioskCart } from "../context/KioskCartContext";
import type { MenuItem } from "@shared/types/menu";

interface MenuItemCardProps {
  item: MenuItem;
  isComboStarter?: boolean;
  onAdd?: () => void;
  isBestSeller?: boolean;
  isNew?: boolean;
}

// Best sellers and new items (can be customized based on actual data)
const BEST_SELLERS = ["chicken", "fish", "beef", "ordinary"];
const NEW_ITEMS = ["beef-pilao", "beef & pilao"];

export default function MenuItemCard({ item, isComboStarter, onAdd, isBestSeller, isNew }: MenuItemCardProps) {
  const { addItem } = useKioskCart();

  // Derive badges from item name if not explicitly passed
  const itemNameLower = item.name.toLowerCase();
  const showBestSeller = isBestSeller ?? BEST_SELLERS.some(term => itemNameLower.includes(term));
  const showNew = isNew ?? NEW_ITEMS.some(term => itemNameLower.includes(term));

  const handleAdd = () => {
    vibrate();
    if (isComboStarter && onAdd) {
      // Open combo builder for sauces
      onAdd();
      return;
    }

    // Direct add for non-combo items (juices, desserts, lusaniya)
    addItem({
      id: crypto.randomUUID(),
      type: "single",
      mainDishes: [],
      sauceName: undefined,
      saucePreparation: undefined,
      sauceSize: undefined,
      sideDish: undefined,
      extras: [],
      quantity: 1,
      unitPrice: item.price,
      label: item.name,
    });
  };

  // Determine category labels
  const categorySlug = item.category?.slug;
  const isMainDish = categorySlug === "main-dishes";
  const isSideDish = categorySlug === "side-dishes";
  const isSauce = categorySlug === "sauces";
  const isComboRelated = isSauce || isMainDish || isSideDish;

  return (
    <motion.article
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card transition-all duration-300 hover:border-secondary/30 hover:shadow-elevated"
      role="button"
      tabIndex={0}
      aria-label={`${item.name}, ${item.price > 0 ? formatPrice(item.price) : 'Included'}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleAdd();
        }
      }}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No image
          </div>
        )}
        
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {showBestSeller && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
              <Flame className="h-3 w-3" />
              Best Seller
            </span>
          )}
          {showNew && (
            <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
              New
            </span>
          )}
        </div>

        {/* Hover overlay with action text */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary shadow-lg">
            {isComboStarter ? "Start Combo" : "Add to Order"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Category label for combo-related items */}
        {isComboRelated && (
          <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-secondary/70">
            {isSauce ? "Combo Base" : isMainDish ? "Combo Protein" : "Free Side"}
          </span>
        )}

        <h3 className="text-lg font-bold text-primary leading-tight line-clamp-1">
          {item.name}
        </h3>
        
        {item.description && (
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-4">
          {/* Price */}
          {item.price > 0 ? (
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-secondary tracking-tight">
                {formatPrice(item.price)}
              </span>
              {isSauce && (
                <span className="text-[10px] font-medium text-muted-foreground">
                  Starting from
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm font-bold text-green-600 uppercase tracking-wide">
              Included
            </span>
          )}

          {/* Add Button */}
          <button
            onClick={handleAdd}
            aria-label={`Add ${item.name} to cart`}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-white shadow-cta transition-all duration-200 hover:bg-secondary/90 active:scale-95 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Availability indicator */}
      {!item.available && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-500">
            Currently Unavailable
          </span>
        </div>
      )}
    </motion.article>
  );
}
