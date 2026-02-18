import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Flame, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from '@shared/context/LanguageContext';
import { MenuItem } from '@shared/types';
import { FavoriteButton } from './QuickReorder';
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

  // Use item_type for combo/standalone determination (preferred over slugs)
  const isComboItem = item.item_type === 'combo_driver' || item.item_type === 'combo_component';
  const isIndividualItem = item.item_type === 'standalone' || !item.item_type;
  const isFree = item.price === 0 && item.item_type !== 'combo_component';
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
          <h3 className="font-bold text-foreground text-sm md:text-base leading-tight mb-0.5 line-clamp-1">{item.name}</h3>
          <p className="text-gray-600 text-xs md:text-sm line-clamp-2 mt-1">
            {item.description}
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative rounded-2xl overflow-hidden bg-white border shadow-sm transition-shadow',
        'active:shadow-lg active:border-secondary/30'
      )}
    >
      {/* Image */}
      <div className="aspect-[4/3] relative">
        <OptimizedImage
          src={item.image_url}
          alt={item.name}
          aspectRatio="4/3"
          fallback={
            <div className="w-full h-full bg-gradient-to-br from-muted/50 via-muted/30 to-muted/50 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center shadow-inner">
                <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[11px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">No Image</span>
                <div className="h-0.5 w-8 bg-muted-foreground/20 rounded-full" />
              </div>
            </div>
          }
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {item.is_popular && (
            <span className="flex items-center gap-1 bg-secondary text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-sm uppercase tracking-wider">
              <Flame className="w-3 h-3 fill-current" />
              {t('menu.popular')}
            </span>
          )}
          {item.is_new && (
            <span className="flex items-center gap-1 bg-green-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-sm uppercase tracking-wider">
              <Sparkles className="w-3 h-3 fill-current" />
              {t('menu.new')}
            </span>
          )}
          {isFree && (
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
              {t('common.free')}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Category Lead-in */}
        {categorySlug && (
          <span className="text-[10px] font-black text-secondary/60 uppercase tracking-[0.15em] mb-2 block">
            {categorySlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </span>
        )}
        
        <h3 className="font-bold text-secondary-foreground text-sm md:text-lg leading-tight mb-1 line-clamp-1">
          {item.name}
        </h3>
        <p className="text-gray-500 text-xs md:text-sm line-clamp-2 mt-0.5 min-h-[2.5rem] leading-relaxed">
          {item.description}
        </p>

        {/* Divider */}
        <div className="h-px bg-gray-100 w-full my-4" />

        {/* Price and action */}
        <div className="mt-auto flex items-center justify-between gap-4">
          {!isFree && item.price > 0 ? (
            <div className="flex flex-col">
              <span className="text-secondary font-black text-xl tracking-tight">
                {formatPrice(displayPrice)}
              </span>
              {item.sizes && item.sizes.length > 1 && (
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Multiple Sizes Available</span>
              )}
            </div>
          ) : item.item_type === 'combo_component' ? (
            <span className="text-blue-600 font-bold text-sm uppercase tracking-wide">
              Combo Only
            </span>
          ) : (
            <span className="text-green-600 font-bold text-sm uppercase tracking-wide">
              {t('combo.includedFree')}
            </span>
          )}

          {/* Actions */}
          {isComboItem ? (
            <Button
              size="lg"
              onClick={handleStartCombo}
              className="bg-secondary hover:bg-secondary/90 text-white rounded-2xl px-6 h-12 font-bold shadow-md shadow-secondary/20"
            >
              {t('menu.startCombo')}
            </Button>
          ) : isIndividualItem ? (
            <Button
              size="lg"
              onClick={handleAddToCart}
              disabled={isAdding}
              className={cn(
                'bg-secondary hover:bg-secondary/90 text-white rounded-2xl px-6 h-12 font-bold gap-2 shadow-md shadow-secondary/20 transition-all',
                isAdding && 'bg-green-500 scale-95 shadow-none'
              )}
            >
              {isAdding ? (
                '✓'
              ) : (
                <>
                  {t('menu.addToOrder')}
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
