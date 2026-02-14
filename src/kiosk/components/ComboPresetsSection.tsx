import { motion } from "framer-motion";
import { Sparkles, ChevronRight } from "lucide-react";
import { cn, formatPrice, vibrate } from "@shared/lib/utils";
import { usePopularPresets, ComboPreset } from "@shared/hooks/useComboPresets";
import { useKioskCart } from "../context/KioskCartContext";
import { useSound } from "../hooks/useSound";

interface ComboPresetsSectionProps {
  className?: string;
}

export default function ComboPresetsSection({
  className,
}: ComboPresetsSectionProps) {
  const { data: presets = [], isLoading } = usePopularPresets();
  const { addItem } = useKioskCart();
  const { play } = useSound();

  const handleSelectPreset = (preset: ComboPreset) => {
    vibrate([50, 30, 50]);
    play("add");

    // Convert preset extras to OrderExtra format (add price: 0 for preset extras)
    const extras = (preset.extras || []).map((e) => ({
      name: e.name,
      quantity: e.quantity,
      price: 0, // Preset extras are included in the preset price
    }));

    // Add preset as a combo item
    addItem({
      id: crypto.randomUUID(),
      type: "combo",
      sauceName: preset.sauce_name || "",
      saucePreparation: preset.sauce_preparation || "",
      sauceSize: preset.sauce_size || "Regular",
      mainDishes: preset.main_dishes,
      sideDish: preset.side_dish || "",
      extras,
      quantity: 1,
      unitPrice: preset.price,
      label: preset.name,
    });
  };

  if (isLoading) {
    return (
      <div className={cn("px-4 py-6", className)}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-32 h-6 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="shrink-0 w-56 h-36 bg-gray-200 animate-pulse rounded-2xl"
            />
          ))}
        </div>
      </div>
    );
  }

  if (presets.length === 0) {
    return null;
  }

  return (
    <div className={cn("bg-gradient-to-b from-[#212282]/5 to-transparent", className)}>
      <div className="px-4 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#E6411C] rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#212282]">Quick Combos</h2>
            <p className="text-xs text-muted-foreground">
              One-tap favorites, ready to order
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-hide pb-4 px-4">
        <div className="flex gap-3 min-w-max">
          {presets.map((preset, index) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              index={index}
              onSelect={handleSelectPreset}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface PresetCardProps {
  preset: ComboPreset;
  index: number;
  onSelect: (preset: ComboPreset) => void;
}

function PresetCard({ preset, index, onSelect }: PresetCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={() => onSelect(preset)}
      className={cn(
        "shrink-0 w-56 bg-white rounded-2xl overflow-hidden border border-gray-100",
        "hover:border-[#E6411C]/40 hover:shadow-lg active:scale-[0.98]",
        "transition-all duration-200 text-left flex flex-col",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6411C] focus-visible:ring-offset-2"
      )}
    >
      {/* Image/Visual */}
      {preset.image_url ? (
        <div className="h-24 bg-gray-100 overflow-hidden">
          <img
            src={preset.image_url}
            alt={preset.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="h-24 bg-gradient-to-br from-[#212282] to-[#E6411C] flex items-center justify-center">
          <span className="text-4xl font-bold text-white/20">
            {preset.name.charAt(0)}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-sm text-foreground line-clamp-1">
            {preset.name}
          </h3>
          {preset.is_popular && (
            <span className="shrink-0 bg-[#E6411C]/10 text-[#E6411C] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              Hot
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 flex-1 mb-2">
          {preset.description ||
            [
              preset.main_dishes?.join(" + "),
              preset.sauce_name,
              preset.side_dish,
            ]
              .filter(Boolean)
              .join(" • ")}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-[#E6411C] font-bold text-base">
            {formatPrice(preset.price)}
          </span>
          <span className="text-xs font-semibold text-[#212282] flex items-center gap-0.5">
            Add <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </motion.button>
  );
}
