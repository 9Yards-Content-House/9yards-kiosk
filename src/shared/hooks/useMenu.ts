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
  { id: "item-1", category_id: "cat-1", name: "G-Nuts", description: "Rich, velvety groundnut paste simmered with traditional spices", price: 15000, image_url: "/images/menu/sauces/9Yards-G-Nuts-Menu.jpg", available: true, preparations: [], sizes: [{ name: "Regular", price: 15000 }], sort_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-2", category_id: "cat-1", name: "Chicken Stew", description: "Tender chicken slow-cooked in a rich tomato and onion gravy", price: 20000, image_url: "/images/menu/sauces/9Yards-Chicken-Stew-Menu.jpg", available: true, preparations: [{ name: "Fried", priceModifier: 0 }, { name: "Boiled", priceModifier: 0 }, { name: "Grilled", priceModifier: 0 }], sizes: [{ name: "Regular", price: 20000 }, { name: "Half-Chicken", price: 38000 }, { name: "Full Chicken", price: 58000 }], sort_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-3", category_id: "cat-1", name: "Beef Stew", description: "Melt-in-your-mouth beef chunks in a hearty, seasoned gravy", price: 20000, image_url: "/images/menu/sauces/9Yards-Beef-Stew-Menu.jpg", available: true, preparations: [{ name: "Fried", priceModifier: 0 }, { name: "Boiled", priceModifier: 0 }], sizes: [{ name: "Regular", price: 20000 }], sort_order: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-14", category_id: "cat-1", name: "Fish", description: "Fresh tilapia, golden-fried or expertly smoked to perfection", price: 20000, image_url: "/images/menu/sauces/9Yards-Fresh-Fish-Menu.jpg", available: true, preparations: [{ name: "Fried", priceModifier: 0 }, { name: "Smoked", priceModifier: 0 }, { name: "Boiled", priceModifier: 0 }], sizes: [{ name: "Regular", price: 20000 }], sort_order: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-15", category_id: "cat-1", name: "Cowpeas", description: "Creamy cowpeas slow-cooked in aromatic local spices", price: 15000, image_url: "/images/menu/sauces/9Yards-cowpeas-Menu.jpg", available: true, preparations: [], sizes: [{ name: "Regular", price: 15000 }], sort_order: 5, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-16", category_id: "cat-1", name: "Liver", description: "Succulent pan-fried liver in a savory onion and herb gravy", price: 20000, image_url: "/images/menu/sauces/9Yards-Liver-Menu.jpg", available: true, preparations: [], sizes: [{ name: "Regular", price: 20000 }], sort_order: 6, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-17", category_id: "cat-1", name: "Fish & G-Nuts", description: "Crispy fish swimming in a luscious groundnut sauce", price: 20000, image_url: "/images/menu/sauces/9Yards-Fish-&-G-Nuts-Menu.jpg", available: true, preparations: [], sizes: [{ name: "Regular", price: 20000 }], sort_order: 7, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Main Dishes
  { id: "item-4", category_id: "cat-2", name: "Matooke", description: "Steamed green bananas mashed to silky perfection - Uganda's beloved staple", price: 0, image_url: "/images/menu/main-dishes/matooke.jpg", available: true, preparations: null, sizes: null, sort_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-5", category_id: "cat-2", name: "White Rice", description: "Fluffy, perfectly steamed long-grain rice", price: 0, image_url: "/images/menu/main-dishes/9yards-food-white-rice.jpg", available: true, preparations: null, sizes: null, sort_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-6", category_id: "cat-2", name: "Pilao", description: "Fragrant spiced rice cooked with aromatic herbs and spices", price: 0, image_url: "/images/menu/main-dishes/9yards-food-pilao.jpg", available: true, preparations: null, sizes: null, sort_order: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-18", category_id: "cat-2", name: "Posho", description: "Traditional maize meal, soft and smooth - perfect with any stew", price: 0, image_url: "/images/menu/main-dishes/9yards-food-posho.jpg", available: true, preparations: null, sizes: null, sort_order: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-19", category_id: "cat-2", name: "Cassava", description: "Tender boiled cassava, naturally sweet and satisfying", price: 0, image_url: "/images/menu/main-dishes/9yards-food-cassava.jpg", available: true, preparations: null, sizes: null, sort_order: 5, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Side Dishes
  { id: "item-7", category_id: "cat-3", name: "Cabbage", description: "Fresh sautéed cabbage with onions and mild spices", price: 0, image_url: "/images/menu/side-dish/9Yards-cabbage-Menu.jpg", available: true, preparations: null, sizes: null, sort_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-8", category_id: "cat-3", name: "Avocado", description: "Creamy ripe avocado - the perfect healthy addition", price: 0, image_url: "/images/menu/side-dish/9Yards-avocado-Menu.jpg", available: true, preparations: null, sizes: null, sort_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Lusaniya
  { id: "item-9", category_id: "cat-4", name: "Ordinary Lusaniya", description: "Our signature combo - aromatic pilao with your choice of protein and fresh kachumbari", price: 45000, image_url: "/images/menu/lusaniya/ordinary-lusaniya.jpg", available: true, preparations: null, sizes: null, sort_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-10", category_id: "cat-4", name: "Beef & Pilao Lusaniya", description: "Generous tender beef over spiced pilao rice, topped with zesty kachumbari. Serves 2-3", price: 45000, image_url: "/images/menu/lusaniya/beef-&-pilao-lusaniya.jpg", available: true, preparations: null, sizes: null, sort_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-20", category_id: "cat-4", name: "Whole Chicken with Pilao Lusaniya", description: "A feast for sharing! Whole roasted chicken on fragrant pilao with fresh kachumbari. Serves 2-3", price: 45000, image_url: "/images/menu/lusaniya/whole-chicken-lusaniya.jpg", available: true, preparations: null, sizes: null, sort_order: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Juices
  { id: "item-11", category_id: "cat-5", name: "Passion Fruit Juice", description: "Tangy and refreshing with natural tropical sweetness", price: 5000, image_url: "/images/menu/juices/9yards-passion-fruit-juice-menu.jpg", available: true, preparations: null, sizes: null, sort_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-12", category_id: "cat-5", name: "Mango Juice", description: "Sweet, smooth, and bursting with tropical mango flavor", price: 5000, image_url: "/images/menu/juices/9yards-mango-juice-menu.jpg", available: true, preparations: null, sizes: null, sort_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-21", category_id: "cat-5", name: "Watermelon Juice", description: "Light, refreshing, and naturally hydrating", price: 5000, image_url: "/images/menu/juices/9yards-watermelon-juice-menu.jpg", available: true, preparations: null, sizes: null, sort_order: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-22", category_id: "cat-5", name: "Pineapple Juice", description: "Sweet, tangy, and tropical. Fresh pineapple blended to perfection", price: 5000, image_url: "/images/menu/juices/9yards-pineapple-juice-menu.jpg", available: true, preparations: null, sizes: null, sort_order: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-23", category_id: "cat-5", name: "Beetroot Juice", description: "Pure beetroot juice. Earthy, naturally sweet, and incredibly nutritious", price: 5000, image_url: "/images/menu/juices/9yards-beetroot-juice-menu.jpg", available: true, preparations: null, sizes: null, sort_order: 5, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-24", category_id: "cat-5", name: "Cocktail Juice", description: "A refreshing blend of tropical fruits. The perfect mix of flavors in every sip", price: 5000, image_url: "/images/menu/juices/9yards-food-juice-cocktail.jpg", available: true, preparations: null, sizes: null, sort_order: 6, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Desserts
  { id: "item-13", category_id: "cat-6", name: "Chapati", description: "Soft, flaky flatbread - perfect for scooping up your favorite stews", price: 2000, image_url: "/images/menu/desserts/Chapati.jpg", available: true, preparations: null, sizes: null, sort_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "item-25", category_id: "cat-6", name: "Samosa", description: "Crispy golden pastry filled with spiced meat or vegetables", price: 1000, image_url: "/images/menu/desserts/Samosa.jpg", available: true, preparations: null, sizes: null, sort_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
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
