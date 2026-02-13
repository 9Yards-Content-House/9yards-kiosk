import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  ArrowLeft,
  Heart,
  Plus,
  Minus,
  Flame,
  ShoppingCart,
} from 'lucide-react';
import { useTranslation } from '@shared/context/LanguageContext';
import { useCategories, useAllMenuItems } from '@shared/hooks/useMenu';
import { useKioskCart } from '../context/KioskCartContext';
import { MenuItem } from '@shared/types';
import { cn, formatPrice, vibrate } from '@shared/lib/utils';
import { Button } from '@shared/components/ui/button';
import OptimizedImage from '@shared/components/OptimizedImage';
import ComboBuilderNew from '../components/ComboBuilderNew';
import CartBar from '../components/CartBar';
import { useFavorites } from '../context/FavoritesContext';
import { useSound } from '../hooks/useSound';

// Category type for the menu
export type Category = 'all' | 'lusaniya' | 'main' | 'sauce' | 'juice' | 'dessert' | 'side';

// Category configuration matching main website
const categoryConfig: Record<Category, { label: string }> = {
  all: { label: 'All Items' },
  lusaniya: { label: 'Lusaniya' },
  main: { label: 'Main Dishes' },
  sauce: { label: 'Sauces' },
  juice: { label: 'Juices' },
  dessert: { label: 'Desserts' },
  side: { label: 'Sides' },
};

// Map category slugs to Category type
const slugToCategoryType: Record<string, Category> = {
  lusaniya: 'lusaniya',
  'main-dishes': 'main',
  sauces: 'sauce',
  juices: 'juice',
  desserts: 'dessert',
  'side-dishes': 'side',
};

export default function MenuNew() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: categories = [] } = useCategories();
  const { data: allItems = [] } = useAllMenuItems();
  const { addItem, itemCount, subtotal, items: cartItems, removeItem, updateQuantity } = useKioskCart();
  const { play } = useSound();

  // Get quantity in cart for a given item name
  const getCartQuantity = useCallback((itemName: string) => {
    return cartItems.filter(ci => 
      ci.sauceName === itemName || ci.label === itemName
    ).reduce((sum, ci) => sum + ci.quantity, 0);
  }, [cartItems]);

  // Get cart item ID by name
  const getCartItemId = useCallback((itemName: string) => {
    const item = cartItems.find(ci => ci.sauceName === itemName || ci.label === itemName);
    return item?.id || null;
  }, [cartItems]);
  const { favorites, toggleFavorite } = useFavorites();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [comboBuilderOpen, setComboBuilderOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);

  // Handle sticky header
  useEffect(() => {
    const handleScroll = () => {
      if (stickyRef.current) {
        setIsSticky(window.scrollY > 200);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Process menu items into normalized format matching main website
  const processedItems = useMemo(() => {
    return allItems.map((item) => {
      const category = categories.find((c) => c.id === item.category_id);
      const categoryType = category ? slugToCategoryType[category.slug] || 'main' : 'main';

      return {
        id: item.id,
        name: item.name,
        image: item.image_url,
        price: item.sizes?.[0]?.price || item.price || null,
        category: category?.name || '',
        categoryType,
        available: item.available,
        isFree: categoryType === 'main' || categoryType === 'side',
        description: item.description,
        isIndividual: categoryType === 'lusaniya' || categoryType === 'juice' || categoryType === 'dessert',
        isPopular: item.is_popular,
        isNew: item.is_new,
        originalItem: item,
      };
    });
  }, [allItems, categories]);

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<Category, number> = {
      all: processedItems.filter((i) => i.available).length,
      lusaniya: 0,
      main: 0,
      sauce: 0,
      juice: 0,
      dessert: 0,
      side: 0,
    };

    processedItems
      .filter((i) => i.available)
      .forEach((item) => {
        if (item.categoryType in counts) {
          counts[item.categoryType as Category]++;
        }
      });

    return counts;
  }, [processedItems]);

  // Filter items based on search and category
  const filteredItems = useMemo(() => {
    let items = processedItems.filter((item) => item.available);

    // Category filter
    if (activeCategory !== 'all') {
      items = items.filter((item) => item.categoryType === activeCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
      );
    }

    return items;
  }, [processedItems, activeCategory, searchQuery]);

  // Scroll to item when highlighting
  useEffect(() => {
    if (highlightedItemId) {
      const element = document.querySelector(`[data-item-id="${highlightedItemId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const timer = setTimeout(() => setHighlightedItemId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedItemId]);

  // Handle adding individual items to cart
  const handleAddToCart = useCallback(
    (item: typeof processedItems[0]) => {
      vibrate([30, 30]);
      play('add');
      const existingCartItem = cartItems.find(ci => ci.sauceName === item.name || ci.label === item.name);
      
      if (existingCartItem) {
        // Increment quantity
        updateQuantity(existingCartItem.id, existingCartItem.quantity + 1);
      } else {
        // Add new item
        addItem({
          id: crypto.randomUUID(),
          type: 'single',
          sauceName: item.name,
          saucePreparation: '',
          sauceSize: '',
          mainDishes: [],
          sideDish: '',
          extras: [],
          quantity: 1,
          unitPrice: item.price || 0,
          label: item.name,
        });
      }
    },
    [addItem, updateQuantity, cartItems, play]
  );

  // Handle removing individual items from cart
  const handleRemoveFromCart = useCallback(
    (item: typeof processedItems[0]) => {
      vibrate([30]);
      play('remove');
      const existingCartItem = cartItems.find(ci => ci.sauceName === item.name || ci.label === item.name);
      
      if (existingCartItem) {
        if (existingCartItem.quantity > 1) {
          updateQuantity(existingCartItem.id, existingCartItem.quantity - 1);
        } else {
          removeItem(existingCartItem.id);
        }
      }
    },
    [updateQuantity, removeItem, cartItems, play]
  );

  // Handle starting combo builder
  const handleStartCombo = useCallback(() => {
    vibrate();
    play('select');
    setComboBuilderOpen(true);
  }, [play]);

  const handleCloseComboBuilder = useCallback(() => {
    setComboBuilderOpen(false);
  }, []);

  const handleCategoryChange = useCallback((category: Category) => {
    vibrate();
    play('tap');
    setActiveCategory(category);
    // Scroll to top of menu grid
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [play]);

  const handleToggleFavorite = useCallback(
    (id: string) => {
      vibrate();
      play('select');
      toggleFavorite(id);
    },
    [toggleFavorite, play]
  );

  // Get price display for an item
  const getPriceDisplay = useCallback((item: typeof processedItems[0]) => {
    if (item.isFree) {
      return (
        <span className="inline-flex items-center gap-1 text-green-600 font-semibold text-sm">
          FREE
        </span>
      );
    }
    if (item.price) {
      if (item.categoryType === 'sauce') {
        return (
          <span className="text-[#E6411C] font-bold text-base">
            {formatPrice(item.price)}
          </span>
        );
      }
      if (item.categoryType === 'juice' || item.categoryType === 'dessert') {
        return (
          <span className="text-[#E6411C] font-bold text-base">
            {formatPrice(item.price)}
          </span>
        );
      }
      return (
        <span className="text-[#E6411C] font-extrabold text-lg">
          {formatPrice(item.price)}
        </span>
      );
    }
    return (
      <span className="text-muted-foreground font-medium text-sm italic">
        Part of Combo
      </span>
    );
  }, []);

  // Get category label for card
  const getCategoryLabel = useCallback((item: typeof processedItems[0]) => {
    switch (item.categoryType) {
      case 'lusaniya':
        return 'Signature';
      case 'main':
        return 'Combo Base';
      case 'sauce':
        return 'Combo Protein';
      case 'juice':
        return 'Add-on';
      case 'dessert':
        return 'Add-on';
      case 'side':
        return 'Included Side';
      default:
        return item.category;
    }
  }, []);

  return (
    <div className="kiosk-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Hero Section - Primary Blue Background */}
      <div className="bg-[#212282] text-white py-6 px-4 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/')}
            aria-label={t('common.back')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img
            src="/images/logo/9yards-logo-white.png"
            alt="9Yards Food"
            className="h-8 w-auto"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Discover Authentic Ugandan Flavors
        </h1>
        <p className="text-white/80 text-sm md:text-base">
          Fresh ingredients, traditional recipes, unforgettable taste
        </p>
      </div>

      {/* Sticky Search & Category Bar */}
      <div
        ref={stickyRef}
        className={cn(
          'bg-white border-b z-20 transition-shadow',
          isSticky && 'shadow-md'
        )}
      >
        {/* Search Bar */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menu items..."
              className="w-full h-12 pl-12 pr-12 text-base rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#212282]/30 focus:border-[#212282] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 active:scale-95 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-2 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {(Object.keys(categoryConfig) as Category[]).map((category) => {
              const config = categoryConfig[category];
              const count = categoryCounts[category];
              const isActive = activeCategory === category;

              // Skip categories with no items (except 'all')
              if (category !== 'all' && count === 0) return null;

              return (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={cn(
                    'shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all',
                    isActive
                      ? 'bg-[#E6411C] text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-200'
                  )}
                >
                  {config.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-semibold',
                        isActive ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-500'
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-24">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-8">
            <Search className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('menu.noResults')}</h3>
            <p className="text-muted-foreground text-base">
              Try a different search term or category
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="mt-4 h-12 px-6 rounded-full"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(index * 0.02, 0.2) }}
                >
                  <MenuItemCard
                    item={item}
                    onAddToOrder={handleStartCombo}
                    onAddToCart={() => handleAddToCart(item)}
                    onRemoveFromCart={() => handleRemoveFromCart(item)}
                    onToggleFavorite={handleToggleFavorite}
                    isFavorite={favorites.includes(item.id)}
                    isHighlighted={highlightedItemId === item.id}
                    getPriceDisplay={getPriceDisplay}
                    getCategoryLabel={getCategoryLabel}
                    cartQuantity={getCartQuantity(item.name)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Cart Bar */}
      {itemCount > 0 && (
        <CartBar itemCount={itemCount} total={subtotal} onClick={() => navigate('/cart')} />
      )}

      {/* Combo Builder Modal */}
      <ComboBuilderNew open={comboBuilderOpen} onClose={handleCloseComboBuilder} />
    </div>
  );
}

// ==================== Menu Item Card Component ====================
// Replicates MenuItemCard from main website exactly

interface ProcessedItem {
  id: string;
  name: string;
  image: string;
  price: number | null;
  category: string;
  categoryType: Category;
  available: boolean;
  isFree?: boolean;
  description?: string;
  isIndividual?: boolean;
  isPopular?: boolean;
  isNew?: boolean;
  originalItem: MenuItem;
}

interface MenuItemCardProps {
  item: ProcessedItem;
  onAddToOrder: () => void;
  onAddToCart?: () => void;
  onRemoveFromCart?: () => void;
  onToggleFavorite: (id: string) => void;
  isFavorite: boolean;
  isHighlighted?: boolean;
  getPriceDisplay: (item: ProcessedItem) => React.ReactNode;
  getCategoryLabel: (item: ProcessedItem) => string;
  cartQuantity?: number;
}

function MenuItemCard({
  item,
  onAddToOrder,
  onAddToCart,
  onRemoveFromCart,
  onToggleFavorite,
  isFavorite,
  isHighlighted,
  getPriceDisplay,
  getCategoryLabel,
  cartQuantity = 0,
}: MenuItemCardProps) {
  const isIndividual =
    item.isIndividual ||
    item.categoryType === 'lusaniya' ||
    item.categoryType === 'juice' ||
    item.categoryType === 'dessert';

  // Handle main card click
  const handleCardClick = () => {
    if (!item.available) return;
    if (isIndividual && onAddToCart) {
      onAddToCart();
    } else if (!isIndividual) {
      onAddToOrder();
    }
  };

  return (
    <div
      data-item-id={item.id}
      role="button"
      tabIndex={item.available ? 0 : -1}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      aria-label={`${item.name}${!item.available ? ' - Sold out' : isIndividual ? ' - Add to order' : ' - Start combo'}`}
      aria-disabled={!item.available}
      className={cn(
        'group relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-[#E6411C]/50 hover:bg-[#E6411C]/5 active:scale-[0.98]',
        'transition-all duration-200 flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6411C] focus-visible:ring-offset-2',
        item.available ? 'cursor-pointer' : 'cursor-not-allowed',
        isHighlighted && 'ring-4 ring-[#E6411C] ring-offset-2 animate-pulse',
        !item.available && 'opacity-60'
      )}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <OptimizedImage
          src={item.image}
          alt={item.name}
          aspectRatio="4/3"
          className={cn('w-full h-full object-cover', !item.available && 'grayscale')}
        />

        {/* Sold out overlay */}
        {!item.available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-black/70 text-white text-sm font-bold px-4 py-2 rounded-full border border-white/20">
              Sold Out
            </span>
          </div>
        )}

        {/* Badge - Top Left */}
        <div className="absolute top-2.5 left-2.5">
          {item.available && item.isPopular && (
            <span className="bg-[#E6411C] text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <Flame className="w-3 h-3" aria-hidden="true" />
              Popular
            </span>
          )}
          {item.available && item.isNew && !item.isPopular && (
            <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
              New
            </span>
          )}
          {item.isFree && item.available && !item.isPopular && !item.isNew && (
            <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
              FREE
            </span>
          )}
        </div>

        {/* Favorite Button - Top Right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(item.id);
          }}
          className="absolute top-2 right-2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6411C] focus-visible:ring-offset-2"
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        >
          <Heart
            className={cn(
              'w-4 h-4 transition-colors',
              isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-500'
            )}
            aria-hidden="true"
          />
        </button>

        {/* Tap indicator on hover - non-Individual items */}
        {item.available && !isIndividual && (
          <div
            className="absolute inset-0 bg-[#E6411C]/0 group-hover:bg-[#E6411C]/10 transition-colors flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#E6411C] text-white text-xs font-semibold px-3 py-1.5 rounded-full hidden md:flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Start Combo
            </span>
          </div>
        )}

        {/* Tap indicator on hover - Individual items */}
        {item.available && isIndividual && (
          <div
            className="absolute inset-0 bg-[#E6411C]/0 group-hover:bg-[#E6411C]/10 transition-colors flex items-center justify-center"
            aria-hidden="true"
          >
            <span className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold px-3 py-1.5 rounded-full hidden md:flex items-center gap-1.5",
              cartQuantity > 0 ? "bg-green-500 text-white" : "bg-[#E6411C] text-white"
            )}>
              {cartQuantity > 0 ? (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  In Order
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Add to Order
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 md:p-4 flex flex-col flex-1">
        {/* Category tag */}
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
          {getCategoryLabel(item)}
        </span>

        {/* Name */}
        <h3 className="font-bold text-foreground text-sm md:text-base leading-tight mb-0.5 line-clamp-1">
          {item.name}
        </h3>

        {/* Description */}
        <p className="text-gray-600 text-xs md:text-sm line-clamp-1 mb-2">
          {item.description || item.category}
        </p>

        {/* Price Row */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
          {getPriceDisplay(item)}

          {/* Add to Cart button / Quantity Stepper for Individual items */}
          {item.available && isIndividual && onAddToCart && (
            cartQuantity > 0 ? (
              // Show quantity stepper when item is in cart
              <div className="flex items-center gap-1.5 bg-[#E6411C]/10 rounded-full px-1.5 py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFromCart?.();
                  }}
                  className="w-7 h-7 flex items-center justify-center bg-white text-[#E6411C] rounded-full shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-bold w-5 text-center text-[#212282]">
                  {cartQuantity}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart();
                  }}
                  className="w-7 h-7 flex items-center justify-center bg-[#E6411C] text-white rounded-full shadow-sm hover:bg-[#d13a18] active:scale-95 transition-all"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              // Show "Add to Order" when not in cart
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart();
                }}
                className="text-xs font-bold px-3 py-2 rounded-full transition-all bg-[#E6411C] hover:bg-[#E6411C]/90 text-white hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#E6411C] focus-visible:ring-offset-2"
              >
                Add to Order
              </button>
            )
          )}

          {/* Visual indicator for tappable - non-Individual items */}
          {item.available && !isIndividual && (
            <span className="text-[#E6411C] font-semibold text-[10px] md:text-xs flex items-center gap-1 md:hidden">
              Build Combo
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
