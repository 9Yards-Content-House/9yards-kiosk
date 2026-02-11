import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Flame, Sparkles, ShoppingBag } from 'lucide-react';
import { useTranslation } from '@shared/context/LanguageContext';
import { MenuItem } from '@shared/types';
import { cn, formatPrice, vibrate } from '@shared/lib/utils';
import { Button } from '@shared/components/ui/button';
import OptimizedImage from '@shared/components/OptimizedImage';

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart?: (item: MenuItem, quantity: number) => void;
  onStartCombo?: (item: MenuItem) => void;
  categorySlug?: string;
}

export default function MenuItemCardNew({
  item,
  onAddToCart,
  onStartCombo,
  categorySlug,
}: MenuItemCardProps) {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const isComboItem =
    categorySlug === 'sauces' ||
    categorySlug === 'main-dishes' ||
    categorySlug === 'side-dishes';
  const isIndividualItem =
    categorySlug === 'lusaniya' ||
    categorySlug === 'juices' ||
    categorySlug === 'desserts';
  const isFree = item.price === 0;
  const displayPrice = item.sizes?.[0]?.price || item.price;

  const handleQuantityChange = useCallback((delta: number) => {
    vibrate();
    setQuantity((prev) => Math.max(1, prev + delta));
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!onAddToCart) return;
    vibrate([30, 30, 30]);
    setIsAdding(true);
    onAddToCart(item, quantity);
    setTimeout(() => {
      setIsAdding(false);
      setQuantity(1);
    }, 500);
  }, [item, quantity, onAddToCart]);

  const handleStartCombo = useCallback(() => {
    if (!onStartCombo) return;
    vibrate();
    onStartCombo(item);
  }, [item, onStartCombo]);

  // Unavailable overlay
  if (!item.available) {
    return (
      <div className="relative rounded-2xl overflow-hidden bg-white border shadow-sm opacity-60">
        <div className="aspect-[4/3] relative">
          <OptimizedImage
            src={item.image_url}
            alt={item.name}
            aspectRatio="4/3"
            className="grayscale"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-destructive text-white px-4 py-2 rounded-full font-bold text-sm">
              {t('menu.soldOut')}
            </span>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg line-clamp-1">{item.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {item.description}
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative rounded-2xl overflow-hidden bg-white border shadow-sm transition-shadow',
        'hover:shadow-lg hover:border-secondary/30'
      )}
    >
      {/* Image */}
      <div className="aspect-[4/3] relative">
        <OptimizedImage
          src={item.image_url}
          alt={item.name}
          aspectRatio="4/3"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {item.is_popular && (
            <span className="flex items-center gap-1 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-sm">
              <Flame className="w-3 h-3" />
              {t('menu.popular')}
            </span>
          )}
          {item.is_new && (
            <span className="flex items-center gap-1 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-sm">
              <Sparkles className="w-3 h-3" />
              {t('menu.new')}
            </span>
          )}
          {isFree && (
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
              {t('common.free')}
            </span>
          )}
        </div>

        {/* Category pill */}
        {categorySlug && (
          <div className="absolute top-3 right-3">
            <span className="bg-black/60 text-white px-2 py-1 rounded-full text-xs capitalize">
              {categorySlug.replace('-', ' ')}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg line-clamp-1">{item.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[2.5rem]">
          {item.description}
        </p>

        {/* Price and action */}
        <div className="mt-3 flex items-center justify-between">
          {!isFree ? (
            <div>
              <span className="text-xl font-bold text-secondary">
                {formatPrice(displayPrice)}
              </span>
              {item.sizes && item.sizes.length > 1 && (
                <span className="text-xs text-muted-foreground ml-1">+</span>
              )}
            </div>
          ) : (
            <span className="text-lg font-bold text-green-600">
              {t('combo.includedFree')}
            </span>
          )}

          {/* Actions */}
          {isComboItem ? (
            <Button
              size="sm"
              onClick={handleStartCombo}
              className="bg-primary hover:bg-primary/90 rounded-full px-4"
            >
              {t('menu.startCombo')}
            </Button>
          ) : isIndividualItem ? (
            <div className="flex items-center gap-2">
              {/* Quantity controls */}
              <div className="flex items-center gap-1 bg-muted rounded-full">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-6 text-center font-bold text-sm">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleQuantityChange(1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <Button
                size="sm"
                onClick={handleAddToCart}
                disabled={isAdding}
                className={cn(
                  'bg-secondary hover:bg-secondary/90 rounded-full px-4 gap-1',
                  isAdding && 'bg-green-500'
                )}
              >
                {isAdding ? (
                  '✓'
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    {t('menu.addToOrder')}
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
