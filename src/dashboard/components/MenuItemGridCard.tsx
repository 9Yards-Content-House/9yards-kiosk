import { Edit2, Image as ImageIcon, Package, Layers } from "lucide-react";
import { 
  useToggleMenuItemAvailability,
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

interface MenuItemGridCardProps {
  item: MenuItem;
  category?: Category;
  canEdit: boolean;
  onEdit: () => void;
}

export default function MenuItemGridCard({ item, category, canEdit, onEdit }: MenuItemGridCardProps) {
  const toggleAvailability = useToggleMenuItemAvailability();
  const itemTypeDisplay = getItemTypeDisplay(item.item_type);

  return (
    <div 
      onClick={() => canEdit && onEdit()}
      className={cn(
        "group bg-card rounded-xl border overflow-hidden transition-all hover:shadow-md flex flex-col",
        canEdit && "cursor-pointer hover:border-primary/30",
        !item.available && "opacity-75"
      )}
    >
      {/* ── Image ────────────────────────────────────────────────── */}
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
            <ImageIcon className="w-10 h-10" />
          </div>
        )}

        {/* Top-left: Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[75%]">
          {itemTypeDisplay && (
            <Badge className={cn("text-[10px] px-1.5 py-0.5 shadow-sm border-0", itemTypeDisplay.color)}>
              {itemTypeDisplay.label}
            </Badge>
          )}
          {item.is_popular && (
            <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 shadow-sm border-0">
              Popular
            </Badge>
          )}
          {item.is_new && (
            <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 shadow-sm border-0">
              New
            </Badge>
          )}
        </div>

        {/* Top-right: Edit button */}
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

        {/* Unavailable overlay */}
        {!item.available && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
            <span className="text-white text-xs font-bold uppercase tracking-wider border-2 border-white px-2 py-0.5 rounded-md transform -rotate-6">
              Unavailable
            </span>
          </div>
        )}
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="p-3 flex flex-col flex-1 border-t">
        <h3 className="font-medium text-sm leading-tight text-foreground line-clamp-2" title={item.name}>
          {item.name}
        </h3>
        
        {/* Category chip */}
        <div className="mt-1.5">
          <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            {category?.name || "Uncategorized"}
          </span>
        </div>

        {/* Price + Status row */}
        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <span className={cn(
            "text-sm font-semibold",
            item.price === 0 && item.item_type === 'combo_component' ? "text-blue-600" :
            item.price === 0 ? "text-green-600" : "text-foreground"
          )}>
            {item.price > 0
              ? formatPrice(item.price)
              : item.item_type === 'combo_component'
                ? "Combo Only"
                : "Free"}
          </span>

          {/* Status pill */}
          {canEdit ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border transition-colors cursor-pointer select-none",
                    item.available
                      ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                      : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAvailability.mutate({ id: item.id, available: !item.available });
                  }}
                >
                  {item.available ? "Active" : "Off"}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {item.available ? "Mark Unavailable" : "Mark Available"}
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className={cn(
              "text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border",
              item.available
                ? "bg-green-100 text-green-700 border-green-200"
                : "bg-gray-100 text-gray-500 border-gray-200"
            )}>
              {item.available ? "Active" : "Off"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
