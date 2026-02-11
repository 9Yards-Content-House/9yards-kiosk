import { useQuery } from "@tanstack/react-query";
import { supabase } from "@shared/lib/supabase";
import type { Category, MenuItem, GroupedMenu } from "@shared/types/menu";

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMenuItems(categoryId?: string) {
  return useQuery<MenuItem[]>({
    queryKey: ["menu_items", categoryId],
    queryFn: async () => {
      let query = supabase
        .from("menu_items")
        .select("*, category:categories(*)")
        .eq("available", true)
        .order("sort_order");

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useAllMenuItems() {
  return useQuery<MenuItem[]>({
    queryKey: ["menu_items", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*, category:categories(*)")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useGroupedMenu() {
  return useQuery<GroupedMenu[]>({
    queryKey: ["grouped_menu"],
    queryFn: async () => {
      const [categoriesRes, itemsRes] = await Promise.all([
        supabase.from("categories").select("*").order("sort_order"),
        supabase
          .from("menu_items")
          .select("*, category:categories(*)")
          .eq("available", true)
          .order("sort_order"),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (itemsRes.error) throw itemsRes.error;

      return categoriesRes.data.map((category) => ({
        category,
        items: itemsRes.data.filter((item) => item.category_id === category.id),
      }));
    },
    staleTime: 2 * 60 * 1000,
  });
}
