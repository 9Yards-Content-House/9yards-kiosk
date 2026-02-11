import { Edit2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@shared/lib/supabase";
import { formatPrice } from "@shared/lib/utils";
import { Switch } from "@shared/components/ui/switch";
import type { MenuItem, Category } from "@shared/types/menu";

interface MenuItemRowProps {
  item: MenuItem;
  category?: Category;
  canEdit: boolean;
  onEdit: () => void;
}

export default function MenuItemRow({ item, category, canEdit, onEdit }: MenuItemRowProps) {
  const queryClient = useQueryClient();

  const toggleAvailability = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("menu_items")
        .update({ available: !item.available, updated_at: new Date().toISOString() })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu_items"] });
    },
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_100px_80px_80px] gap-2 md:gap-4 items-center px-4 py-3 border-b hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3">
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-10 h-10 rounded-lg object-cover"
          />
        )}
        <div>
          <p className="font-medium">{item.name}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {item.description}
          </p>
        </div>
      </div>
      <span className="text-sm text-muted-foreground">
        {category?.name || "—"}
      </span>
      <span className="text-sm font-medium">
        {item.price > 0 ? formatPrice(item.price) : "Free"}
      </span>
      <div>
        <Switch
          checked={item.available}
          onCheckedChange={() => toggleAvailability.mutate()}
          disabled={!canEdit || toggleAvailability.isPending}
        />
      </div>
      <div>
        {canEdit && (
          <button
            onClick={onEdit}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
