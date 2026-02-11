import { useQuery } from "@tanstack/react-query";
import { supabase } from "@shared/lib/supabase";
import type { Category, MenuItem, GroupedMenu } from "@shared/types/menu";

// Mock data for development/testing when Supabase has no data
const MOCK_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Sauces", slug: "sauces", sort_order: 1, created_at: new Date().toISOString() },
  { id: "cat-2", name: "Main Dishes", slug: "main-dishes", sort_order: 2, created_at: new Date().toISOString() },
  { id: "cat-3", name: "Side Dishes", slug: "side-dishes", sort_order: 3, created_at: new Date().toISOString() },
  { id: "cat-4", name: "Lusaniya", slug: "lusaniya", sort_order: 4, created_at: new Date().toISOString() },
  { id: "cat-5", name: "Juices", slug: "juices", sort_order: 5, created_at: new Date().toISOString() },
  { id: "cat-6", name: "Desserts", slug: "desserts", sort_order: 6, created_at: new Date().toISOString() },
];

const MOCK_MENU_ITEMS: MenuItem[] = [
  // Sauces
  { id: "item-1", category_id: "cat-1", name: "Groundnut Sauce", description: "Rich and creamy peanut sauce, a Ugandan classic", price: 15000, image_url: "", available: true, preparations: [{ name: "Mild", priceModifier: 0 }, { name: "Spicy", priceModifier: 0 }], sizes: [{ name: "Regular", price: 15000 }, { name: "Large", price: 22000 }], sort_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-2", category_id: "cat-1", name: "Chicken Stew", description: "Tender chicken in rich tomato-based sauce", price: 18000, image_url: "", available: true, preparations: null, sizes: [{ name: "Regular", price: 18000 }, { name: "Large", price: 25000 }], sort_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-3", category_id: "cat-1", name: "Beef Stew", description: "Slow-cooked beef in savory gravy", price: 20000, image_url: "", available: true, preparations: null, sizes: [{ name: "Regular", price: 20000 }, { name: "Large", price: 28000 }], sort_order: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Main Dishes
  { id: "item-4", category_id: "cat-2", name: "Posho", description: "Traditional Ugandan maize bread", price: 3000, image_url: "", available: true, preparations: null, sizes: null, sort_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-5", category_id: "cat-2", name: "Rice", description: "Steamed white rice", price: 4000, image_url: "", available: true, preparations: null, sizes: null, sort_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-6", category_id: "cat-2", name: "Matooke", description: "Steamed green bananas, mashed", price: 5000, image_url: "", available: true, preparations: null, sizes: null, sort_order: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Side Dishes
  { id: "item-7", category_id: "cat-3", name: "Greens (Sukuma)", description: "Sautéed collard greens", price: 3000, image_url: "", available: true, preparations: null, sizes: null, sort_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-8", category_id: "cat-3", name: "Beans", description: "Red kidney beans in light sauce", price: 4000, image_url: "", available: true, preparations: null, sizes: null, sort_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Lusaniya
  { id: "item-9", category_id: "cat-4", name: "Chicken Lusaniya", description: "Crispy fried chicken lusaniya wrap", price: 12000, image_url: "", available: true, preparations: null, sizes: null, sort_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-10", category_id: "cat-4", name: "Beef Lusaniya", description: "Seasoned beef in crispy lusaniya", price: 14000, image_url: "", available: true, preparations: null, sizes: null, sort_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Juices
  { id: "item-11", category_id: "cat-5", name: "Passion Fruit Juice", description: "Fresh squeezed passion fruit", price: 5000, image_url: "", available: true, preparations: null, sizes: null, sort_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-12", category_id: "cat-5", name: "Mango Juice", description: "Sweet mango juice", price: 5000, image_url: "", available: true, preparations: null, sizes: null, sort_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Desserts
  { id: "item-13", category_id: "cat-6", name: "Mandazi", description: "Sweet fried dough, 3 pieces", price: 3000, image_url: "", available: true, preparations: null, sizes: null, sort_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("sort_order");
        if (error) throw error;
        if (data && data.length > 0) return data;
        // Return mock data if empty
        console.log("📦 Using mock categories (no data in Supabase)");
        return MOCK_CATEGORIES;
      } catch (err) {
        console.warn("Failed to fetch categories, using mock data:", err);
        return MOCK_CATEGORIES;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMenuItems(categoryId?: string) {
  return useQuery<MenuItem[]>({
    queryKey: ["menu_items", categoryId],
    queryFn: async () => {
      try {
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
        if (data && data.length > 0) return data;
        // Return mock data if empty
        const mockItems = categoryId 
          ? MOCK_MENU_ITEMS.filter(i => i.category_id === categoryId)
          : MOCK_MENU_ITEMS;
        return mockItems;
      } catch (err) {
        console.warn("Failed to fetch menu items, using mock data:", err);
        const mockItems = categoryId 
          ? MOCK_MENU_ITEMS.filter(i => i.category_id === categoryId)
          : MOCK_MENU_ITEMS;
        return mockItems;
      }
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useAllMenuItems() {
  return useQuery<MenuItem[]>({
    queryKey: ["menu_items", "all"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("menu_items")
          .select("*, category:categories(*)")
          .order("sort_order");
        if (error) throw error;
        if (data && data.length > 0) return data;
        console.log("📦 Using mock menu items (no data in Supabase)");
        return MOCK_MENU_ITEMS;
      } catch (err) {
        console.warn("Failed to fetch all menu items, using mock data:", err);
        return MOCK_MENU_ITEMS;
      }
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useGroupedMenu() {
  return useQuery<GroupedMenu[]>({
    queryKey: ["grouped_menu"],
    queryFn: async () => {
      try {
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

        // Check if we have data
        if (categoriesRes.data.length > 0 && itemsRes.data.length > 0) {
          return categoriesRes.data.map((category) => ({
            category,
            items: itemsRes.data.filter((item) => item.category_id === category.id),
          }));
        }

        // Fall back to mock data
        console.log("📦 Using mock grouped menu (no data in Supabase)");
        return MOCK_CATEGORIES.map((category) => ({
          category,
          items: MOCK_MENU_ITEMS.filter((item) => item.category_id === category.id),
        }));
      } catch (err) {
        console.warn("Failed to fetch grouped menu, using mock data:", err);
        return MOCK_CATEGORIES.map((category) => ({
          category,
          items: MOCK_MENU_ITEMS.filter((item) => item.category_id === category.id),
        }));
      }
    },
    staleTime: 2 * 60 * 1000,
  });
}
