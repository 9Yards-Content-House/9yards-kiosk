import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Edit2,
  AlertCircle,
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

export default function CartNew() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { items, removeItem, updateQuantity, clearCart, subtotal, itemCount, addItem } = useKioskCart();
  const { data: allMenuItems = [] } = useAllMenuItems();
  const { data: categories = [] } = useCategories();

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);

  // Get upsell suggestions based on cart
  const upsellSuggestions = useMemo(() => {
    if (items.length === 0 || allMenuItems.length === 0 || categories.length === 0) return [];
    // Convert cart items to MenuItem format for the recommendation engine
    const cartMenuItems = items.map(item => {
      const menuItem = allMenuItems.find(m => m.name === item.sauceName || m.name === item.label);
      return menuItem;
    }).filter(Boolean) as any[];
    
    return getUpsellSuggestions(allMenuItems, categories, cartMenuItems);
  }, [items, allMenuItems, categories]);

  const handleQuantityChange = useCallback(
    (id: string, delta: number) => {
      vibrate();
      const item = items.find((i) => i.id === id);
      if (!item) return;

      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        removeItem(id);
      } else {
        updateQuantity(id, newQty);
      }
    },
    [items, removeItem, updateQuantity]
  );

  const handleRemove = useCallback(
    (id: string) => {
      vibrate([50, 30]);
      removeItem(id);
    },
    [removeItem]
  );

  const handleClearCart = useCallback(() => {
    vibrate([50, 30, 50]);
    clearCart();
    setShowClearDialog(false);
  }, [clearCart]);

  const handleEditCombo = useCallback((id: string) => {
    setEditingItemId(id);
  }, []);

  const handleCheckout = useCallback(() => {
    // Show upsell if we have suggestions and user hasn't seen it
    if (upsellSuggestions.length > 0) {
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
  }, [navigate, upsellSuggestions, items, allMenuItems, subtotal]);

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
  }, [addItem]);

  // Empty cart state
  if (items.length === 0) {
    return (
      <div className="kiosk-screen flex flex-col bg-background">
        <KioskHeader
          title={t('cart.title')}
          showBack
          onBack={() => navigate('/menu')}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
            <ShoppingBag className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t('cart.empty')}</h2>
          <p className="text-muted-foreground mb-8">{t('cart.emptyDesc')}</p>
          <Button
            size="touch"
            onClick={() => navigate('/menu')}
            className="bg-secondary hover:bg-secondary/90 gap-2"
          >
            <ShoppingBag className="w-5 h-5" />
            {t('cart.browseMenu')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="kiosk-screen flex flex-col bg-background">
      <KioskHeader
        title={t('cart.title')}
        showBack
        onBack={() => navigate('/menu')}
        rightElement={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowClearDialog(true)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
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
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100, height: 0 }}
            >
              <SwipeableItem onDelete={() => handleRemove(item.id)}>
                <div className="p-4 border-b bg-white">
                  <div className="flex gap-4">
                    {/* Item info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              item.type === 'combo'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-secondary/10 text-secondary'
                            )}
                          >
                            {item.type === 'combo' ? t('cart.combo') : 'Single'}
                          </span>
                          <h3 className="font-semibold text-lg mt-1">
                            {item.sauceName}
                            {item.saucePreparation && (
                              <span className="text-muted-foreground font-normal">
                                {' '}
                                ({item.saucePreparation})
                              </span>
                            )}
                          </h3>
                        </div>
                        <span className="font-bold text-lg">
                          {formatPrice(item.unitPrice * item.quantity)}
                        </span>
                      </div>

                      {/* Combo details */}
                      {item.type === 'combo' && (
                        <div className="mt-2 text-sm text-muted-foreground space-y-1">
                          {item.mainDishes && item.mainDishes.length > 0 && (
                            <p>
                              <span className="font-medium">Main:</span>{' '}
                              {item.mainDishes.join(', ')}
                            </p>
                          )}
                          {item.sideDish && (
                            <p>
                              <span className="font-medium">Side:</span>{' '}
                              {item.sideDish}
                            </p>
                          )}
                          {item.sauceSize && (
                            <p>
                              <span className="font-medium">Size:</span>{' '}
                              {item.sauceSize}
                            </p>
                          )}
                          {item.extras && item.extras.length > 0 && (
                            <p>
                              <span className="font-medium">Extras:</span>{' '}
                              {item.extras
                                .map((e) => `${e.quantity}x ${e.name}`)
                                .join(', ')}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-3">
                        {item.type === 'combo' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCombo(item.id)}
                            className="text-primary gap-1"
                          >
                            <Edit2 className="w-4 h-4" />
                            {t('cart.edit')}
                          </Button>
                        )}
                        <div className="flex items-center gap-3 ml-auto">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-full"
                            onClick={() => handleQuantityChange(item.id, -1)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="text-xl font-bold w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-full"
                            onClick={() => handleQuantityChange(item.id, 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
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
      <div className="border-t bg-white p-4 space-y-3">
        <div className="flex items-center justify-between text-lg">
          <span className="font-semibold">{t('cart.subtotal')}</span>
          <span className="font-bold text-2xl text-secondary">
            {formatPrice(subtotal)}
          </span>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="touch"
            onClick={() => navigate('/menu')}
            className="flex-1 gap-2"
          >
            <Plus className="w-5 h-5" />
            {t('cart.addMore')}
          </Button>
          <Button
            size="touch"
            onClick={handleCheckout}
            className="flex-1 bg-secondary hover:bg-secondary/90"
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
