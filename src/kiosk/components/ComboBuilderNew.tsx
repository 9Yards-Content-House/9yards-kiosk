import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Check,
  ChevronRight,
  Plus,
  Minus,
  ArrowLeft,
  RotateCcw,
  Flame,
} from 'lucide-react';
import { useGroupedMenu } from '@shared/hooks/useMenu';
import { useKioskCart } from '../context/KioskCartContext';
import { MenuItem, SauceSize } from '@shared/types';
import { cn, formatPrice, vibrate } from '@shared/lib/utils';
import { useSound } from '../hooks/useSound';

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
  { num: 1, label: 'Food' },
  { num: 2, label: 'Sauce' },
  { num: 3, label: 'Side' },
  { num: 4, label: 'Extras' },
  { num: 5, label: 'Review' },
];

const DRAFT_KEY = '9yards_combo_draft';
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Load draft from localStorage
function loadDraft(): { combo: ComboState; step: number; timestamp: number } | null {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return null;
    const draft = JSON.parse(saved);
    if (Date.now() - draft.timestamp > DRAFT_EXPIRY_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

// Save draft to localStorage
function saveDraft(combo: ComboState, step: number) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ combo, step, timestamp: Date.now() }));
  } catch {
    // Ignore storage errors
  }
}

// Clear draft
function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore
  }
}

export default function ComboBuilder({
  open,
  onClose,
  initialSauce,
  editingItemId,
}: ComboBuilderProps) {
  const navigate = useNavigate();
  const { data: groupedMenu = [] } = useGroupedMenu();
  const { addItem, removeItem, items } = useKioskCart();
  const { play } = useSound();
  const mainContentRef = useRef<HTMLElement>(null);

  const [step, setStep] = useState(1);
  const [combo, setCombo] = useState<ComboState>({
    mainDishes: [],
    sauce: initialSauce || null,
    saucePreparation: '',
    sauceSize: null,
    sideDish: null,
    extras: [],
    quantity: 1,
  });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

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
  const extrasItems = useMemo(() => [...juices, ...desserts], [juices, desserts]);

  // Reset builder
  const resetBuilder = useCallback(() => {
    setStep(1);
    setCombo({
      mainDishes: [],
      sauce: null,
      saucePreparation: '',
      sauceSize: null,
      sideDish: null,
      extras: [],
      quantity: 1,
    });
    clearDraft();
    setShowDraftBanner(false);
  }, []);

  // Check if has selections
  const hasSelections = useMemo(() => {
    return (
      combo.mainDishes.length > 0 ||
      combo.sauce ||
      combo.sideDish ||
      combo.extras.length > 0
    );
  }, [combo]);

  // Load draft or editing item on open
  useEffect(() => {
    if (!open) return;

    if (editingItemId) {
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
          extras: [],
          quantity: item.quantity,
        });
        setStep(5);
        return;
      }
    }

    if (initialSauce) {
      const firstPrep = initialSauce.preparations?.[0];
      const prepName = typeof firstPrep === 'string' ? firstPrep : firstPrep?.name || '';
      setCombo((prev) => ({
        ...prev,
        sauce: initialSauce,
        saucePreparation: prepName,
        sauceSize: initialSauce.sizes?.[0] || null,
      }));
      setStep(1);
      return;
    }

    // Check for saved draft
    if (!isDraftLoaded) {
      const draft = loadDraft();
      if (draft && !editingItemId && !initialSauce) {
        const restoredCombo = {
          ...draft.combo,
          sauce: draft.combo.sauce ? sauces.find((s) => s.id === draft.combo.sauce?.id) || null : null,
          extras: draft.combo.extras
            .map((e) => {
              const item = extrasItems.find((ei) => ei.id === e.item?.id);
              return item ? { item, quantity: e.quantity } : null;
            })
            .filter(Boolean) as Array<{ item: MenuItem; quantity: number }>,
        };
        setCombo(restoredCombo);
        setStep(draft.step);
        setShowDraftBanner(true);
      }
      setIsDraftLoaded(true);
    }
  }, [open, editingItemId, initialSauce, items, sauces, extrasItems, isDraftLoaded]);

  // Auto-close draft banner
  useEffect(() => {
    if (showDraftBanner) {
      const timer = setTimeout(() => setShowDraftBanner(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showDraftBanner]);

  // Save draft on combo/step changes
  useEffect(() => {
    if (open && hasSelections && !showSuccessOverlay && !editingItemId) {
      saveDraft(combo, step);
    }
  }, [combo, step, open, editingItemId, hasSelections, showSuccessOverlay]);

  // Scroll to top when step changes
  useEffect(() => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Handle close (defined before keyboard navigation useEffect)
  const handleClose = useCallback(() => {
    if (hasSelections && !showSuccessOverlay) {
      setShowCancelModal(true);
    } else {
      onClose();
    }
  }, [hasSelections, showSuccessOverlay, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleClose]);

  // Calculate price
  const unitPrice = useMemo(() => {
    let total = combo.sauceSize?.price || combo.sauce?.sizes?.[0]?.price || combo.sauce?.price || 0;
    combo.extras.forEach((e) => {
      total += e.item.price * e.quantity;
    });
    return total;
  }, [combo]);

  const totalPrice = useMemo(() => unitPrice * combo.quantity, [unitPrice, combo.quantity]);

  // Get summary text
  const summaryText = useMemo(() => {
    const mainNames = combo.mainDishes;

    if (step === 1) {
      return mainNames.length > 0 ? mainNames.join(', ') : 'Select your food';
    }

    if (step === 2 && combo.sauce) {
      return `${mainNames.join(' + ')} + ${combo.sauce.name}`;
    }

    if (step >= 3) {
      const parts = [...mainNames];
      if (combo.sauce) parts.push(combo.sauce.name);
      if (combo.sideDish) parts.push(combo.sideDish);
      return parts.join(' + ');
    }

    return mainNames.join(', ');
  }, [step, combo]);

  // Can proceed to next step
  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        return combo.mainDishes.length > 0;
      case 2:
        return combo.sauce !== null;
      case 3:
        return combo.sideDish !== null;
      case 4:
      case 5:
        return true;
      default:
        return false;
    }
  }, [step, combo]);

  // Get next button text
  const getNextButtonText = () => {
    switch (step) {
      case 1:
        return 'Next: Choose Your Sauce';
      case 2:
        return 'Next: Choose Your Side Dish';
      case 3:
        return 'Next: Add Extras';
      case 4:
        return 'Review Your Combo';
      case 5:
        return 'Add to Order';
      default:
        return 'Next';
    }
  };

  // Selection handlers
  const toggleMainDish = useCallback((name: string) => {
    vibrate();
    play('select');
    setCombo((prev) => ({
      ...prev,
      mainDishes: prev.mainDishes.includes(name)
        ? prev.mainDishes.filter((d) => d !== name)
        : [...prev.mainDishes, name],
    }));
  }, [play]);

  const selectSauce = useCallback((sauce: MenuItem) => {
    vibrate();
    play('select');
    const firstPrep = sauce.preparations?.[0];
    const prepName = typeof firstPrep === 'string' ? firstPrep : firstPrep?.name || '';
    setCombo((prev) => ({
      ...prev,
      sauce,
      saucePreparation: prepName,
      sauceSize: sauce.sizes && sauce.sizes.length > 0 ? sauce.sizes[0] : null,
    }));
  }, [play]);

  const selectSideDish = useCallback((name: string) => {
    vibrate();
    play('select');
    setCombo((prev) => ({ ...prev, sideDish: name }));
  }, [play]);

  const updateExtra = useCallback((item: MenuItem, delta: number) => {
    vibrate();
    play(delta > 0 ? 'add' : 'remove');
    setCombo((prev) => {
      const existing = prev.extras.find((e) => e.item.id === item.id);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) {
          return { ...prev, extras: prev.extras.filter((e) => e.item.id !== item.id) };
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
  }, [play]);

  const updateQuantity = useCallback((delta: number) => {
    vibrate();
    play('tap');
    setCombo((prev) => ({ ...prev, quantity: Math.max(1, prev.quantity + delta) }));
  }, [play]);

  // Handle add to cart
  const handleAddToCart = useCallback(() => {
    if (!combo.sauce) return;

    vibrate([50, 50, 50]);
    play('success');

    let price = combo.sauceSize?.price || combo.sauce.sizes?.[0]?.price || combo.sauce.price || 0;
    combo.extras.forEach((e) => {
      price += e.item.price * e.quantity;
    });

    const cartItem = {
      id: editingItemId || crypto.randomUUID(),
      type: 'combo' as const,
      sauceName: combo.sauce.name,
      saucePreparation: combo.saucePreparation,
      sauceSize: combo.sauceSize?.name || '',
      mainDishes: combo.mainDishes,
      sideDish: combo.sideDish || '',
      extras: combo.extras.map((e) => ({
        name: e.item.name,
        quantity: e.quantity,
        price: e.item.price,
      })),
      quantity: combo.quantity,
      unitPrice: price,
      label: `${combo.sauce.name} Combo`,
    };

    if (editingItemId) {
      removeItem(editingItemId);
    }
    addItem(cartItem);
    clearDraft();

    setShowSuccessOverlay(true);
  }, [combo, editingItemId, addItem, removeItem]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div
        className={cn(
          'relative w-full max-w-md md:max-w-2xl lg:max-w-3xl h-[95vh] md:h-[90vh] md:max-h-[800px]',
          'md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col',
          'transition-colors duration-500',
          step === 1 ? 'bg-white' : 'bg-[#FAFAFA]'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="combo-builder-title"
      >
        {/* Header */}
        <header className="flex-none bg-white px-4 pt-4 pb-3 shadow-sm z-20 border-b border-gray-100">
          {/* Step Labels - Desktop/Tablet */}
          <div className="hidden sm:flex justify-center gap-1 mb-3">
            {STEPS.map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <button
                  onClick={() => {
                    if (s.num < step) {
                      vibrate();
                      setStep(s.num);
                    }
                  }}
                  disabled={s.num > step}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                    s.num === step
                      ? 'bg-[#E6411C] text-white'
                      : s.num < step
                        ? 'bg-[#212282]/10 text-[#212282] hover:bg-[#212282]/20 cursor-pointer'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                >
                  <span
                    className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                      s.num < step
                        ? 'bg-[#212282] text-white'
                        : s.num === step
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-200 text-gray-500'
                    )}
                  >
                    {s.num < step ? <Check className="w-3 h-3" /> : s.num}
                  </span>
                  <span className="hidden md:inline">{s.label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <ChevronRight
                    className={cn(
                      'w-4 h-4 mx-1',
                      s.num < step ? 'text-[#212282]/40' : 'text-gray-300'
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            {step > 1 ? (
              <button
                onClick={() => {
                  vibrate();
                  setStep(step - 1);
                }}
                className="flex size-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-[#212282]"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="flex size-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-[#212282]"
                aria-label="Close combo builder"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Mobile Step Indicator */}
            <div className="flex flex-col items-center sm:hidden">
              <span className="text-xs font-bold uppercase tracking-widest text-[#E6411C]">
                Step {step}: {['Choose Food', 'Choose Sauce', 'Choose Side', 'Add Extras', 'Review'][step - 1]}
              </span>
              <div className="mt-1.5 flex gap-1">
                {STEPS.map((s) => (
                  <button
                    key={s.num}
                    onClick={() => {
                      if (s.num < step) {
                        vibrate();
                        setStep(s.num);
                      }
                    }}
                    disabled={s.num > step}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      s.num === step
                        ? 'w-8 bg-[#E6411C]'
                        : s.num < step
                          ? 'w-3 bg-[#212282] cursor-pointer hover:bg-[#212282]/80'
                          : 'w-2 bg-gray-200'
                    )}
                    aria-label={`Go to step ${s.num}`}
                  />
                ))}
              </div>
            </div>

            {/* Desktop Step Text */}
            <div className="hidden sm:flex flex-col items-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[#E6411C]">
                Step {step}: {['Choose Food', 'Choose Sauce', 'Choose Side', 'Add Extras', 'Review'][step - 1]}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {hasSelections && (
                <button
                  onClick={() => setShowResetModal(true)}
                  className="flex h-10 items-center justify-center rounded-full px-2 hover:bg-gray-100 transition-colors text-gray-500 mr-1"
                  title="Start Fresh"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleClose}
                className="flex h-10 items-center justify-center rounded-full px-2 hover:bg-red-50 transition-colors"
              >
                <span className="text-[#E6411C] text-sm font-bold">Cancel</span>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main
          ref={mainContentRef}
          className={cn(
            'flex-1 overflow-y-auto pb-52 sm:pb-48 transition-colors duration-500',
            step === 1 ? 'bg-white' : 'bg-[#FAFAFA]'
          )}
        >
          {/* Draft Banner */}
          {showDraftBanner && (
            <div className="bg-[#212282] text-white px-5 py-3 flex items-center justify-between animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-full bg-white/20 flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
                <p className="text-xs font-bold">Resuming your saved combo draft...</p>
              </div>
              <button
                onClick={() => setShowDraftBanner(false)}
                className="text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Selection Preview Bar - Shows on steps 2-4 */}
          {step >= 2 && step <= 4 && (combo.mainDishes.length > 0 || combo.sauce || combo.sideDish) && (
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-2">
              <div className="flex items-center gap-3">
                {/* Main Dishes Preview */}
                {combo.mainDishes.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex -space-x-2">
                      {combo.mainDishes.slice(0, 4).map((name) => {
                        const dish = mainDishes.find((d) => d.name === name);
                        return dish ? (
                          <img
                            key={name}
                            src={dish.image_url}
                            alt={name}
                            title={name}
                            className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                        ) : null;
                      })}
                      {combo.mainDishes.length > 4 && (
                        <div className="w-8 h-8 rounded-full bg-[#212282] border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                          +{combo.mainDishes.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sauce Preview */}
                {step >= 3 && combo.sauce && (
                  <>
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    <img
                      src={combo.sauce.image_url}
                      alt={combo.sauce.name}
                      title={combo.sauce.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                    />
                  </>
                )}

                {/* Side Dish Preview */}
                {step >= 4 && combo.sideDish && (
                  <>
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    {(() => {
                      const side = sideDishes.find((s) => s.name === combo.sideDish);
                      return side ? (
                        <img
                          src={side.image_url}
                          alt={side.name}
                          title={side.name}
                          className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                        />
                      ) : null;
                    })()}
                  </>
                )}

                <div className="flex-1" />
                <span className="text-xs text-gray-500 font-medium shrink-0">
                  {combo.mainDishes.length} item{combo.mainDishes.length !== 1 ? 's' : ''} selected
                </span>
              </div>
            </div>
          )}

          {/* Step 1: Choose Your Food */}
          {step === 1 && (
            <div className="animate-in fade-in duration-300">
              <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h1
                    id="combo-builder-title"
                    className="text-xl sm:text-[28px] font-extrabold leading-tight tracking-tight text-[#212282]"
                  >
                    Choose Your Food
                  </h1>
                  {combo.mainDishes.length > 0 && (
                    <span className="shrink-0 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-[#E6411C] text-white text-xs sm:text-sm font-bold whitespace-nowrap">
                      {combo.mainDishes.length} selected
                    </span>
                  )}
                </div>
                <p className="text-sm sm:text-base text-gray-500 font-medium">
                  Choose as many as you like. They're all included!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 px-4 py-4 md:grid-cols-3 lg:grid-cols-4">
                {mainDishes.map((dish) => {
                  const isSelected = combo.mainDishes.includes(dish.name);
                  return (
                    <label
                      key={dish.id}
                      className={cn(
                        'group relative cursor-pointer block',
                        !dish.available && 'opacity-50 pointer-events-none'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleMainDish(dish.name)}
                        className="sr-only"
                        disabled={!dish.available}
                      />
                      <div
                        className={cn(
                          'flex h-full flex-col overflow-hidden rounded-2xl border-2 bg-white transition-all duration-200',
                          isSelected
                            ? 'border-[#E6411C] bg-[#E6411C]/5'
                            : 'border-gray-200 hover:border-[#E6411C]'
                        )}
                      >
                        <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                          <img
                            src={dish.image_url}
                            alt={dish.name}
                            loading="eager"
                            decoding="sync"
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          {/* FREE Badge */}
                          <span className="absolute top-3 left-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                            FREE
                          </span>
                          {/* Checkmark Badge */}
                          <div
                            className={cn(
                              'absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-[#E6411C] text-white shadow-lg transition-all duration-300',
                              isSelected ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                            )}
                          >
                            <Check className="w-4 h-4" strokeWidth={3} />
                          </div>
                        </div>
                        <div className="flex flex-col p-3">
                          <span className="text-sm font-bold text-[#212282]">{dish.name}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Choose Your Sauce */}
          {step === 2 && (
            <div className="animate-in fade-in duration-300">
              <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-[#212282] tracking-tight">
                    Choose Your Sauce
                  </h1>
                  <span className="shrink-0 px-1.5 sm:px-2 py-0.5 rounded-full bg-[#E6411C]/10 text-[#E6411C] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border border-[#E6411C]/20">
                    Required
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500">
                  Select one sauce to accompany your meal.
                </p>
              </div>

              <div className="flex flex-col gap-3 p-4">
                {sauces.map((sauce) => {
                  const isSelected = combo.sauce?.id === sauce.id;
                  const basePrice = sauce.sizes?.[0]?.price || sauce.price;
                  return (
                    <label
                      key={sauce.id}
                      className={cn(
                        'group relative flex items-center gap-4 p-4 rounded-xl border-2 bg-white cursor-pointer transition-all duration-300',
                        isSelected
                          ? 'border-[#E6411C] bg-[#E6411C]/[0.03]'
                          : 'border-gray-100 hover:border-[#E6411C]/50',
                        !sauce.available && 'opacity-50 pointer-events-none'
                      )}
                    >
                      <img
                        src={sauce.image_url}
                        alt={sauce.name}
                        loading="lazy"
                        decoding="async"
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[#212282] font-bold text-lg">{sauce.name}</h3>
                          {sauce.is_popular && <Flame className="w-4 h-4 text-[#E6411C]" />}
                        </div>
                        <p className="text-[#E6411C] text-sm font-semibold mt-0.5">
                          {formatPrice(basePrice)}
                        </p>
                      </div>
                      <div className="relative flex items-center justify-center w-6 h-6">
                        <input
                          type="radio"
                          name="sauce"
                          checked={isSelected}
                          onChange={() => selectSauce(sauce)}
                          className="peer appearance-none w-6 h-6 border-2 border-gray-300 rounded-full checked:border-[#E6411C] checked:border-[6px] transition-all bg-white"
                          disabled={!sauce.available}
                        />
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Choose Your FREE Side Dish */}
          {step === 3 && (
            <div className="animate-in fade-in duration-300">
              <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2 sm:pb-3">
                <h1 className="text-xl sm:text-[28px] font-extrabold leading-[1.1] text-[#212282] mb-1 sm:mb-2">
                  Choose Your <span className="text-[#E6411C]">FREE</span> Side Dish
                </h1>
                <p className="text-xs sm:text-base text-gray-600 leading-relaxed">
                  Every order comes with a free side dish of your choice!
                </p>
              </div>

              <div className="flex flex-col gap-3 px-4 pb-4">
                {sideDishes.map((side) => {
                  const isSelected = combo.sideDish === side.name;
                  return (
                    <label
                      key={side.id}
                      className={cn(
                        'group relative cursor-pointer block',
                        !side.available && 'opacity-50 pointer-events-none'
                      )}
                    >
                      <input
                        type="radio"
                        name="side-dish"
                        checked={isSelected}
                        onChange={() => selectSideDish(side.name)}
                        className="sr-only"
                        disabled={!side.available}
                      />
                      <div
                        className={cn(
                          'flex items-center gap-4 bg-white p-3 rounded-2xl border-2 transition-all duration-200',
                          isSelected
                            ? 'border-[#E6411C] bg-[#FFF8F6]'
                            : 'border-transparent hover:border-gray-200'
                        )}
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={side.image_url}
                            alt={side.name}
                            loading="lazy"
                            decoding="async"
                            width={80}
                            height={80}
                            className="w-20 h-20 rounded-xl object-cover shadow-inner"
                          />
                          <span className="absolute -top-2 -left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border border-white">
                            Free
                          </span>
                        </div>
                        <div className="flex flex-col flex-1 min-w-0 py-1">
                          <p className="text-[#212282] text-lg font-bold leading-tight truncate pr-2">
                            {side.name}
                          </p>
                          <p className="text-[#E6411C] text-xs font-bold mt-1.5 uppercase tracking-wide">
                            Included
                          </p>
                        </div>
                        <div className="flex-shrink-0 pr-2">
                          <div
                            className={cn(
                              'w-6 h-6 rounded-full border-2 relative transition-colors',
                              isSelected ? 'border-[#E6411C] bg-[#E6411C]' : 'border-gray-300'
                            )}
                          >
                            {isSelected && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Add Extras */}
          {step === 4 && (
            <div className="animate-in fade-in duration-300">
              <div className="px-4 pt-5 pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-[#212282] tracking-tight text-2xl sm:text-[28px] font-extrabold leading-tight">
                      Add Extras
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                      Optional add-ons to complete your meal
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      vibrate();
                      setStep(5);
                    }}
                    className="shrink-0 px-4 py-2 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-bold hover:border-[#212282] hover:text-[#212282] transition-all"
                  >
                    Skip →
                  </button>
                </div>
              </div>

              {/* Juices Section */}
              {juices.length > 0 && (
                <section className="mb-4 sm:mb-6">
                  <div className="px-4 mb-2 sm:mb-3 flex justify-between items-end">
                    <div>
                      <h3 className="text-[#212282] text-lg sm:text-xl font-bold leading-tight tracking-tight">
                        Natural Juice
                      </h3>
                      <p className="text-gray-500 text-xs sm:text-sm font-medium mt-0.5 sm:mt-1">
                        Freshly squeezed • 100% Natural
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 px-4 md:grid-cols-3 lg:grid-cols-4">
                    {juices.map((juice) => {
                      const extra = combo.extras.find((e) => e.item.id === juice.id);
                      const qty = extra?.quantity || 0;
                      return (
                        <div
                          key={juice.id}
                          className={cn(
                            'group relative flex flex-col bg-white rounded-xl overflow-hidden border-2 transition-all',
                            qty > 0 ? 'border-[#E6411C]' : 'border-gray-100 hover:border-gray-200',
                            !juice.available && 'opacity-50 pointer-events-none'
                          )}
                        >
                          <div className="aspect-square w-full bg-gray-100 relative overflow-hidden">
                            <img
                              src={juice.image_url}
                              alt={juice.name}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                          <div className="p-3 flex flex-col flex-1 justify-between">
                            <div className="mb-2">
                              <p className="text-[#212282] text-base font-bold leading-tight">
                                {juice.name}
                              </p>
                              <p className="text-gray-500 text-xs mt-0.5">
                                {formatPrice(juice.price)}
                              </p>
                            </div>
                            {qty > 0 ? (
                              <div className="flex items-center justify-between bg-[#E6411C]/10 rounded-lg p-1">
                                <button
                                  onClick={() => updateExtra(juice, -1)}
                                  className="size-8 flex items-center justify-center rounded-md bg-white text-[#E6411C] shadow-sm hover:scale-105 transition-transform"
                                  aria-label={`Decrease ${juice.name} quantity`}
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="text-[#E6411C] font-bold text-sm w-6 text-center">
                                  {qty}
                                </span>
                                <button
                                  onClick={() => updateExtra(juice, 1)}
                                  className="size-8 flex items-center justify-center rounded-md bg-[#E6411C] text-white shadow-sm hover:scale-105 transition-transform"
                                  aria-label={`Increase ${juice.name} quantity`}
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => updateExtra(juice, 1)}
                                className="w-full h-9 flex items-center justify-center rounded-xl border border-gray-200 text-[#212282] text-sm font-bold hover:bg-gray-50 transition-colors"
                              >
                                Add +
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Desserts Section */}
              {desserts.length > 0 && (
                <section className="mb-4 sm:mb-6">
                  <div className="px-4 mb-2 sm:mb-3 flex justify-between items-end">
                    <div>
                      <h3 className="text-[#212282] text-lg sm:text-xl font-bold leading-tight tracking-tight">
                        Desserts
                      </h3>
                      <p className="text-gray-500 text-xs sm:text-sm font-medium mt-0.5 sm:mt-1">
                        Sweet treats to finish your meal
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 px-4 md:grid-cols-3 lg:grid-cols-4">
                    {desserts.map((dessert) => {
                      const extra = combo.extras.find((e) => e.item.id === dessert.id);
                      const qty = extra?.quantity || 0;
                      return (
                        <div
                          key={dessert.id}
                          className={cn(
                            'group relative flex flex-col bg-white rounded-xl overflow-hidden border-2 transition-all',
                            qty > 0 ? 'border-[#E6411C]' : 'border-gray-100 hover:border-gray-200',
                            !dessert.available && 'opacity-50 pointer-events-none'
                          )}
                        >
                          <div className="aspect-square w-full bg-gray-100 relative overflow-hidden">
                            <img
                              src={dessert.image_url}
                              alt={dessert.name}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                          <div className="p-3 flex flex-col flex-1 justify-between">
                            <div className="mb-2">
                              <p className="text-[#212282] text-base font-bold leading-tight">
                                {dessert.name}
                              </p>
                              <p className="text-gray-500 text-xs mt-0.5">
                                {formatPrice(dessert.price)}
                              </p>
                            </div>
                            {qty > 0 ? (
                              <div className="flex items-center justify-between bg-[#E6411C]/10 rounded-lg p-1">
                                <button
                                  onClick={() => updateExtra(dessert, -1)}
                                  className="size-8 flex items-center justify-center rounded-md bg-white text-[#E6411C] shadow-sm hover:scale-105 transition-transform"
                                  aria-label={`Decrease ${dessert.name} quantity`}
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="text-[#E6411C] font-bold text-sm w-6 text-center">
                                  {qty}
                                </span>
                                <button
                                  onClick={() => updateExtra(dessert, 1)}
                                  className="size-8 flex items-center justify-center rounded-md bg-[#E6411C] text-white shadow-sm hover:scale-105 transition-transform"
                                  aria-label={`Increase ${dessert.name} quantity`}
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => updateExtra(dessert, 1)}
                                className="w-full h-9 flex items-center justify-center rounded-xl border border-gray-200 text-[#212282] text-sm font-bold hover:bg-gray-50 transition-colors"
                              >
                                Add +
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Step 5: Review Your Combo */}
          {step === 5 && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <div className="px-4 sm:px-5 pt-5 sm:pt-6 pb-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#212282] tracking-tight mb-1">
                  Review Your Combo
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">
                  Almost there! Check your selections below.
                </p>
              </div>

              <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
                {/* Quantity Selector */}
                <div className="bg-gradient-to-r from-[#212282] to-[#2d2da8] rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-white/70 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-0.5 sm:mb-1">
                        How Many?
                      </p>
                      <p className="text-white text-base sm:text-lg font-bold">Combo Quantity</p>
                    </div>
                    <div
                      className="flex items-center gap-2 sm:gap-3 bg-white/10 rounded-lg sm:rounded-xl p-0.5 sm:p-1 shrink-0"
                      role="group"
                      aria-label="Combo quantity"
                    >
                      <button
                        onClick={() => updateQuantity(-1)}
                        disabled={combo.quantity <= 1}
                        aria-label="Decrease combo quantity"
                        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-md sm:rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                      </button>
                      <span
                        className="w-6 sm:w-8 text-center text-white text-lg sm:text-xl font-bold"
                        aria-live="polite"
                      >
                        {combo.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(1)}
                        aria-label="Increase combo quantity"
                        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-md sm:rounded-lg bg-[#E6411C] text-white hover:bg-[#d13a18] transition-colors"
                      >
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Main Dishes */}
                <ReviewSection title="Main Dishes" onEdit={() => setStep(1)}>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {combo.mainDishes.map((name) => (
                      <span
                        key={name}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-50 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold text-[#212282]"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </ReviewSection>

                {/* Sauce */}
                <ReviewSection title="Sauce Selection" onEdit={() => setStep(2)}>
                  <div className="flex items-center gap-3 sm:gap-4">
                    {combo.sauce && (
                      <img
                        src={combo.sauce.image_url}
                        alt=""
                        className="size-10 sm:size-12 rounded-lg sm:rounded-xl object-cover"
                      />
                    )}
                    <div>
                      <p className="text-sm sm:text-base font-bold text-[#212282]">
                        {combo.sauce?.name || 'None'}
                        {combo.saucePreparation &&
                          combo.saucePreparation !== 'Default' &&
                          ` (${combo.saucePreparation})`}
                      </p>
                      <p className="text-[11px] sm:text-xs text-[#E6411C] font-semibold">
                        {formatPrice(
                          combo.sauceSize?.price ||
                            combo.sauce?.sizes?.[0]?.price ||
                            combo.sauce?.price ||
                            0
                        )}
                      </p>
                    </div>
                  </div>
                </ReviewSection>

                {/* Side Dish */}
                <ReviewSection title="Free Side Dish" onEdit={() => setStep(3)}>
                  <div className="flex items-center gap-3 sm:gap-4">
                    {combo.sideDish && (
                      <img
                        src={sideDishes.find((s) => s.name === combo.sideDish)?.image_url || ''}
                        alt=""
                        className="size-10 sm:size-12 rounded-lg sm:rounded-xl object-cover"
                      />
                    )}
                    <div>
                      <p className="text-sm sm:text-base font-bold text-[#212282]">
                        {combo.sideDish || 'None selected'}
                      </p>
                      <p className="text-[10px] sm:text-xs text-green-600 font-bold uppercase tracking-wider">
                        Free & Included
                      </p>
                    </div>
                  </div>
                </ReviewSection>

                {/* Extras */}
                {combo.extras.length > 0 && (
                  <ReviewSection title="Extra Add-ons" onEdit={() => setStep(4)}>
                    <div className="space-y-1.5 sm:space-y-2">
                      {combo.extras.map((e) => (
                        <div key={e.item.id} className="flex justify-between items-center text-xs sm:text-sm">
                          <span className="font-medium text-gray-700">
                            {e.quantity}x {e.item.name}
                          </span>
                          <span className="font-bold text-[#212282]">
                            {formatPrice(e.item.price * e.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ReviewSection>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Sticky Footer */}
        <footer className="absolute bottom-0 left-0 right-0 z-30">
          <div
            className={cn(
              'p-4 pb-8 sm:p-5 sm:pb-6 md:p-6 md:pb-5',
              step >= 2 ? 'bg-[#212282]' : 'bg-white border-t border-gray-100'
            )}
          >
            <div className="flex flex-col gap-3 sm:gap-4 max-w-xl mx-auto">
              {/* Order Summary */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-[10px] sm:text-xs font-medium uppercase tracking-wider mb-0.5 sm:mb-1',
                      step >= 2 ? 'text-white/60' : 'text-gray-500'
                    )}
                  >
                    Your Combo
                  </p>
                  <p
                    className={cn(
                      'text-sm font-medium leading-relaxed truncate',
                      step >= 2 ? 'text-white/80' : 'text-[#212282]'
                    )}
                  >
                    {summaryText}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p
                    className={cn(
                      'text-[10px] sm:text-xs font-medium uppercase tracking-wider mb-0.5 sm:mb-1',
                      step >= 2 ? 'text-white/60' : 'text-gray-500'
                    )}
                  >
                    Total
                  </p>
                  <p
                    className={cn(
                      'text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight',
                      step >= 2 ? 'text-white' : 'text-[#212282]'
                    )}
                  >
                    {formatPrice(totalPrice)}
                  </p>
                  {step === 5 && combo.quantity > 1 && (
                    <p className={cn('text-[10px] font-medium', step >= 2 ? 'text-white/50' : 'text-gray-400')}>
                      {formatPrice(unitPrice)} each
                    </p>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  if (step < 5) {
                    vibrate();
                    setStep(step + 1);
                  } else {
                    handleAddToCart();
                  }
                }}
                disabled={!canProceed}
                className={cn(
                  'w-full flex items-center justify-center gap-2 rounded-xl h-12 sm:h-13 md:h-14 text-white text-base sm:text-lg font-bold shadow-md transition-all duration-300',
                  'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] hover:shadow-lg',
                  'bg-[#E6411C] hover:bg-[#d13a18]'
                )}
              >
                <span>{getNextButtonText()}</span>
                {step < 5 && <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </footer>

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-100">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-100">
              <h3 className="text-xl font-extrabold text-[#212282] mb-2">Close Combo Builder?</h3>
              <p className="text-gray-500 text-sm font-medium mb-6">
                Don't worry! Your progress will be saved automatically so you can finish your combo later.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="w-full h-12 rounded-xl bg-[#E6411C] text-white font-bold hover:bg-[#d13a18] transition-colors shadow-sm"
                >
                  Continue Building
                </button>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    onClose();
                  }}
                  className="w-full h-12 rounded-xl border-2 border-gray-100 text-gray-500 font-bold hover:bg-gray-50 transition-colors"
                >
                  Save & Close
                </button>
                <button
                  onClick={() => {
                    resetBuilder();
                    setShowCancelModal(false);
                    onClose();
                  }}
                  className="w-full py-2 text-xs font-bold text-red-400 hover:text-red-600 transition-colors"
                >
                  Discard Draft
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Confirmation Modal */}
        {showResetModal && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-100">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-100">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-xl font-extrabold text-[#212282] mb-2 text-center">Start Fresh?</h3>
              <p className="text-gray-500 text-sm font-medium mb-6 text-center">
                This will clear all your current selections and start a new combo from scratch.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="w-full h-12 rounded-xl bg-[#E6411C] text-white font-bold hover:bg-[#d13a18] transition-colors shadow-sm"
                >
                  Keep My Selections
                </button>
                <button
                  onClick={() => {
                    vibrate();
                    resetBuilder();
                    setShowResetModal(false);
                  }}
                  className="w-full py-3 text-sm font-bold text-red-500 hover:text-red-700 transition-colors uppercase tracking-wider"
                >
                  Yes, Start Fresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Overlay */}
        {showSuccessOverlay && (
          <div
            className="absolute inset-0 z-[110] flex items-center justify-center p-6 bg-[#212282] text-white animate-in fade-in duration-200"
            onClick={() => {
              setShowSuccessOverlay(false);
              resetBuilder();
              onClose();
            }}
          >
            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSuccessOverlay(false);
                resetBuilder();
                onClose();
              }}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            <div
              className="text-center animate-in zoom-in-90 duration-500 flex flex-col items-center max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="size-24 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6">
                <Check className="size-12 text-white" strokeWidth={4} />
              </div>
              <h2 className="text-4xl font-black mb-2 tracking-tight">
                {combo.quantity > 1 ? `${combo.quantity} Combos` : 'Added to Cart!'}
              </h2>
              <p className="text-white/60 font-bold uppercase tracking-widest text-sm mb-4">
                {combo.quantity > 1 ? 'Added to Cart!' : 'Great Selection'}
              </p>
              {combo.quantity > 1 && (
                <p className="text-white/80 text-lg font-bold mb-8">Total: {formatPrice(totalPrice)}</p>
              )}

              <div
                className={cn(
                  'flex flex-row gap-2 sm:gap-3 w-full px-2 sm:px-4',
                  combo.quantity > 1 ? '' : 'mt-6 sm:mt-8'
                )}
              >
                <button
                  onClick={() => {
                    setShowSuccessOverlay(false);
                    resetBuilder();
                    onClose();
                  }}
                  className="flex-1 h-11 sm:h-14 rounded-xl border-2 border-white/20 font-bold text-xs sm:text-base hover:bg-white/10 transition-colors flex items-center justify-center px-2 sm:px-6"
                >
                  <span className="sm:hidden">Add More</span>
                  <span className="hidden sm:inline">Order More Items</span>
                </button>
                <button
                  onClick={() => {
                    setShowSuccessOverlay(false);
                    resetBuilder();
                    onClose();
                    navigate('/cart');
                  }}
                  className="flex-1 h-11 sm:h-14 rounded-xl bg-[#E6411C] flex items-center justify-center font-bold text-xs sm:text-base hover:bg-[#d13a18] transition-colors shadow-lg px-2 sm:px-6"
                >
                  <span className="sm:hidden">Checkout</span>
                  <span className="hidden sm:inline">Proceed to Checkout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Review Section Component
function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-2 sm:mb-3">
        <div className="flex items-center gap-2">
          <div className="size-6 sm:size-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
            <Check className="w-3 h-3 sm:w-4 sm:h-4" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-[#212282]">{title}</h3>
        </div>
        <button
          onClick={() => {
            vibrate();
            onEdit();
          }}
          className="text-[#E6411C] text-xs font-bold hover:underline"
        >
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}
