// Menu types — mirrors the Supabase DB schema

export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  available: boolean;
  preparations: SaucePreparation[] | null;
  sizes: SauceSize[] | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // New fields for kiosk enhancements
  is_popular?: boolean;
  is_new?: boolean;
  available_from?: string | null;
  available_until?: string | null;
  // Joined fields
  category?: Category;
}

export interface SaucePreparation {
  name: string;
  priceModifier: number;
}

export interface SauceSize {
  name: string;
  price: number;
}

// Category slugs for filtering
export type CategorySlug =
  | "main-dishes"
  | "sauces"
  | "side-dishes"
  | "lusaniya"
  | "juices"
  | "desserts";

// Grouped menu for display
export interface GroupedMenu {
  category: Category;
  items: MenuItem[];
}
