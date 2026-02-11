import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { formatPrice, vibrate } from "@shared/lib/utils";
import { useKioskCart } from "../context/KioskCartContext";
import type { MenuItem } from "@shared/types/menu";

interface MenuItemCardProps {
  item: MenuItem;
  isComboStarter?: boolean;
  onAdd?: () => void;
}

export default function MenuItemCard({ item, isComboStarter, onAdd }: MenuItemCardProps) {
  const { addItem } = useKioskCart();

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

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="bg-card rounded-xl shadow-sm border overflow-hidden flex flex-col"
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-muted overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No image
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-base line-clamp-1">{item.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1 flex-1">
          {item.description}
        </p>

        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-yards-orange">
            {item.price > 0 ? formatPrice(item.price) : "Included"}
          </span>
          <button
            onClick={handleAdd}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-yards-orange text-white shadow-sm active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
