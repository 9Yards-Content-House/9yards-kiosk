import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  ArrowLeft,
  Plus,
  Minus,
  Flame,
} from 'lucide-react';
import { useTranslation } from '@shared/context/LanguageContext';
import { useCategories, useAllMenuItems } from '@shared/hooks/useMenu';
import { useKioskCart } from '../context/KioskCartContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { MenuItem } from '@shared/types';
import { cn, formatPrice, vibrate } from '@shared/lib/utils';
import { Button } from '@shared/components/ui/button';
import OptimizedImage from '@shared/components/OptimizedImage';
import ComboBuilderNew from '../components/ComboBuilderNew';
import CartBar from '../components/CartBar';
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



// Map category slugs to Category type (for standalone items that need sub-categorization)
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
  const { vibrationEnabled } = useAccessibility();
  const { data: categories = [], error: categoriesError, isLoading: categoriesLoading } = useCategories();
  const { data: allItems = [], error: itemsError, isLoading: itemsLoading } = useAllMenuItems();
  const { addItem, itemCount, subtotal, items: cartItems, removeItem, updateQuantity } = useKioskCart();
  const { play } = useSound();

  // Get quantity in cart for a given item name
  const getCartQuantity = useCallback((itemName: string) => {
    return cartItems.filter(ci => 
      ci.sauceName === itemName || ci.label === itemName
    ).reduce((sum, ci) => sum + ci.quantity, 0);
  }, [cartItems]);


  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [comboBuilderOpen, setComboBuilderOpen] = useState(false);
  const [selectedSauce, setSelectedSauce] = useState<MenuItem | null>(null);
  const [selectedMainDishes, setSelectedMainDishes] = useState<string[]>([]);
  const [selectedSideDish, setSelectedSideDish] = useState<string>('');
  const [isSticky, setIsSticky] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);

  // Handle sticky header
  useEffect(() => {
    const handleScroll = () => {
      if (stickyRef.current) {
        setIsSticky(window.scrollY > 10);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Process menu items into normalized format matching main website
  const processedItems = useMemo(() => {
    return allItems.map((item) => {
      const category = categories.find((c) => c.id === item.category_id);
      // Use item_type for combo/standalone determination, category slug for display grouping
      const categoryType = category ? slugToCategoryType[category.slug] || 'main' : 'main';

      // Determine combo vs standalone using item_type field
      const isComboComponent = item.item_type === 'combo_component';
      const isComboDriver = item.item_type === 'combo_driver';
      const isStandalone = item.item_type === 'standalone' || !item.item_type;

      return {
        id: item.id,
        name: item.name,
        image: item.image_url,
        price: item.sizes?.[0]?.price || item.price || null,
        category: category?.name || '',
        categoryType,
        available: item.available,
        isComboComponent: isComboComponent || isComboDriver, // Both can start combos
        description: item.description,
        isIndividual: isStandalone,
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
      if (vibrationEnabled) {
        vibrate([30, 30]);
      }
      play('add');
      const existingCartItem = cartItems.find(ci => ci.type === 'single' && (ci.sauceName === item.name || ci.label === item.name));
      
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
    [addItem, updateQuantity, cartItems, play, vibrationEnabled]
  );

  // Handle removing individual items from cart
  const handleRemoveFromCart = useCallback(
    (item: typeof processedItems[0]) => {
      if (vibrationEnabled) {
        vibrate([30]);
      }
      play('remove');
      const existingCartItem = cartItems.find(ci => ci.type === 'single' && (ci.sauceName === item.name || ci.label === item.name));
      
      if (existingCartItem) {
        if (existingCartItem.quantity > 1) {
          updateQuantity(existingCartItem.id, existingCartItem.quantity - 1);
        } else {
          removeItem(existingCartItem.id);
        }
      }
    },
    [updateQuantity, removeItem, cartItems, play, vibrationEnabled]
  );

  // Handle starting combo builder
  const handleStartCombo = useCallback((item?: typeof processedItems[0]) => {
    if (vibrationEnabled) {
      vibrate();
    }
    play('select');

    // Reset all selections first
    setSelectedSauce(null);
    setSelectedMainDishes([]);
    setSelectedSideDish('');

    if (item?.originalItem) {
      const menuItem = item.originalItem;
      const category = categories.find((c) => c.id === menuItem.category_id);
      const categorySlug = category?.slug;

      // Pre-select based on item type and category
      if (menuItem.item_type === 'combo_driver') {
        // This is a sauce - pre-select it
        setSelectedSauce(menuItem);
      } else if (categorySlug === 'main-dishes') {
        // This is a main dish - pre-select it
        setSelectedMainDishes([menuItem.name]);
      } else if (categorySlug === 'side-dishes') {
        // This is a side dish - pre-select it
        setSelectedSideDish(menuItem.name);
      }
    }

    setComboBuilderOpen(true);
  }, [play, vibrationEnabled, categories]);

  const handleCloseComboBuilder = useCallback(() => {
    setComboBuilderOpen(false);
    // Reset all selections when closing
    setSelectedSauce(null);
    setSelectedMainDishes([]);
    setSelectedSideDish('');
  }, []);

  const handleCategoryChange = useCallback((category: Category) => {
    if (vibrationEnabled) {
      vibrate();
    }
    play('tap');
    setActiveCategory(category);
    // Scroll to top of menu grid
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [play, vibrationEnabled]);

  // Get price display for an item
  const getPriceDisplay = useCallback((item: typeof processedItems[0]) => {
    // Main dishes and sides are part of combo - show "Included" text
    if (item.categoryType === 'main' || item.categoryType === 'side') {
      return (
        <span className="text-muted-foreground font-medium text-sm">
          Included
        </span>
      );
    }
    if (item.price) {
      if (item.categoryType === 'sauce') {
        return (
          <span className="text-secondary font-bold text-base">
            {formatPrice(item.price)}
          </span>
        );
      }
      if (item.categoryType === 'juice' || item.categoryType === 'dessert') {
        return (
          <span className="text-secondary font-bold text-base">
            {formatPrice(item.price)}
          </span>
        );
      }
      return (
        <span className="text-secondary font-extrabold text-lg">
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

  // Show error state if data fetch failed
  if (categoriesError || itemsError) {
    return (
      <div className="kiosk-screen flex flex-col items-center justify-center bg-gray-50 p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Menu</h2>
          <p className="text-gray-600 mb-6">
            We're having trouble connecting to the server. Please try again.
          </p>
          <Button
            size="lg"
            onClick={() => window.location.reload()}
            className="bg-secondary hover:bg-secondary/90"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Show loading state
  const isLoading = categoriesLoading || itemsLoading;


  return (
    <div className="kiosk-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Compact Header - Back button and logo */}
      <div className="bg-white border-b px-4 md:px-6 py-4 md:py-5 flex items-center justify-between shrink-0">
        <button
          onClick={() => navigate('/')}
          aria-label={t('common.back')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <img
          src="/images/logo/9Yards-Food-White-Logo-colored.png"
          alt="9Yards Food"
          className="h-8 w-auto"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Sticky Search & Category Bar */}
      <div
        ref={stickyRef}
        className={cn(
          'bg-card/95 backdrop-blur-md border-b border-border z-20 transition-shadow sticky top-0',
          isSticky && 'shadow-md'
        )}
      >
        {/* Search Bar */}
        <div className="px-4 md:px-6 py-4" role="search">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const newValue = e.target.value;
                // Play sound on first character typed
                if (newValue && !searchQuery) {
                  play('tap');
                }
                setSearchQuery(newValue);
              }}
              placeholder="Find your favorite dish..."
              aria-label="Search menu items"
              className="w-full pl-10 pr-10 py-3 md:py-3.5 rounded-xl border border-border bg-background text-sm md:text-base focus:border-secondary focus:ring-1 focus:ring-secondary/20 focus:outline-none transition-all"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  play('tap');
                  setSearchQuery('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 active:bg-muted rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div 
          className="flex items-center gap-2 md:gap-3 overflow-x-auto scrollbar-hide pb-4 px-4 md:px-6"
          role="tablist"
          aria-label="Menu categories"
        >
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
                role="tab"
                aria-selected={isActive}
                aria-controls="menu-grid"
                className={cn(
                  'flex items-center gap-1.5 px-4 md:px-5 py-2 md:py-2.5 rounded-full text-sm md:text-base font-medium whitespace-nowrap transition-all border min-h-[44px] md:min-h-[48px] flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2',
                  isActive
                    ? 'bg-secondary text-secondary-foreground border-secondary shadow-md'
                    : 'bg-card text-muted-foreground border-border hover:border-secondary/50 hover:bg-secondary/5'
                )}
              >
                <span>{config.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      'text-[11px] px-1.5 py-0.5 rounded-full',
                      isActive ? 'bg-white/20' : 'bg-muted'
                    )}
                    aria-hidden="true"
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Menu Grid */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin w-12 h-12 border-4 border-secondary border-t-transparent rounded-full mb-4" />
            <p className="text-muted-foreground text-base">Loading menu...</p>
          </div>
        ) : filteredItems.length === 0 ? (
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
          <div 
            id="menu-grid"
            role="tabpanel"
            aria-label={`${categoryConfig[activeCategory]?.label || 'All Items'} menu items`}
            className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5 md:gap-6 lg:gap-8 p-4 md:p-6 lg:p-8"
          >
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
                    onAddToOrder={() => handleStartCombo(item)}
                    onAddToCart={() => handleAddToCart(item)}
                    onRemoveFromCart={() => handleRemoveFromCart(item)}
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
        <CartBar 
          itemCount={itemCount} 
          total={subtotal} 
          onClick={() => {
            play('select');
            navigate('/cart');
          }} 
        />
      )}

      {/* Combo Builder Modal */}
      <ComboBuilderNew 
        open={comboBuilderOpen} 
        onClose={handleCloseComboBuilder} 
        initialSauce={selectedSauce || undefined}
      />
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
  isComboComponent?: boolean;
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
        'group relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-secondary/50 hover:bg-secondary/5 active:scale-[0.98]',
        'transition-all duration-200 flex flex-col h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2',
        item.available ? 'cursor-pointer' : 'cursor-not-allowed',
        isHighlighted && 'ring-4 ring-secondary ring-offset-2 animate-pulse',
        !item.available && 'opacity-60'
      )}
    >
      {/* Image Container - 4:3 aspect ratio */}
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
            <span className="bg-secondary text-secondary-foreground text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <Flame className="w-3 h-3" aria-hidden="true" />
              Popular
            </span>
          )}
          {item.available && item.isNew && !item.isPopular && (
            <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
              New
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col flex-1">
        {/* Category tag */}
        <span className="text-[10px] md:text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1 md:mb-1.5">
          {getCategoryLabel(item)}
        </span>

        {/* Name */}
        <h3 className="font-bold text-foreground text-sm md:text-base leading-tight mb-0.5 line-clamp-1">
          {item.name}
        </h3>

        {/* Description */}
        <p className="text-gray-600 text-xs md:text-sm line-clamp-1 mb-2 md:mb-3">
          {item.description || 'Delicious and fresh'}
        </p>

        {/* Price Row */}
        <div className="flex items-center justify-between mt-auto pt-2 md:pt-3 border-t border-border/50">
          {getPriceDisplay(item)}

          {/* Add to Cart button / Quantity Stepper for Individual items */}
          {item.available && isIndividual && onAddToCart && (
            cartQuantity > 0 ? (
              <div className="flex items-center gap-2 bg-secondary/10 rounded-full px-2 py-1" role="group" aria-label={`Quantity controls for ${item.name}`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFromCart?.();
                  }}
                  className="w-7 h-7 flex items-center justify-center bg-white text-secondary rounded-full shadow-sm hover:bg-gray-50 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-1"
                  aria-label={`Decrease quantity of ${item.name}`}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-bold w-4 text-center text-foreground" aria-label={`Quantity: ${cartQuantity}`}>
                  {cartQuantity}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart();
                  }}
                  className="w-7 h-7 flex items-center justify-center bg-secondary text-secondary-foreground rounded-full shadow-sm hover:bg-secondary/90 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-1"
                  aria-label={`Increase quantity of ${item.name}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart();
                }}
                className="text-xs font-bold px-3 py-2 rounded-full transition-all bg-secondary hover:bg-secondary/90 text-secondary-foreground hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
              >
                Add to Order
              </button>
            )
          )}

          {/* Start Combo button for non-Individual items */}
          {item.available && !isIndividual && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToOrder();
              }}
              className="text-xs font-bold px-3 py-2 rounded-full transition-all bg-secondary hover:bg-secondary/90 text-secondary-foreground hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Start Combo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
