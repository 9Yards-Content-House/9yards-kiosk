import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import type { MenuItem, SaucePreparation, SauceSize } from "@shared/types/menu";

// In-memory store for mock mode menu items (references useMenu.ts mock data)
// This is a simple demo - when connected to Supabase, the real DB will handle this
let mockMenuItems: MenuItem[] = [];

interface CreateMenuItemPayload {
  name: string;
  description: string;
  price: number;
  category_id: string;
  image_url: string;
  available: boolean;
  sort_order: number;
  is_popular?: boolean;
  is_new?: boolean;
  preparations?: SaucePreparation[] | null;
  sizes?: SauceSize[] | null;
}

interface UpdateMenuItemPayload extends Partial<CreateMenuItemPayload> {
  is_popular?: boolean;
  is_new?: boolean;
  preparations?: SaucePreparation[] | null;
  sizes?: SauceSize[] | null;
}

/** Create a new menu item */
export function useCreateMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateMenuItemPayload) => {
      if (USE_MOCK_DATA) {
        const newItem: MenuItem = {
          id: `item-${Date.now()}`,
          ...payload,
          preparations: null,
          sizes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        mockMenuItems.push(newItem);
        console.log("📦 Mock: Created menu item:", newItem.name);
        return newItem;
      }

      const { data, error } = await supabase
        .from("menu_items")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu_items"] });
      queryClient.invalidateQueries({ queryKey: ["grouped_menu"] });
    },
  });
}

/** Update an existing menu item */
export function useUpdateMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & UpdateMenuItemPayload) => {
      if (USE_MOCK_DATA) {
        // Find in mock store and update
        const item = mockMenuItems.find(i => i.id === id);
        if (item) {
          Object.assign(item, updates, { updated_at: new Date().toISOString() });
        }
        console.log("📦 Mock: Updated menu item:", id);
        return item;
      }

      const { data, error } = await supabase
        .from("menu_items")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu_items"] });
      queryClient.invalidateQueries({ queryKey: ["grouped_menu"] });
    },
  });
}

/** Toggle menu item availability */
export function useToggleMenuItemAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, available }: { id: string; available: boolean }) => {
      if (USE_MOCK_DATA) {
        const item = mockMenuItems.find(i => i.id === id);
        if (item) {
          item.available = available;
        }
        console.log(`📦 Mock: Toggled item ${id} availability to: ${available}`);
        return;
      }

      const { error } = await supabase
        .from("menu_items")
        .update({ available, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu_items"] });
      queryClient.invalidateQueries({ queryKey: ["grouped_menu"] });
    },
  });
}

/** Toggle popular badge */
export function useToggleMenuItemPopular() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_popular }: { id: string; is_popular: boolean }) => {
      if (USE_MOCK_DATA) {
        console.log(`📦 Mock: Toggled item ${id} popular flag to: ${is_popular}`);
        return;
      }

      const { error } = await supabase
        .from("menu_items")
        .update({ is_popular })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu_items"] });
    },
  });
}

/** Toggle new badge */
export function useToggleMenuItemNew() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_new }: { id: string; is_new: boolean }) => {
      if (USE_MOCK_DATA) {
        console.log(`📦 Mock: Toggled item ${id} new flag to: ${is_new}`);
        return;
      }

      const { error } = await supabase
        .from("menu_items")
        .update({ is_new })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu_items"] });
    },
  });
}

/** Delete a menu item */
export function useDeleteMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (USE_MOCK_DATA) {
        mockMenuItems = mockMenuItems.filter(i => i.id !== id);
        console.log(`📦 Mock: Deleted menu item ${id}`);
        return;
      }

      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu_items"] });
      queryClient.invalidateQueries({ queryKey: ["grouped_menu"] });
    },
  });
}

/** Fetch a single menu item by ID (for edit page) */
export function useMenuItem(id: string | null) {
  const queryClient = useQueryClient();

  return {
    fetch: async () => {
      if (!id || id === "new") return null;
      
      if (USE_MOCK_DATA) {
        return mockMenuItems.find(i => i.id === id) || null;
      }

      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("id", id)
        .single();

      if (error) return null;
      return data;
    },
  };
}
