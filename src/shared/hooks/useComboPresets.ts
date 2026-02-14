import { useQuery } from "@tanstack/react-query";
import { supabase, USE_MOCK_DATA } from "../lib/supabase";

export interface ComboPreset {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  main_dishes: string[];
  sauce_name: string | null;
  sauce_preparation: string | null;
  sauce_size: string | null;
  side_dish: string | null;
  extras: Array<{ name: string; quantity: number }> | null;
  price: number;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
}

// Mock presets for development
const mockPresets: ComboPreset[] = [
  {
    id: "preset-1",
    name: "The Classic",
    description: "Beef with Groundnut Sauce and Rice",
    image_url: null,
    main_dishes: ["Beef"],
    sauce_name: "Groundnut Sauce",
    sauce_preparation: null,
    sauce_size: "Regular",
    side_dish: "Rice",
    extras: null,
    price: 25000,
    is_popular: true,
    is_active: true,
    sort_order: 1,
  },
  {
    id: "preset-2",
    name: "Chicken Lover",
    description: "Chicken with Tomato Sauce and Chips",
    image_url: null,
    main_dishes: ["Chicken"],
    sauce_name: "Tomato Sauce",
    sauce_preparation: null,
    sauce_size: "Regular",
    side_dish: "Chips",
    extras: null,
    price: 28000,
    is_popular: true,
    is_active: true,
    sort_order: 2,
  },
  {
    id: "preset-3",
    name: "Mixed Grill",
    description: "Beef + Chicken with Mushroom Sauce",
    image_url: null,
    main_dishes: ["Beef", "Chicken"],
    sauce_name: "Mushroom Sauce",
    sauce_preparation: null,
    sauce_size: "Large",
    side_dish: "Rice",
    extras: null,
    price: 35000,
    is_popular: true,
    is_active: true,
    sort_order: 3,
  },
  {
    id: "preset-4",
    name: "Veggie Delight",
    description: "Vegetarian with Beans and Posho",
    image_url: null,
    main_dishes: ["Vegetables"],
    sauce_name: "Bean Stew",
    sauce_preparation: null,
    sauce_size: "Regular",
    side_dish: "Posho",
    extras: null,
    price: 18000,
    is_popular: false,
    is_active: true,
    sort_order: 4,
  },
];

/**
 * Hook to fetch all active combo presets
 */
export function useComboPresets() {
  return useQuery({
    queryKey: ["combo-presets"],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise((r) => setTimeout(r, 200));
        return mockPresets.filter((p) => p.is_active);
      }

      const { data, error } = await supabase
        .from("combo_presets")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as ComboPreset[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch popular combo presets only
 */
export function usePopularPresets() {
  return useQuery({
    queryKey: ["combo-presets", "popular"],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise((r) => setTimeout(r, 150));
        return mockPresets.filter((p) => p.is_active && p.is_popular);
      }

      const { data, error } = await supabase
        .from("combo_presets")
        .select("*")
        .eq("is_active", true)
        .eq("is_popular", true)
        .order("sort_order", { ascending: true })
        .limit(4);

      if (error) throw error;
      return data as ComboPreset[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
