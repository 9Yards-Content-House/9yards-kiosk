import { Edit2, Clock, Star, Sparkles, Image as ImageIcon, Package, Layers } from "lucide-react";
import { 
  useToggleMenuItemAvailability,
  useToggleMenuItemPopular,
  useToggleMenuItemNew,
} from "@shared/hooks/useMenuMutations";
import { formatPrice, cn } from "@shared/lib/utils";
// import { Switch } from "@shared/components/ui/switch";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type { MenuItem, Category, MenuItemType } from "@shared/types/menu";

// Helper to get item type label and color
const getItemTypeDisplay = (itemType?: MenuItemType) => {
  switch (itemType) {
    case 'combo_component':
      return { label: 'Combo', color: 'bg-blue-100 text-blue-700', icon: Layers };
    case 'combo_driver':
      return { label: 'Driver', color: 'bg-purple-100 text-purple-700', icon: Package };
    default:
      return null; // Don't show badge for standalone (default)
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

  // Check if item is scheduled
  const isScheduled = item.available_from || item.available_until;
  const isPopular = item.is_popular;
  const isNew = item.is_new;
  const itemTypeDisplay = getItemTypeDisplay(item.item_type);

  return (
    <div className="flex flex-col md:grid md:grid-cols-[1fr_120px_100px_120px_100px] gap-3 md:gap-4 items-start md:items-center px-4 py-4 md:py-3 border-b hover:bg-muted/30 transition-colors relative">
      {/* Item info - Full width on mobile */}
      <div className="flex items-start gap-3 w-full">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-16 h-16 md:w-12 md:h-12 rounded-lg object-cover border flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 md:w-12 md:h-12 rounded-lg bg-muted flex items-center justify-center border flex-shrink-0">
            <ImageIcon className="w-6 h-6 md:w-5 md:h-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium truncate text-base md:text-sm">{item.name}</p>
              <div className="flex flex-wrap gap-1 mt-1 md:hidden">
                 {/* Mobile Price */}
                 <span className={cn(
                  "text-sm font-semibold",
                  item.price === 0 && "text-green-600"
                )}>
                  {item.price > 0 ? formatPrice(item.price) : "Free"}
                </span>
                <span className="text-muted-foreground mx-1">•</span>
                <span className="text-sm text-muted-foreground">{category?.name || "—"}</span>
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2 mt-0.5">
             {itemTypeDisplay && (
              <Badge variant="secondary" className={cn("text-xs", itemTypeDisplay.color)}>
                <itemTypeDisplay.icon className="w-3 h-3 mr-0.5" />
                {itemTypeDisplay.label}
              </Badge>
            )}
             {isPopular && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                <Star className="w-3 h-3 mr-0.5" />
                Popular
              </Badge>
            )}
            {isNew && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                <Sparkles className="w-3 h-3 mr-0.5" />
                New
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 md:line-clamp-1 mt-1 md:mt-0">
            {item.description}
          </p>
          {isScheduled && (
            <div className="flex items-center gap-1 text-xs text-amber-600 mt-1 md:mt-0.5">
              <Clock className="w-3 h-3" />
              Scheduled
            </div>
          )}
        </div>
      </div>

      {/* Desktop Category */}
      <span className="hidden md:block text-sm text-muted-foreground">
        {category?.name || "—"}
      </span>

      {/* Desktop Price */}
      <span className={cn(
        "hidden md:block text-sm font-medium",
        item.price === 0 && "text-green-600"
      )}>
        {item.price > 0 ? formatPrice(item.price) : "Free"}
      </span>

      {/* Badges/Tags - Desktop & Mobile (Mobile shows under description) */}
      <div className="w-full md:w-auto flex flex-wrap gap-2 md:justify-start mt-2 md:mt-0">
         {/* Mobile only badges */}
         <div className="flex flex-wrap gap-1 md:hidden mr-auto">
            {itemTypeDisplay && (
              <Badge variant="secondary" className={cn("text-xs", itemTypeDisplay.color)}>
                <itemTypeDisplay.icon className="w-3 h-3 mr-0.5" />
                {itemTypeDisplay.label}
              </Badge>
            )}
             {isPopular && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                <Star className="w-3 h-3 mr-0.5" />
                Popular
              </Badge>
            )}
            {isNew && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                <Sparkles className="w-3 h-3 mr-0.5" />
                New
              </Badge>
            )}
         </div>

        {/* Action Toggle Badges (Star/Sparkle buttons) */}
        <div className="flex items-center gap-1 ml-auto md:ml-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isPopular ? "default" : "ghost"}
                size="icon"
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
                variant={isNew ? "default" : "ghost"}
                size="icon"
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

      {/* Actions (Switch + Edit) */}
      <div className="flex items-center gap-2 md:justify-end absolute top-4 right-4 md:static">
        <Button
          variant={item.available ? "default" : "secondary"}
          size="sm"
          onClick={() => toggleAvailability.mutate({ id: item.id, available: !item.available })}
          disabled={!canEdit || toggleAvailability.isPending}
          className={cn("h-6 text-xs", item.available ? "bg-green-600 hover:bg-green-700" : "bg-gray-200 text-gray-600")}
        >
          {item.available ? "Active" : "Inactive"}
        </Button>
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="h-8 w-8 hidden md:flex"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        )}
        {/* Mobile edit button covers the whole card click usually, but here we might want explicit button */}
        {canEdit && (
           <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="h-8 w-8 md:hidden absolute bottom-4 right-4 bg-muted/50"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

