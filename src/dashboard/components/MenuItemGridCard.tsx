import { Edit2, Star, Sparkles, Image as ImageIcon, Package, Layers } from "lucide-react";
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

// Helper to get item type label and color (Consistent with Row view)
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

interface MenuItemGridCardProps {
  item: MenuItem;
  category?: Category;
  canEdit: boolean;
  onEdit: () => void;
}

export default function MenuItemGridCard({ item, category, canEdit, onEdit }: MenuItemGridCardProps) {
  const toggleAvailability = useToggleMenuItemAvailability();
  const togglePopular = useToggleMenuItemPopular();
  const toggleNew = useToggleMenuItemNew();

  const isPopular = item.is_popular;
  const isNew = item.is_new;
  const itemTypeDisplay = getItemTypeDisplay(item.item_type);

  return (
    <div 
      className={cn(
        "group bg-card rounded-xl border overflow-hidden transition-all hover:shadow-md flex flex-col relative",
        !item.available && "opacity-80"
      )}
    >
      {/* Image Area - Aspect Ratio 4:3 */}
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
            <ImageIcon className="w-10 h-10" />
          </div>
        )}

        {/* Top Badges Overlay */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[80%]">
          {itemTypeDisplay && (
            <Badge className={cn("text-[10px] px-1.5 py-0.5 shadow-sm border-0", itemTypeDisplay.color)}>
              {itemTypeDisplay.label}
            </Badge>
          )}
          {isPopular && (
            <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 shadow-sm border-0">
              Popular
            </Badge>
          )}
          {isNew && (
            <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 shadow-sm border-0">
              New
            </Badge>
          )}
        </div>

        {/* Quick Edit Button (Top Right) */}
        {canEdit && (
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 text-black hover:bg-white shadow-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
        )}

        {/* Unavailable Overlay */}
        {!item.available && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
            <span className="text-white text-xs font-bold uppercase tracking-wider border-2 border-white px-2 py-0.5 rounded-md transform -rotate-6">
              Unavailable
            </span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-3 flex flex-col flex-1">
        <div className="flex justify-between items-start gap-2">
           <h3 className="font-medium text-sm leading-tight text-foreground line-clamp-2" title={item.name}>
             {item.name}
           </h3>
        </div>
        
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {category?.name || "Uncategorized"}
        </p>

        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className={cn(
            "text-sm font-semibold",
             item.price === 0 ? "text-green-600" : "text-foreground"
          )}>
            {item.price > 0 ? formatPrice(item.price) : "Free"}
          </span>

          {/* Quick Toggle Status */}
          {canEdit && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                   className={cn(
                     "w-2 h-2 rounded-full cursor-pointer ring-4 ring-transparent hover:ring-muted transition-all",
                     item.available ? "bg-green-500" : "bg-red-400"
                   )}
                   onClick={(e) => {
                     e.stopPropagation();
                     toggleAvailability.mutate({ id: item.id, available: !item.available });
                   }}
                />
              </TooltipTrigger>
              <TooltipContent side="left">
                {item.available ? "Mark Unavailable" : "Mark Available"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
