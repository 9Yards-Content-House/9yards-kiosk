import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  ShoppingCart,
  Flame,
} from 'lucide-react';
import { useTranslation } from '@shared/context/LanguageContext';
import { useGroupedMenu } from '@shared/hooks/useMenu';
import { useKioskCart } from '../context/KioskCartContext';
import { MenuItem, SauceSize } from '@shared/types';
import { cn, formatPrice, vibrate } from '@shared/lib/utils';
import { Button } from '@shared/components/ui/button';
import { Dialog, DialogContent } from '@shared/components/ui/dialog';
import OptimizedImage from '@shared/components/OptimizedImage';
import StepProgress from '@shared/components/StepProgress';

interface ComboBuilderProps {
  open: boolean;
  onClose: () => void;
  initialSauce?: MenuItem;
  editingItemId?: string;
}

interface ComboState {
  mainDishes: string[];
  sauce: MenuItem | null;
  saucePreparation: string;
  sauceSize: SauceSize | null;
  sideDish: string | null;
  extras: Array<{ item: MenuItem; quantity: number }>;
  quantity: number;
}

const STEPS = [
  { key: 'mains', title: 'Choose Food' },
  { key: 'sauce', title: 'Choose Sauce' },
  { key: 'side', title: 'Choose Side' },
  { key: 'extras', title: 'Add Extras' },
  { key: 'review', title: 'Review' },
];

export default function ComboBuilder({
  open,
  onClose,
  initialSauce,
  editingItemId,
}: ComboBuilderProps) {
  const { t } = useTranslation();
  const { data: groupedMenu = [] } = useGroupedMenu();
  const { addItem, removeItem, items } = useKioskCart();

  const [currentStep, setCurrentStep] = useState(0);
  const [combo, setCombo] = useState<ComboState>({
    mainDishes: [],
    sauce: initialSauce || null,
    saucePreparation: '',
    sauceSize: null,
    sideDish: null,
    extras: [],
    quantity: 1,
  });
  const [showSuccess, setShowSuccess] = useState(false);

  // Helper to get items by category slug
  const getItemsBySlug = (slug: string): MenuItem[] => {
    const group = groupedMenu.find((g) => g.category.slug === slug);
    return group?.items.filter((item) => item.available) || [];
  };

  // Get items by category
  const mainDishes = getItemsBySlug('main-dishes');
  const sauces = getItemsBySlug('sauces');
  const sideDishes = getItemsBySlug('side-dishes');
  const juices = getItemsBySlug('juices');
  const desserts = getItemsBySlug('desserts');
  const extrasItems = [...juices, ...desserts];

  // Load editing item if provided
  useEffect(() => {
    if (editingItemId && open) {
      const item = items.find((i) => i.id === editingItemId);
      if (item && item.type === 'combo') {
        setCombo({
          mainDishes: item.mainDishes || [],
          sauce: sauces.find((s) => s.name === item.sauceName) || null,
          saucePreparation: item.saucePreparation || '',
          sauceSize: item.sauceSize
            ? { name: item.sauceSize, price: item.unitPrice }
            : null,
          sideDish: item.sideDish || null,
          extras: [], // Can't easily restore extras
          quantity: item.quantity,
        });
        setCurrentStep(4); // Go to review for editing
      }
    } else if (initialSauce && open) {
      setCombo((prev) => ({ ...prev, sauce: initialSauce }));
    }
  }, [editingItemId, initialSauce, open, items, sauces]);

  // Calculate running total
  const runningTotal = useMemo(() => {
    let total = 0;
    if (combo.sauceSize) {
      total += combo.sauceSize.price;
    }
    combo.extras.forEach((e) => {
      total += e.item.price * e.quantity;
    });
    return total * combo.quantity;
  }, [combo]);

  // Navigation handlers
  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 0:
        return combo.mainDishes.length > 0;
      case 1:
        return combo.sauce !== null && combo.sauceSize !== null;
      case 2:
        return combo.sideDish !== null;
      case 3:
        return true; // Extras are optional
      case 4:
        return true;
      default:
        return false;
    }
  }, [currentStep, combo]);

  const goNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      vibrate();
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      vibrate();
      setCurrentStep((s) => s - 1);
    } else {
      onClose();
    }
  }, [currentStep, onClose]);

  // Selection handlers
  const toggleMainDish = useCallback((name: string) => {
    vibrate();
    setCombo((prev) => ({
      ...prev,
      mainDishes: prev.mainDishes.includes(name)
        ? prev.mainDishes.filter((d) => d !== name)
        : [...prev.mainDishes, name],
    }));
  }, []);

  const selectSauce = useCallback((sauce: MenuItem) => {
    vibrate();
    const firstPrep = sauce.preparations?.[0];
    const prepName = typeof firstPrep === 'string' ? firstPrep : (firstPrep?.name || '');
    setCombo((prev) => ({
      ...prev,
      sauce,
      saucePreparation: prepName,
      sauceSize:
        sauce.sizes && sauce.sizes.length > 0 ? sauce.sizes[0] : null,
    }));
  }, []);

  const selectPreparation = useCallback((prep: string) => {
    vibrate();
    setCombo((prev) => ({ ...prev, saucePreparation: prep }));
  }, []);

  const selectSize = useCallback((size: SauceSize) => {
    vibrate();
    setCombo((prev) => ({ ...prev, sauceSize: size }));
  }, []);

  const selectSideDish = useCallback((name: string) => {
    vibrate();
    setCombo((prev) => ({ ...prev, sideDish: name }));
  }, []);

  const updateExtra = useCallback((item: MenuItem, delta: number) => {
    vibrate();
    setCombo((prev) => {
      const existing = prev.extras.find((e) => e.item.id === item.id);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) {
          return {
            ...prev,
            extras: prev.extras.filter((e) => e.item.id !== item.id),
          };
        }
        return {
          ...prev,
          extras: prev.extras.map((e) =>
            e.item.id === item.id ? { ...e, quantity: newQty } : e
          ),
        };
      } else if (delta > 0) {
        return { ...prev, extras: [...prev.extras, { item, quantity: 1 }] };
      }
      return prev;
    });
  }, []);

  const updateQuantity = useCallback((delta: number) => {
    vibrate();
    setCombo((prev) => ({
      ...prev,
      quantity: Math.max(1, prev.quantity + delta),
    }));
  }, []);

  // Add to cart
  const handleAddToCart = useCallback(() => {
    if (!combo.sauce || !combo.sauceSize) return;

    vibrate([50, 50, 50]);

    // Calculate unit price (without quantity)
    let unitPrice = combo.sauceSize.price;
    combo.extras.forEach((e) => {
      unitPrice += e.item.price * e.quantity;
    });

    const cartItem = {
      id: editingItemId || crypto.randomUUID(),
      type: 'combo' as const,
      sauceName: combo.sauce.name,
      saucePreparation: combo.saucePreparation,
      sauceSize: combo.sauceSize.name,
      mainDishes: combo.mainDishes,
      sideDish: combo.sideDish,
      extras: combo.extras.map((e) => ({
        name: e.item.name,
        quantity: e.quantity,
        price: e.item.price,
      })),
      quantity: combo.quantity,
      unitPrice,
      label: `${combo.sauce.name} Combo`,
    };

    if (editingItemId) {
      removeItem(editingItemId);
    }
    addItem(cartItem);

    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
      resetCombo();
    }, 1500);
  }, [combo, editingItemId, addItem, removeItem, onClose]);

  const resetCombo = () => {
    setCombo({
      mainDishes: [],
      sauce: null,
      saucePreparation: '',
      sauceSize: null,
      sideDish: null,
      extras: [],
      quantity: 1,
    });
    setCurrentStep(0);
  };

  const handleClose = () => {
    onClose();
    resetCombo();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-full h-full max-h-full m-0 p-0 rounded-none border-0">
        <div className="flex flex-col h-full bg-background">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-white">
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              className="shrink-0"
            >
              {currentStep === 0 ? (
                <X className="w-6 h-6" />
              ) : (
                <ChevronLeft className="w-6 h-6" />
              )}
            </Button>

            <div className="flex-1 text-center">
              <h2 className="text-lg font-bold">{t('combo.title')}</h2>
              <StepProgress
                currentStep={currentStep}
                totalSteps={STEPS.length}
                steps={STEPS.map((s) => ({ title: s.title }))}
                compact
                className="mt-2"
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="shrink-0"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          {/* Selection preview bar */}
          {currentStep > 0 && (
            <div className="flex gap-2 p-3 bg-muted/50 overflow-x-auto">
              {combo.mainDishes.slice(0, 3).map((name) => {
                const item = mainDishes.find((m) => m.name === name);
                return item ? (
                  <div
                    key={name}
                    className="shrink-0 w-10 h-10 rounded-lg overflow-hidden border-2 border-primary"
                  >
                    <OptimizedImage
                      src={item.image_url}
                      alt={name}
                      aspectRatio="square"
                    />
                  </div>
                ) : null;
              })}
              {combo.mainDishes.length > 3 && (
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center text-sm font-bold">
                  +{combo.mainDishes.length - 3}
                </div>
              )}
              {combo.sauce && (
                <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden border-2 border-secondary">
                  <OptimizedImage
                    src={combo.sauce.image_url}
                    alt={combo.sauce.name}
                    aspectRatio="square"
                  />
                </div>
              )}
              {combo.sideDish && (
                <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden border-2 border-green-500">
                  <OptimizedImage
                    src={
                      sideDishes.find((s) => s.name === combo.sideDish)
                        ?.image_url || ''
                    }
                    alt={combo.sideDish}
                    aspectRatio="square"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <StepContainer key="mains">
                  <StepHeader
                    title={t('combo.step1Title')}
                    subtitle={t('combo.step1Desc')}
                  />
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                    {mainDishes
                      .filter((m) => m.available)
                      .map((item) => (
                        <SelectableCard
                          key={item.id}
                          item={item}
                          selected={combo.mainDishes.includes(item.name)}
                          onSelect={() => toggleMainDish(item.name)}
                          showFree
                        />
                      ))}
                  </div>
                </StepContainer>
              )}

              {currentStep === 1 && (
                <StepContainer key="sauce">
                  <StepHeader
                    title={t('combo.step2Title')}
                    subtitle={t('combo.step2Desc')}
                  />
                  <div className="p-4 space-y-4">
                    {/* Sauce selection */}
                    <div className="space-y-3">
                      {sauces
                        .filter((s) => s.available)
                        .map((sauce) => (
                          <SauceCard
                            key={sauce.id}
                            sauce={sauce}
                            selected={combo.sauce?.id === sauce.id}
                            onSelect={() => selectSauce(sauce)}
                          />
                        ))}
                    </div>

                    {/* Preparation options */}
                    {combo.sauce &&
                      combo.sauce.preparations &&
                      combo.sauce.preparations.length > 0 && (
                        <div className="mt-6">
                          <h3 className="font-semibold mb-3">
                            {t('combo.selectPreparation')}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {combo.sauce.preparations.map((prep: any) => {
                              const prepName =
                                typeof prep === 'string' ? prep : prep.name;
                              return (
                                <Button
                                  key={prepName}
                                  variant={
                                    combo.saucePreparation === prepName
                                      ? 'default'
                                      : 'outline'
                                  }
                                  size="lg"
                                  onClick={() => selectPreparation(prepName)}
                                  className="rounded-full"
                                >
                                  {prepName}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    {/* Size options */}
                    {combo.sauce &&
                      combo.sauce.sizes &&
                      combo.sauce.sizes.length > 0 && (
                        <div className="mt-6">
                          <h3 className="font-semibold mb-3">
                            {t('combo.selectSize')}
                          </h3>
                          <div className="space-y-2">
                            {combo.sauce.sizes.map((size) => (
                              <button
                                key={size.name}
                                onClick={() => selectSize(size)}
                                className={cn(
                                  'w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all',
                                  combo.sauceSize?.name === size.name
                                    ? 'border-secondary bg-secondary/10'
                                    : 'border-muted hover:border-muted-foreground/30'
                                )}
                              >
                                <span className="font-medium">{size.name}</span>
                                <span className="font-bold text-secondary">
                                  {formatPrice(size.price)}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </StepContainer>
              )}

              {currentStep === 2 && (
                <StepContainer key="side">
                  <StepHeader
                    title={t('combo.step3Title')}
                    subtitle={t('combo.step3Desc')}
                  />
                  <div className="p-4 space-y-3">
                    {sideDishes
                      .filter((s) => s.available)
                      .map((side) => (
                        <button
                          key={side.id}
                          onClick={() => selectSideDish(side.name)}
                          className={cn(
                            'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all',
                            combo.sideDish === side.name
                              ? 'border-green-500 bg-green-50'
                              : 'border-muted hover:border-muted-foreground/30'
                          )}
                        >
                          <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
                            <OptimizedImage
                              src={side.image_url}
                              alt={side.name}
                              aspectRatio="square"
                            />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-lg">{side.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {side.description}
                            </p>
                          </div>
                          <span className="shrink-0 px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-sm">
                            {t('common.free')}
                          </span>
                          {combo.sideDish === side.name && (
                            <Check className="w-6 h-6 text-green-600 shrink-0" />
                          )}
                        </button>
                      ))}
                  </div>
                </StepContainer>
              )}

              {currentStep === 3 && (
                <StepContainer key="extras">
                  <StepHeader
                    title={t('combo.step4Title')}
                    subtitle={t('combo.step4Desc')}
                  />
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                    {extrasItems
                      .filter((e) => e.available)
                      .map((item) => {
                        const extra = combo.extras.find(
                          (e) => e.item.id === item.id
                        );
                        const qty = extra?.quantity || 0;
                        return (
                          <div
                            key={item.id}
                            className="bg-white rounded-xl border shadow-sm overflow-hidden"
                          >
                            <div className="aspect-square">
                              <OptimizedImage
                                src={item.image_url}
                                alt={item.name}
                                aspectRatio="square"
                              />
                            </div>
                            <div className="p-3">
                              <p className="font-medium text-sm truncate">
                                {item.name}
                              </p>
                              <p className="text-secondary font-bold">
                                {formatPrice(item.price)}
                              </p>
                              <div className="flex items-center justify-center gap-3 mt-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateExtra(item, -1)}
                                  disabled={qty === 0}
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <span className="w-6 text-center font-bold">
                                  {qty}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateExtra(item, 1)}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </StepContainer>
              )}

              {currentStep === 4 && (
                <StepContainer key="review">
                  <StepHeader
                    title={t('combo.step5Title')}
                    subtitle={t('combo.step5Desc')}
                  />
                  <div className="p-4 space-y-4">
                    {/* Main dishes */}
                    <ReviewSection
                      title={t('combo.step1Title')}
                      onEdit={() => setCurrentStep(0)}
                    >
                      <p className="text-foreground">
                        {combo.mainDishes.join(', ') || 'None selected'}
                      </p>
                      <p className="text-sm text-green-600 font-medium">
                        {t('combo.includedFree')}
                      </p>
                    </ReviewSection>

                    {/* Sauce */}
                    <ReviewSection
                      title={t('combo.step2Title')}
                      onEdit={() => setCurrentStep(1)}
                    >
                      <div className="flex items-center gap-3">
                        {combo.sauce && (
                          <div className="w-12 h-12 rounded-lg overflow-hidden">
                            <OptimizedImage
                              src={combo.sauce.image_url}
                              alt={combo.sauce.name}
                              aspectRatio="square"
                            />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">
                            {combo.sauce?.name || 'None'}
                            {combo.saucePreparation &&
                              ` (${combo.saucePreparation})`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {combo.sauceSize?.name}
                          </p>
                        </div>
                        <span className="ml-auto font-bold text-secondary">
                          {combo.sauceSize
                            ? formatPrice(combo.sauceSize.price)
                            : ''}
                        </span>
                      </div>
                    </ReviewSection>

                    {/* Side dish */}
                    <ReviewSection
                      title={t('combo.step3Title')}
                      onEdit={() => setCurrentStep(2)}
                    >
                      <p className="text-foreground">
                        {combo.sideDish || 'None selected'}
                      </p>
                      <p className="text-sm text-green-600 font-medium">
                        {t('combo.includedFree')}
                      </p>
                    </ReviewSection>

                    {/* Extras */}
                    {combo.extras.length > 0 && (
                      <ReviewSection
                        title={t('combo.step4Title')}
                        onEdit={() => setCurrentStep(3)}
                      >
                        {combo.extras.map((e) => (
                          <div
                            key={e.item.id}
                            className="flex justify-between items-center py-1"
                          >
                            <span>
                              {e.quantity}x {e.item.name}
                            </span>
                            <span className="font-medium">
                              {formatPrice(e.item.price * e.quantity)}
                            </span>
                          </div>
                        ))}
                      </ReviewSection>
                    )}

                    {/* Quantity */}
                    <div className="flex items-center justify-between bg-white rounded-xl p-4 border">
                      <span className="font-semibold">Quantity</span>
                      <div className="flex items-center gap-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(-1)}
                          disabled={combo.quantity <= 1}
                        >
                          <Minus className="w-5 h-5" />
                        </Button>
                        <span className="text-xl font-bold w-8 text-center">
                          {combo.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(1)}
                        >
                          <Plus className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </StepContainer>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="border-t bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-muted-foreground">
                {t('combo.runningTotal')}
              </span>
              <span className="text-2xl font-bold text-secondary">
                {formatPrice(runningTotal)}
              </span>
            </div>
            <div className="flex gap-3">
              {currentStep < STEPS.length - 1 ? (
                <>
                  {currentStep === 3 && (
                    <Button
                      variant="outline"
                      size="touch"
                      onClick={goNext}
                      className="flex-1"
                    >
                      {t('common.skip')}
                    </Button>
                  )}
                  <Button
                    size="touch"
                    onClick={goNext}
                    disabled={!canGoNext()}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    {t('common.next')}
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </>
              ) : (
                <Button
                  size="touch"
                  onClick={handleAddToCart}
                  className="flex-1 bg-secondary hover:bg-secondary/90 gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {editingItemId ? t('combo.updateCart') : t('combo.addToCart')}
                </Button>
              )}
            </div>
          </div>

          {/* Success overlay */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 flex items-center justify-center z-50"
              >
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="bg-white rounded-3xl p-8 text-center"
                >
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold">Added to Cart!</h3>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Sub-components

function StepContainer({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="p-4 bg-muted/30">
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function SelectableCard({
  item,
  selected,
  onSelect,
  showFree,
}: {
  item: MenuItem;
  selected: boolean;
  onSelect: () => void;
  showFree?: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative rounded-xl overflow-hidden border-2 transition-all',
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-transparent'
      )}
    >
      <div className="aspect-square">
        <OptimizedImage src={item.image_url} alt={item.name} aspectRatio="square" />
      </div>
      {selected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
      {showFree && (
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
          FREE
        </div>
      )}
      <div className="p-2 bg-white">
        <p className="font-medium text-sm truncate">{item.name}</p>
      </div>
    </button>
  );
}

function SauceCard({
  sauce,
  selected,
  onSelect,
}: {
  sauce: MenuItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const basePrice = sauce.sizes?.[0]?.price || sauce.price;
  
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all',
        selected
          ? 'border-secondary bg-secondary/10'
          : 'border-muted hover:border-muted-foreground/30'
      )}
    >
      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
        <OptimizedImage src={sauce.image_url} alt={sauce.name} aspectRatio="square" />
      </div>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <p className="font-semibold">{sauce.name}</p>
          {sauce.is_popular && (
            <Flame className="w-4 h-4 text-orange-500" />
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-1">
          {sauce.description}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-secondary">{formatPrice(basePrice)}</p>
        {sauce.sizes && sauce.sizes.length > 1 && (
          <p className="text-xs text-muted-foreground">& more sizes</p>
        )}
      </div>
      {selected && <Check className="w-6 h-6 text-secondary shrink-0" />}
    </button>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  
  return (
    <div className="bg-white rounded-xl p-4 border">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-muted-foreground text-sm">{title}</h4>
        <Button variant="ghost" size="sm" onClick={onEdit} className="text-primary">
          {t('combo.editSelection')}
        </Button>
      </div>
      {children}
    </div>
  );
}
