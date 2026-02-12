/**
 * AI-Powered Recommendations Engine
 * 
 * Provides intelligent product recommendations based on:
 * - Time of day (breakfast, lunch, dinner patterns)
 * - Popular items (high order frequency)
 * - Frequently bought together (market basket analysis)
 * - User's current cart contents
 * - Seasonal/promotional items
 */

import type { MenuItem, Category } from "@shared/types";

// Time periods for different meal suggestions
type MealPeriod = "breakfast" | "lunch" | "afternoon" | "dinner" | "late-night";

// Recommendation types
export type RecommendationType = 
  | "time-based"
  | "popular"
  | "frequently-bought-together"
  | "upsell"
  | "cross-sell"
  | "combo-completion";

export interface Recommendation {
  item: MenuItem;
  type: RecommendationType;
  reason: string;
  confidence: number; // 0-1 score
  priority: number; // Higher = show first
}

export interface UpsellPrompt {
  triggerItemId: string;
  suggestedItem: MenuItem;
  promptText: string;
  discountPercent?: number;
}

// Map category IDs to meal periods when they're most popular
const MEAL_PERIOD_CATEGORIES: Record<MealPeriod, string[]> = {
  breakfast: ["juices", "desserts"], // Light items for morning
  lunch: ["main-dishes", "lusaniya", "side-dish", "sauces"],
  afternoon: ["juices", "desserts", "side-dish"],
  dinner: ["main-dishes", "lusaniya", "sauces", "side-dish"],
  "late-night": ["main-dishes", "juices"],
};

// Popular item boost - these categories tend to be ordered more
const POPULARITY_WEIGHTS: Record<string, number> = {
  "main-dishes": 1.5,
  "lusaniya": 1.4,
  "sauces": 1.2,
  "side-dish": 1.1,
  "juices": 1.3,
  "desserts": 1.0,
};

// Frequently bought together mappings (category-based for now)
// In production, this would be learned from order history
const COMMONLY_PAIRED: Record<string, string[]> = {
  "main-dishes": ["sauces", "side-dish", "juices"],
  "lusaniya": ["sauces", "juices", "desserts"],
  "side-dish": ["main-dishes", "sauces"],
  "sauces": ["main-dishes", "lusaniya", "side-dish"],
  "juices": ["main-dishes", "desserts"],
  "desserts": ["juices"],
};

// Upsell prompts for different scenarios
const UPSELL_PROMPTS: Record<string, string[]> = {
  "no-drink": [
    "Add a refreshing drink?",
    "Thirsty? Add a juice!",
    "Complete your meal with a drink",
  ],
  "no-side": [
    "Add a side dish?",
    "Try our delicious sides!",
    "Make it a complete meal",
  ],
  "small-order": [
    "Add something extra?",
    "Still hungry? Try these",
    "Customers also added",
  ],
  "no-dessert": [
    "Save room for dessert?",
    "Something sweet to finish?",
    "Treat yourself!",
  ],
};

/**
 * Determines the current meal period based on time of day
 */
export function getCurrentMealPeriod(): MealPeriod {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 14) return "lunch";
  if (hour >= 14 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "dinner";
  return "late-night";
}

/**
 * Get time-based greeting and suggestion
 */
export function getTimeBasedGreeting(): { greeting: string; suggestion: string } {
  const period = getCurrentMealPeriod();
  
  const greetings: Record<MealPeriod, { greeting: string; suggestion: string }> = {
    breakfast: {
      greeting: "Good Morning!",
      suggestion: "Start your day with something light and refreshing",
    },
    lunch: {
      greeting: "Ready for Lunch?",
      suggestion: "Try our most popular dishes",
    },
    afternoon: {
      greeting: "Afternoon Treat?",
      suggestion: "Perfect time for a snack or refreshment",
    },
    dinner: {
      greeting: "Dinner Time!",
      suggestion: "Explore our hearty main dishes",
    },
    "late-night": {
      greeting: "Late Night Craving?",
      suggestion: "Satisfy your hunger with these favorites",
    },
  };
  
  return greetings[period];
}

/**
 * Calculate recommendation score for an item
 */
function calculateItemScore(
  item: MenuItem,
  type: RecommendationType,
  cartItems: MenuItem[],
  categories: Category[]
): number {
  let score = 0.5; // Base score
  
  const category = categories.find(c => c.id === item.category_id);
  const categorySlug = category?.slug || "";
  
  // Time-based boost
  const mealPeriod = getCurrentMealPeriod();
  const relevantCategories = MEAL_PERIOD_CATEGORIES[mealPeriod];
  if (relevantCategories.includes(categorySlug)) {
    score += 0.2;
  }
  
  // Popularity weight
  const popWeight = POPULARITY_WEIGHTS[categorySlug] || 1.0;
  score *= popWeight;
  
  // If item is highlighted (popular/new), boost it
  if (item.is_popular || item.is_new) {
    score += 0.15;
  }
  
  // Availability check
  if (!item.available) {
    return 0;
  }
  
  // Reduce score if already in cart
  if (cartItems.some(ci => ci.id === item.id)) {
    score *= 0.3;
  }
  
  // Cross-sell boost if pairs well with cart items
  if (type === "cross-sell" || type === "frequently-bought-together") {
    const cartCategorySlugs = cartItems
      .map(ci => categories.find(c => c.id === ci.category_id)?.slug)
      .filter(Boolean) as string[];
    
    for (const cartCatSlug of cartCategorySlugs) {
      const pairs = COMMONLY_PAIRED[cartCatSlug] || [];
      if (pairs.includes(categorySlug)) {
        score += 0.25;
        break;
      }
    }
  }
  
  return Math.min(score, 1.0); // Cap at 1.0
}

/**
 * Get AI-powered recommendations for the current context
 */
export function getRecommendations(
  menuItems: MenuItem[],
  categories: Category[],
  cartItems: MenuItem[] = [],
  limit: number = 6
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const mealPeriod = getCurrentMealPeriod();
  const relevantCategories = MEAL_PERIOD_CATEGORIES[mealPeriod];
  
  // Time-based recommendations
  const timeBasedItems = menuItems.filter(item => {
    const cat = categories.find(c => c.id === item.category_id);
    return cat && relevantCategories.includes(cat.slug) && item.available;
  });
  
  for (const item of timeBasedItems.slice(0, 3)) {
    const score = calculateItemScore(item, "time-based", cartItems, categories);
    if (score > 0.4) {
      recommendations.push({
        item,
        type: "time-based",
        reason: `Perfect for ${mealPeriod}`,
        confidence: score,
        priority: score * 10,
      });
    }
  }
  
  // Popular items (explicitly flagged)
  const popularItems = menuItems.filter(item => (item.is_popular || item.is_new) && item.available);
  for (const item of popularItems.slice(0, 3)) {
    const score = calculateItemScore(item, "popular", cartItems, categories);
    if (score > 0.4 && !recommendations.some(r => r.item.id === item.id)) {
      recommendations.push({
        item,
        type: "popular",
        reason: "Customer favorite",
        confidence: score,
        priority: score * 9,
      });
    }
  }
  
  // Frequently bought together (if cart has items)
  if (cartItems.length > 0) {
    const cartCategorySlugs = cartItems
      .map(ci => categories.find(c => c.id === ci.category_id)?.slug)
      .filter(Boolean) as string[];
    
    const pairedCategorySlugs = new Set<string>();
    for (const slug of cartCategorySlugs) {
      const pairs = COMMONLY_PAIRED[slug] || [];
      pairs.forEach(p => pairedCategorySlugs.add(p));
    }
    
    const pairedItems = menuItems.filter(item => {
      const cat = categories.find(c => c.id === item.category_id);
      return cat && pairedCategorySlugs.has(cat.slug) && item.available;
    });
    
    for (const item of pairedItems.slice(0, 3)) {
      const score = calculateItemScore(item, "frequently-bought-together", cartItems, categories);
      if (score > 0.5 && !recommendations.some(r => r.item.id === item.id)) {
        recommendations.push({
          item,
          type: "frequently-bought-together",
          reason: "Goes great with your order",
          confidence: score,
          priority: score * 11, // Higher priority for cart-based recommendations
        });
      }
    }
  }
  
  // Sort by priority and return top items
  return recommendations
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}

/**
 * Get upsell suggestions based on cart contents
 */
export function getUpsellSuggestions(
  menuItems: MenuItem[],
  categories: Category[],
  cartItems: MenuItem[]
): UpsellPrompt[] {
  const prompts: UpsellPrompt[] = [];
  
  const cartCategorySlugs = cartItems
    .map(ci => categories.find(c => c.id === ci.category_id)?.slug)
    .filter(Boolean) as string[];
  
  // Check what's missing from the cart
  const hasDrink = cartCategorySlugs.includes("juices");
  const hasSide = cartCategorySlugs.includes("side-dish");
  const hasDessert = cartCategorySlugs.includes("desserts");
  const hasMain = cartCategorySlugs.includes("main-dishes") || cartCategorySlugs.includes("lusaniya");
  
  // Suggest a drink if missing
  if (!hasDrink && hasMain) {
    const drinks = menuItems.filter(item => {
      const cat = categories.find(c => c.id === item.category_id);
      return cat?.slug === "juices" && item.available;
    });
    
    if (drinks.length > 0) {
      const randomDrink = drinks[Math.floor(Math.random() * drinks.length)];
      const promptTexts = UPSELL_PROMPTS["no-drink"];
      prompts.push({
        triggerItemId: cartItems[0]?.id || "",
        suggestedItem: randomDrink,
        promptText: promptTexts[Math.floor(Math.random() * promptTexts.length)],
      });
    }
  }
  
  // Suggest a side if missing
  if (!hasSide && hasMain) {
    const sides = menuItems.filter(item => {
      const cat = categories.find(c => c.id === item.category_id);
      return cat?.slug === "side-dish" && item.available;
    });
    
    if (sides.length > 0) {
      const randomSide = sides[Math.floor(Math.random() * sides.length)];
      const promptTexts = UPSELL_PROMPTS["no-side"];
      prompts.push({
        triggerItemId: cartItems[0]?.id || "",
        suggestedItem: randomSide,
        promptText: promptTexts[Math.floor(Math.random() * promptTexts.length)],
      });
    }
  }
  
  // Suggest dessert if they have a main but no dessert
  if (!hasDessert && hasMain && cartItems.length >= 2) {
    const desserts = menuItems.filter(item => {
      const cat = categories.find(c => c.id === item.category_id);
      return cat?.slug === "desserts" && item.available;
    });
    
    if (desserts.length > 0) {
      const randomDessert = desserts[Math.floor(Math.random() * desserts.length)];
      const promptTexts = UPSELL_PROMPTS["no-dessert"];
      prompts.push({
        triggerItemId: cartItems[0]?.id || "",
        suggestedItem: randomDessert,
        promptText: promptTexts[Math.floor(Math.random() * promptTexts.length)],
      });
    }
  }
  
  return prompts;
}

/**
 * Get combo suggestions - help complete a meal
 */
export function getComboSuggestions(
  menuItems: MenuItem[],
  categories: Category[],
  cartItems: MenuItem[]
): { missing: string[]; suggestions: MenuItem[] } {
  const cartCategorySlugs = cartItems
    .map(ci => categories.find(c => c.id === ci.category_id)?.slug)
    .filter(Boolean) as string[];
  
  // A "complete meal" in this context = main + sauce + drink
  const idealCombo = ["main-dishes", "sauces", "juices"];
  const missing = idealCombo.filter(cat => !cartCategorySlugs.includes(cat));
  
  // Alternative: lusaniya replaces main-dishes
  if (cartCategorySlugs.includes("lusaniya")) {
    const idx = missing.indexOf("main-dishes");
    if (idx > -1) missing.splice(idx, 1);
  }
  
  const suggestions: MenuItem[] = [];
  
  for (const missingCat of missing) {
    const items = menuItems.filter(item => {
      const cat = categories.find(c => c.id === item.category_id);
      return cat?.slug === missingCat && item.available;
    });
    
    if (items.length > 0) {
      // Pick a highlighted item if available, otherwise first
      const featured = items.find(i => i.is_popular || i.is_new);
      suggestions.push(featured || items[0]);
    }
  }
  
  return { missing, suggestions };
}

/**
 * Calculate estimated wait time based on order complexity
 */
export function estimateWaitTime(cartItems: MenuItem[], queueLength: number = 0): number {
  // Base time per item type
  let totalMinutes = 5; // Base preparation time
  
  for (const item of cartItems) {
    // Main dishes take longer
    if (item.category_id?.includes("main") || item.category_id?.includes("lusaniya")) {
      totalMinutes += 3;
    } else if (item.category_id?.includes("sauce")) {
      totalMinutes += 1;
    } else {
      totalMinutes += 0.5;
    }
  }
  
  // Add queue time
  totalMinutes += queueLength * 3;
  
  return Math.ceil(totalMinutes);
}
