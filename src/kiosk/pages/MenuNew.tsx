import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChefHat, ShoppingCart } from 'lucide-react';
import { useTranslation } from '@shared/context/LanguageContext';
import { useCategories, useAllMenuItems, useGroupedMenu } from '@shared/hooks/useMenu';
import { useKioskCart } from '../context/KioskCartContext';
import { MenuItem } from '@shared/types';
import { cn, formatPrice, vibrate } from '@shared/lib/utils';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import KioskHeader from '../components/KioskHeader';
import CategoryTabsNew from '../components/CategoryTabsNew';
import MenuItemCardNew from '../components/MenuItemCardNew';
import ComboBuilderNew from '../components/ComboBuilderNew';
import CartBar from '../components/CartBar';
import RecommendationSection from '../components/RecommendationSection';
import { QuickReorderPanel } from '../components/QuickReorder';
import { getRecommendations } from '@shared/lib/recommendations';

export default function MenuNew() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: categories = [] } = useCategories();
  const { data: allItems = [] } = useAllMenuItems();
  const { data: groupedMenu } = useGroupedMenu();
  const { addItem, itemCount, subtotal } = useKioskCart();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [comboBuilderOpen, setComboBuilderOpen] = useState(false);
  const [selectedSauce, setSelectedSauce] = useState<MenuItem | null>(null);
  const [showQuickReorder, setShowQuickReorder] = useState(false);

  // Get AI recommendations
  const recommendations = useMemo(() => {
    if (allItems.length === 0 || categories.length === 0) return [];
    return getRecommendations(allItems, categories, [], 4);
  }, [allItems, categories]);

  // Filter items based on search and category
  const filteredItems = useMemo(() => {
    let items = allItems.filter((item) => item.available);

    // Category filter
    if (activeCategory) {
      const category = categories.find((c) => c.slug === activeCategory);
      if (category) {
        items = items.filter((item) => item.category_id === category.id);
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    // Sort by sort_order
    return items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [allItems, categories, activeCategory, searchQuery]);

  // Item counts per category
  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach((cat) => {
      counts[cat.slug] = allItems.filter(
        (item) => item.category_id === cat.id && item.available
      ).length;
    });
    return counts;
  }, [allItems, categories]);

  // Get category slug for an item
  const getCategorySlug = useCallback(
    (item: MenuItem) => {
      const category = categories.find((c) => c.id === item.category_id);
      return category?.slug;
    },
    [categories]
  );

  // Handle adding individual items to cart
  const handleAddToCart = useCallback(
    (item: MenuItem, quantity: number) => {
      vibrate([30, 30]);
      const categorySlug = getCategorySlug(item);
      
      addItem({
        id: crypto.randomUUID(),
        type: 'single',
        sauceName: item.name,
        saucePreparation: '',
        sauceSize: '',
        mainDishes: [],
        sideDish: '',
        extras: [],
        quantity,
        unitPrice: item.price,
        label: item.name,
      });
    },
    [addItem, getCategorySlug]
  );

  // Handle starting combo builder
  const handleStartCombo = useCallback((sauce?: MenuItem) => {
    vibrate();
    setSelectedSauce(sauce || null);
    setComboBuilderOpen(true);
  }, []);

  const handleCloseComboBuilder = useCallback(() => {
    setComboBuilderOpen(false);
    setSelectedSauce(null);
  }, []);

  return (
    <div className="kiosk-screen flex flex-col bg-background">
      <KioskHeader
        title={t('menu.title')}
        showBack
        onBack={() => navigate('/')}
      />

      {/* Search bar */}
      <div className="px-4 py-3 bg-background border-b">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('menu.searchPlaceholder')}
            className="pl-12 pr-10 h-12 text-lg rounded-full bg-muted border-0"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Quick Reorder Button */}
      <div className="px-4 pt-3 flex gap-2">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowQuickReorder(true)}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary/10 text-secondary font-semibold border border-secondary/20 hover:bg-secondary/20 transition-colors"
        >
          ⭐ Favorites & Reorder
        </motion.button>
      </div>

      {/* AI Recommendations */}
      {recommendations.length > 0 && !searchQuery && !activeCategory && (
        <div className="px-4 pt-4">
          <RecommendationSection
            recommendations={recommendations}
            onAddToCart={(itemId) => {
              const item = allItems.find(i => i.id === itemId);
              if (item) handleAddToCart(item, 1);
            }}
          />
        </div>
      )}

      {/* Build Combo CTA Banner */}
      <div className="px-4 py-3">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => handleStartCombo()}
          className={cn(
            'w-full flex items-center justify-between p-4 rounded-2xl',
            'bg-gradient-to-r from-primary to-primary/80 text-white',
            'shadow-lg hover:shadow-xl transition-shadow'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <ChefHat className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="font-bold text-lg">{t('menu.buildCombo')}</p>
              <p className="text-white/80 text-sm">{t('menu.buildYourMeal')}</p>
            </div>
          </div>
          <div className="bg-white text-primary font-bold px-4 py-2 rounded-full">
            Start →
          </div>
        </motion.button>
      </div>

      {/* Category tabs */}
      <div className="border-b bg-background sticky top-0 z-10">
        <CategoryTabsNew
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          itemCounts={itemCounts}
        />
      </div>

      {/* Menu grid */}
      <div className="flex-1 overflow-y-auto pb-24">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Search className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('menu.noResults')}</h3>
            <p className="text-muted-foreground">
              Try a different search term or category
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory(null);
              }}
              className="mt-4"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, index) => {
                const categorySlug = getCategorySlug(item);
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <MenuItemCardNew
                      item={item}
                      categorySlug={categorySlug}
                      onAddToCart={handleAddToCart}
                      onStartCombo={handleStartCombo}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Cart bar */}
      {itemCount > 0 && (
        <CartBar
          itemCount={itemCount}
          total={subtotal}
          onClick={() => navigate('/cart')}
        />
      )}

      {/* Combo Builder Modal */}
      <ComboBuilderNew
        open={comboBuilderOpen}
        onClose={handleCloseComboBuilder}
        initialSauce={selectedSauce || undefined}
      />

      {/* Quick Reorder Panel */}
      <QuickReorderPanel
        isOpen={showQuickReorder}
        onClose={() => setShowQuickReorder(false)}
        menuItems={allItems}
        onAddToCart={(items) => {
          items.forEach(({ menuItem, quantity }) => {
            handleAddToCart(menuItem, quantity);
          });
          setShowQuickReorder(false);
        }}
      />
    </div>
  );
}
