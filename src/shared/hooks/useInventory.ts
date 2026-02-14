import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, USE_MOCK_DATA } from "../lib/supabase";

export interface InventoryItem {
  id: string;
  menu_item_id: string;
  quantity_available: number;
  low_stock_threshold: number;
  auto_disable: boolean;
  last_restocked_at: string | null;
  menu_item?: {
    name: string;
    image_url: string | null;
    category_id: string;
  };
}

// Mock inventory data
const mockInventory: InventoryItem[] = [
  {
    id: "inv-1",
    menu_item_id: "item-1",
    quantity_available: 25,
    low_stock_threshold: 10,
    auto_disable: true,
    last_restocked_at: new Date().toISOString(),
    menu_item: { name: "Beef", image_url: null, category_id: "cat-1" },
  },
  {
    id: "inv-2",
    menu_item_id: "item-2",
    quantity_available: 5,
    low_stock_threshold: 10,
    auto_disable: true,
    last_restocked_at: new Date().toISOString(),
    menu_item: { name: "Chicken", image_url: null, category_id: "cat-1" },
  },
  {
    id: "inv-3",
    menu_item_id: "item-3",
    quantity_available: 0,
    low_stock_threshold: 5,
    auto_disable: true,
    last_restocked_at: null,
    menu_item: { name: "Fish", image_url: null, category_id: "cat-1" },
  },
];

/**
 * Hook to fetch all inventory items
 */
export function useInventory() {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return mockInventory;
      }

      const { data, error } = await supabase
        .from("inventory")
        .select("*, menu_item:menu_items(name, image_url, category_id)")
        .order("quantity_available", { ascending: true });

      if (error) throw error;
      return data as InventoryItem[];
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch low stock items
 */
export function useLowStockItems() {
  return useQuery({
    queryKey: ["inventory", "low-stock"],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return mockInventory.filter(
          (item) => item.quantity_available <= item.low_stock_threshold
        );
      }

      const { data, error } = await supabase
        .from("inventory")
        .select("*, menu_item:menu_items(name, image_url, category_id)")
        .filter("quantity_available", "lte", "low_stock_threshold")
        .order("quantity_available", { ascending: true });

      if (error) throw error;
      return data as InventoryItem[];
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to update inventory quantity
 */
export function useUpdateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      quantity,
    }: {
      id: string;
      quantity: number;
    }) => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { id, quantity };
      }

      const { data, error } = await supabase
        .from("inventory")
        .update({
          quantity_available: quantity,
          last_restocked_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

/**
 * Hook to restock an item
 */
export function useRestockItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      addQuantity,
    }: {
      id: string;
      addQuantity: number;
    }) => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { id, addQuantity };
      }

      // First get current quantity
      const { data: current, error: fetchError } = await supabase
        .from("inventory")
        .select("quantity_available")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Then update with new quantity
      const { data, error } = await supabase
        .from("inventory")
        .update({
          quantity_available: current.quantity_available + addQuantity,
          last_restocked_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

/**
 * Check if an item is in stock
 */
export function isInStock(inventory: InventoryItem | undefined): boolean {
  if (!inventory) return true; // No inventory tracking = always available
  return inventory.quantity_available > 0;
}

/**
 * Check if an item is low stock
 */
export function isLowStock(inventory: InventoryItem | undefined): boolean {
  if (!inventory) return false;
  return inventory.quantity_available <= inventory.low_stock_threshold && inventory.quantity_available > 0;
}
