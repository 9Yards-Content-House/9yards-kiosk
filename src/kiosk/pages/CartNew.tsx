import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Pencil,
  AlertCircle,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useTranslation } from '@shared/context/LanguageContext';
import { useKioskCart } from '../context/KioskCartContext';
import { cn, formatPrice, vibrate } from '@shared/lib/utils';
import { Button } from '@shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@shared/components/ui/dialog';
import SwipeableItem from '@shared/components/SwipeableItem';
import KioskHeader from '../components/KioskHeader';
import ComboBuilderNew from '../components/ComboBuilderNew';
import UpsellModal from '../components/UpsellModal';
import { saveOrderToHistory } from '../components/QuickReorder';
import { useAllMenuItems, useCategories } from '@shared/hooks/useMenu';
import { getUpsellSuggestions } from '@shared/lib/recommendations';
import { useSound } from '../hooks/useSound';

export default function CartNew() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { items, removeItem, updateQuantity, clearCart, subtotal, itemCount, addItem } = useKioskCart();
  const { data: allMenuItems = [] } = useAllMenuItems();
  const { data: categories = [] } = useCategories();
  const { play } = useSound();

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);

  // Check if upsell has already been shown this session
  const upsellShown = sessionStorage.getItem('kiosk_upsell_shown') === 'true';

  // Check if user already has juice or dessert in cart
  const hasJuiceOrDessert = useMemo(() => {
    if (allMenuItems.length === 0 || categories.length === 0) return false;
    
    return items.some(item => {
      const menuItem = allMenuItems.find(m => m.name === item.sauceName || m.name === item.label);
      if (!menuItem) return false;
      
      const category = categories.find(c => c.id === menuItem.category_id);
      return category?.slug === 'juices' || category?.slug === 'desserts';
    });
  }, [items, allMenuItems, categories]);

  // Get upsell suggestions based on cart (only juices/desserts not already in cart)
  const upsellSuggestions = useMemo(() => {
    // Don't show upsells if user already has juice/dessert
    if (hasJuiceOrDessert) return [];
    if (items.length === 0 || allMenuItems.length === 0 || categories.length === 0) return [];
    
    // Get names of items already in cart
    const cartItemNames = new Set(items.map(item => item.label || item.sauceName));
    
    // Convert cart items to MenuItem format for the recommendation engine
    const cartMenuItems = items.map(item => {
      const menuItem = allMenuItems.find(m => m.name === item.sauceName || m.name === item.label);
      return menuItem;
    }).filter(Boolean) as any[];
    
    // Get suggestions and filter out items already in cart
    return getUpsellSuggestions(allMenuItems, categories, cartMenuItems)
      .filter(s => !cartItemNames.has(s.suggestedItem.name));
  }, [items, allMenuItems, categories, hasJuiceOrDessert]);

  // Helper to get item image from menu items
  const getItemImage = useCallback((item: typeof items[0]) => {
    // Try to find matching menu item
    const menuItem = allMenuItems.find(m => 
      m.name === item.sauceName || 
      m.name === item.label ||
      (item.type === 'combo' && m.name === item.sauceName)
    );
    return menuItem?.image_url || null;
  }, [allMenuItems]);

  const handleQuantityChange = useCallback(
    (id: string, delta: number) => {
      vibrate();
      const item = items.find((i) => i.id === id);
      if (!item) return;

      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        play('remove');
        removeItem(id);
      } else {
        play(delta > 0 ? 'add' : 'tap');
        updateQuantity(id, newQty);
      }
    },
    [items, removeItem, updateQuantity, play]
  );

  const handleRemove = useCallback(
    (id: string) => {
      vibrate([50, 30]);
      play('remove');
      removeItem(id);
    },
    [removeItem, play]
  );

  const handleClearCart = useCallback(() => {
    vibrate([50, 30, 50]);
    play('remove');
    clearCart();
    setShowClearDialog(false);
  }, [clearCart, play]);

  const handleEditCombo = useCallback((id: string) => {
    setEditingItemId(id);
  }, []);

  const handleCheckout = useCallback(() => {
    // Show upsell only if we have suggestions and user hasn't seen it this session
    if (upsellSuggestions.length > 0 && !upsellShown) {
      setShowUpsell(true);
    } else {
      // Save order to history for quick reorder feature
      const orderItems = items.map(item => {
        const menuItem = allMenuItems.find(m => m.name === item.sauceName || m.name === item.label);
        return menuItem ? { menuItem, quantity: item.quantity } : null;
      }).filter(Boolean) as any[];
      if (orderItems.length > 0) {
        saveOrderToHistory(orderItems, subtotal);
      }
      navigate('/details');
    }
  }, [navigate, upsellSuggestions, upsellShown, items, allMenuItems, subtotal]);

  const handleSkipUpsell = useCallback(() => {
    setShowUpsell(false);
    // Save order to history
    const orderItems = items.map(item => {
      const menuItem = allMenuItems.find(m => m.name === item.sauceName || m.name === item.label);
      return menuItem ? { menuItem, quantity: item.quantity } : null;
    }).filter(Boolean) as any[];
    if (orderItems.length > 0) {
      saveOrderToHistory(orderItems, subtotal);
    }
    navigate('/details');
  }, [items, allMenuItems, subtotal, navigate]);

  const handleAddUpsellItem = useCallback((item: any) => {
    vibrate([30, 30]);
    play('add');
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
      unitPrice: item.price,
      label: item.name,
    });
  }, [addItem, play]);

  // Empty cart state
  if (items.length === 0) {
    return (
      <div className="kiosk-screen flex flex-col bg-white">
        <KioskHeader
          title={t('cart.title')}
          showBack
          onBack={() => navigate('/menu')}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-32 h-32 bg-[#E6411C]/5 rounded-full flex items-center justify-center mb-6 border border-[#E6411C]/10 relative">
            <ShoppingBag className="w-12 h-12 text-[#E6411C]/40" />
            <div className="absolute top-2 right-2 bg-white rounded-full p-2 border border-gray-100 shadow-sm">
              <span className="text-xl">🤔</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-[#212282] mb-2">{t('cart.empty')}</h2>
          <p className="text-gray-500 mb-8 text-lg">{t('cart.emptyDesc')}</p>
          <Button
            size="touch"
            onClick={() => navigate('/menu')}
            className="bg-[#E6411C] hover:bg-[#d13a18] gap-2 text-white font-bold"
          >
            <ShoppingBag className="w-5 h-5" />
            {t('cart.browseMenu')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="kiosk-screen flex flex-col bg-[#FAFAFA]">
      <KioskHeader
        title={t('cart.title')}
        showBack
        onBack={() => navigate('/menu')}
        rightElement={
          <button 
            onClick={() => setShowClearDialog(true)}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All</span>
          </button>
        }
      />

      {/* Item count */}
      <div className="px-4 py-2 bg-muted/50 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {itemCount} {itemCount === 1 ? t('cart.item') : t('cart.items')}
        </span>
        <span className="text-muted-foreground">
          Swipe left to remove
        </span>
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, height: 0, marginBottom: 0 }}
              transition={{ 
                type: 'spring', 
                stiffness: 500, 
                damping: 30,
                delay: index * 0.05,
              }}
            >
              <SwipeableItem onDelete={() => handleRemove(item.id)}>
                <div className="p-4 border-b bg-white">
                  <div className="flex gap-4 items-start">
                    {/* Item Image */}
                    <div className="shrink-0 w-24 h-24 rounded-2xl bg-gray-100 overflow-hidden border border-gray-200 relative">
                      {getItemImage(item) ? (
                        <img
                          src={getItemImage(item)!}
                          alt={item.label || item.sauceName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <UtensilsCrossed className="w-8 h-8" />
                        </div>
                      )}
                      {/* Type badge */}
                      <span className={cn(
                        'absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase',
                        item.type === 'combo' 
                          ? 'bg-[#E6411C] text-white' 
                          : 'bg-[#212282] text-white'
                      )}>
                        {item.type === 'combo' ? 'Combo' : 'Single'}
                      </span>
                    </div>

                    {/* Item Content */}
                    <div className="flex flex-1 flex-col justify-between min-h-[96px]">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-[#212282] text-base font-bold leading-tight line-clamp-2">
                            {item.label || item.sauceName}
                            {item.saucePreparation && item.saucePreparation !== 'Default' && (
                              <span className="text-muted-foreground font-normal text-sm">
                                {' '}({item.saucePreparation})
                              </span>
                            )}
                          </h3>
                          {/* Desktop X button */}
                          <button 
                            onClick={() => handleRemove(item.id)}
                            className="hidden lg:flex text-gray-400 hover:text-red-500 transition-colors p-1"
                            aria-label="Remove item"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        
                        {/* Combo details */}
                        {item.type === 'combo' && (
                          <div className="text-sm text-muted-foreground space-y-1">
                            {item.mainDishes && item.mainDishes.length > 0 && (
                              <p className="text-xs">{item.mainDishes.join(' + ')}</p>
                            )}
                            {item.sideDish && (
                              <p className="text-xs">+ {item.sideDish}</p>
                            )}
                            {item.extras && item.extras.length > 0 && (
                              <p className="text-xs text-[#E6411C]">
                                + {item.extras.map((e) => e.quantity > 1 ? `${e.name} ×${e.quantity}` : e.name).join(', ')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Price and Controls */}
                      <div className="flex items-center justify-between mt-3">
                        <div>
                          <p className="text-[#E6411C] font-bold text-lg">
                            {formatPrice(item.unitPrice * item.quantity)}
                          </p>
                          {item.quantity > 1 && (
                            <p className="text-[10px] text-muted-foreground">
                              {formatPrice(item.unitPrice)} each
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3 bg-gray-100 rounded-full p-0.5 border border-gray-200">
                            <button
                              onClick={() => handleQuantityChange(item.id, -1)}
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition-all active:scale-95"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-6 text-center text-sm font-bold text-gray-900">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(item.id, 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-[#E6411C] text-white hover:bg-[#d13a18] shadow-sm transition-all active:scale-95"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Edit Button (Combos only) */}
                          {item.type === 'combo' && (
                            <button
                              onClick={() => handleEditCombo(item.id)}
                              className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-100 active:scale-95"
                              title="Edit Combo"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </SwipeableItem>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="border-t bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 font-medium">{t('cart.subtotal')}</span>
          <span className="font-bold text-2xl text-[#E6411C]">
            {formatPrice(subtotal)}
          </span>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="touch"
            onClick={() => navigate('/menu')}
            className="flex-1 gap-2 border-gray-200 text-[#212282] hover:bg-gray-50"
          >
            <Plus className="w-5 h-5" />
            {t('cart.addMore')}
          </Button>
          <Button
            size="touch"
            onClick={handleCheckout}
            className="flex-1 bg-[#E6411C] hover:bg-[#d13a18] text-white font-bold"
          >
            {t('cart.checkout')}
          </Button>
        </div>
      </div>

      {/* Clear cart confirmation dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              {t('cart.clearCart')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">{t('cart.clearConfirm')}</p>
          <DialogFooter className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowClearDialog(false)}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearCart}
              className="flex-1"
            >
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Combo Builder for editing */}
      <ComboBuilderNew
        open={!!editingItemId}
        onClose={() => setEditingItemId(null)}
        editingItemId={editingItemId || undefined}
      />

      {/* Upsell Modal - shown before checkout */}
      <UpsellModal
        isOpen={showUpsell}
        onClose={() => setShowUpsell(false)}
        suggestions={upsellSuggestions.map(s => ({ item: s.suggestedItem, promptText: s.promptText }))}
        onAddItem={handleAddUpsellItem}
        onSkip={handleSkipUpsell}
      />
    </div>
  );
}
