import { Edit2, Clock, Star, Sparkles, Image as ImageIcon, Package, Layers } from "lucide-react";
import { 
  useToggleMenuItemAvailability,
  useToggleMenuItemPopular,
  useToggleMenuItemNew,
} from "@shared/hooks/useMenuMutations";
import { formatPrice, cn } from "@shared/lib/utils";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type { MenuItem, Category, MenuItemType } from "@shared/types/menu";

const getItemTypeDisplay = (itemType?: MenuItemType) => {
  switch (itemType) {
    case 'combo_component':
      return { label: 'Combo', color: 'bg-blue-100 text-blue-700', icon: Layers };
    case 'combo_driver':
      return { label: 'Driver', color: 'bg-purple-100 text-purple-700', icon: Package };
    default:
      return null;
  }
};

interface MenuItemRowProps {
  item: MenuItem;
  category?: Category;
  canEdit: boolean;
  onEdit: () => void;
}

export default function MenuItemRow({ item, category, canEdit, onEdit }: MenuItemRowProps) {
  const toggleAvailability = useToggleMenuItemAvailability();
  const togglePopular = useToggleMenuItemPopular();
  const toggleNew = useToggleMenuItemNew();

  const isScheduled = item.available_from || item.available_until;
  const isPopular = item.is_popular;
  const isNew = item.is_new;
  const itemTypeDisplay = getItemTypeDisplay(item.item_type);

  return (
    /*
     * Layout strategy (NO lg:contents — image+content always stay together):
     *   Mobile  (< md):  flex-col  — stacked card
     *   Tablet  (md–lg): flex-row  — [Item+Img  Price  Actions]
     *   Desktop (lg+):   5-col grid — [Item+Img | Category | Price | Badges | Actions]
     */
    <div className={cn(
      "group border-b hover:bg-muted/30 transition-colors px-4 py-4 md:py-3",
      // Mobile
      "flex flex-col",
      // Tablet
      "md:flex-row md:items-center md:gap-4",
      // Desktop
      "lg:grid lg:grid-cols-[1fr_120px_100px_120px_100px] lg:gap-4"
    )}>

      {/* ── Column 1: Item (image + text, always together) ────────── */}
      <div className="flex gap-3 w-full md:flex-1 md:min-w-0 lg:min-w-0">
        {/* Image */}
        <div className="shrink-0">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="w-20 h-20 md:w-12 md:h-12 rounded-lg object-cover border"
            />
          ) : (
            <div className="w-20 h-20 md:w-12 md:h-12 rounded-lg bg-muted flex items-center justify-center border">
              <ImageIcon className="w-8 h-8 md:w-5 md:h-5 text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 py-0.5">
          <h3 className="font-medium truncate text-base md:text-sm text-foreground">
            {item.name}
          </h3>

          {/* Mobile-only: price + category */}
          <div className="flex items-center gap-2 mt-1 md:hidden">
            <span className={cn("text-sm font-semibold", item.price === 0 && "text-green-600")}>
              {item.price > 0 ? formatPrice(item.price) : "Free"}
            </span>
            <span className="text-muted-foreground text-xs">•</span>
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
              {category?.name}
            </span>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 md:line-clamp-1 mt-1">
            {item.description}
          </p>

          {/* Tablet-only: category + badges inline (md → lg) */}
          <div className="hidden md:flex lg:hidden items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground">{category?.name}</span>
            {itemTypeDisplay && (
              <Badge variant="secondary" className={cn("text-xs py-0 h-5", itemTypeDisplay.color)}>
                <itemTypeDisplay.icon className="w-3 h-3 mr-1" />
                {itemTypeDisplay.label}
              </Badge>
            )}
            {isPopular && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs py-0 h-5">
                <Star className="w-3 h-3 mr-1" />Popular
              </Badge>
            )}
            {isNew && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs py-0 h-5">
                <Sparkles className="w-3 h-3 mr-1" />New
              </Badge>
            )}
          </div>

          {/* Desktop: badges under name (lg+) */}
          <div className="hidden lg:flex items-center gap-2 mt-1">
            {itemTypeDisplay && (
              <Badge variant="secondary" className={cn("text-xs py-0 h-5", itemTypeDisplay.color)}>
                <itemTypeDisplay.icon className="w-3 h-3 mr-1" />
                {itemTypeDisplay.label}
              </Badge>
            )}
            {isPopular && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs py-0 h-5">
                <Star className="w-3 h-3 mr-1" />Popular
              </Badge>
            )}
            {isNew && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs py-0 h-5">
                <Sparkles className="w-3 h-3 mr-1" />New
              </Badge>
            )}
            {isScheduled && (
              <div className="flex items-center gap-1 text-xs text-amber-600 ml-2">
                <Clock className="w-3 h-3" />Scheduled
              </div>
            )}
          </div>
        </div>

        {/* Mobile-only actions */}
        <div className="flex flex-col items-end gap-3 md:hidden shrink-0">
          {canEdit && (
            <Button variant="ghost" size="icon"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Edit2 className="w-5 h-5" />
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "h-6 px-2 rounded-full text-[10px] font-medium uppercase tracking-wider flex items-center justify-center border cursor-pointer select-none",
                  item.available
                    ? "bg-green-100 text-green-700 border-green-200"
                    : "bg-gray-100 text-gray-500 border-gray-200"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleAvailability.mutate({ id: item.id, available: !item.available });
                }}
              >
                {item.available ? "Active" : "Inactive"}
              </div>
            </TooltipTrigger>
            <TooltipContent>Toggle Availability</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* ── Column 2: Category (lg+ only) ────────────────────────── */}
      <span className="hidden lg:flex text-sm text-muted-foreground items-center truncate">
        {category?.name || "—"}
      </span>

      {/* ── Column 3: Price (tablet + desktop) ───────────────────── */}
      <span className={cn(
        "hidden md:flex text-sm font-medium items-center shrink-0",
        item.price === 0 && "text-green-600"
      )}>
        {item.price > 0 ? formatPrice(item.price) : "Free"}
      </span>

      {/* ── Column 4: Badge toggles (lg+ only) ───────────────────── */}
      <div className="hidden lg:flex items-center">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isPopular ? "default" : "ghost"} size="icon"
                className={cn("h-8 w-8", isPopular && "bg-amber-500 hover:bg-amber-600")}
                onClick={() => togglePopular.mutate({ id: item.id, is_popular: !isPopular })}
                disabled={!canEdit || togglePopular.isPending}
              >
                <Star className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mark as Popular</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isNew ? "default" : "ghost"} size="icon"
                className={cn("h-8 w-8", isNew && "bg-green-500 hover:bg-green-600")}
                onClick={() => toggleNew.mutate({ id: item.id, is_new: !isNew })}
                disabled={!canEdit || toggleNew.isPending}
              >
                <Sparkles className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mark as New</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* ── Column 5: Actions (tablet + desktop) ─────────────────── */}
      <div className="hidden md:flex items-center justify-end gap-2 shrink-0">
        <Button
          variant={item.available ? "default" : "secondary"} size="sm"
          onClick={() => toggleAvailability.mutate({ id: item.id, available: !item.available })}
          disabled={!canEdit || toggleAvailability.isPending}
          className={cn("h-7 text-xs px-2", item.available ? "bg-green-600 hover:bg-green-700" : "bg-gray-200 text-gray-600")}
        >
          {item.available ? "Active" : "Inactive"}
        </Button>
        {canEdit && (
          <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
            <Edit2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
