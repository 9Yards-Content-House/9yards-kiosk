import { Edit2, Clock, Star, Sparkles, Image as ImageIcon } from "lucide-react";
import { 
  useToggleMenuItemAvailability,
  useToggleMenuItemPopular,
  useToggleMenuItemNew,
} from "@shared/hooks/useMenuMutations";
import { formatPrice, cn } from "@shared/lib/utils";
import { Switch } from "@shared/components/ui/switch";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type { MenuItem, Category } from "@shared/types/menu";

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_100px_120px_100px] gap-2 md:gap-4 items-center px-4 py-3 border-b hover:bg-muted/30 transition-colors">
      {/* Item info */}
      <div className="flex items-center gap-3">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-12 h-12 rounded-lg object-cover border"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center border">
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{item.name}</p>
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
          <p className="text-xs text-muted-foreground line-clamp-1">
            {item.description}
          </p>
          {isScheduled && (
            <div className="flex items-center gap-1 text-xs text-amber-600 mt-0.5">
              <Clock className="w-3 h-3" />
              Scheduled
            </div>
          )}
        </div>
      </div>

      {/* Category */}
      <span className="text-sm text-muted-foreground">
        {category?.name || "—"}
      </span>

      {/* Price */}
      <span className={cn(
        "text-sm font-medium",
        item.price === 0 && "text-green-600"
      )}>
        {item.price > 0 ? formatPrice(item.price) : "Free"}
      </span>

      {/* Badges */}
      <div className="flex items-center gap-1">
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

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Switch
          checked={item.available}
          onCheckedChange={() => toggleAvailability.mutate({ id: item.id, available: !item.available })}
          disabled={!canEdit || toggleAvailability.isPending}
        />
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="h-8 w-8"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
