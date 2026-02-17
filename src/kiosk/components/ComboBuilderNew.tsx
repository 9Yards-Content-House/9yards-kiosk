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
import { useTranslation } from '@shared/context/LanguageContext';
import { useKioskCart } from '../context/KioskCartContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { MenuItem, SauceSize } from '@shared/types';
import { cn, formatPrice, vibrate } from '@shared/lib/utils';
import { useSound } from '../hooks/useSound';

interface ComboBuilderProps {
  open: boolean;
  onClose: () => void;
  initialSauce?: MenuItem;
  initialMainDishes?: string[];
  initialSideDish?: string;
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
  { num: 1, labelKey: 'combo.step1Title' },
  { num: 2, labelKey: 'combo.step2Title' },
  { num: 3, labelKey: 'combo.step3Title' },
  { num: 4, labelKey: 'combo.step4Title' },
  { num: 5, labelKey: 'combo.step5Title' },
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
  initialMainDishes,
  initialSideDish,
  editingItemId,
}: ComboBuilderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: groupedMenu = [], isLoading: menuLoading, error: menuError } = useGroupedMenu();
  const { addItem, removeItem, updateItem, items } = useKioskCart();
  const { vibrationEnabled } = useAccessibility();
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

  // Get all available items flattened from grouped menu
  const allItems = useMemo(() => 
    groupedMenu.flatMap((g) => g.items).filter((item) => item.available),
    [groupedMenu]
  );

  // Get items by item_type (cleaner than using category slugs)
  const getItemsByType = (itemType: 'combo_component' | 'combo_driver' | 'standalone'): MenuItem[] => {
    return allItems.filter((item) => item.item_type === itemType);
  };

  // Helper to get combo components split by category (for UI step separation)
  const getComboComponentsByCategory = (categorySlug: string): MenuItem[] => {
    const group = groupedMenu.find((g) => g.category.slug === categorySlug);
    return group?.items.filter((item) => item.available && item.item_type === 'combo_component') || [];
  };

  // Get items by their role in the combo
  const mainDishes = getComboComponentsByCategory('main-dishes');
  const sauces = getItemsByType('combo_driver');
  const sideDishes = getComboComponentsByCategory('side-dishes');
  const extrasItems = useMemo(() => getItemsByType('standalone'), [allItems]);

  // Split extras into juices and desserts for UI sections
  const juices = useMemo(() => {
    return extrasItems.filter(item => {
      const group = groupedMenu.find(g => g.items.some(i => i.id === item.id));
      return group?.category.slug === 'juices';
    });
  }, [extrasItems, groupedMenu]);

  const desserts = useMemo(() => {
    return extrasItems.filter(item => {
      const group = groupedMenu.find(g => g.items.some(i => i.id === item.id));
      return group?.category.slug === 'desserts';
    });
  }, [extrasItems, groupedMenu]);

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
  // Initialize state when opening
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }

    if (initializedRef.current) return;
    initializedRef.current = true;

    // 1. Editing an existing cart item
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

    // 2. Starting fresh with pre-selected items (Override drafts)
    if (initialMainDishes?.length || initialSauce || initialSideDish) {
      const newCombo = {
        mainDishes: initialMainDishes || [],
        sauce: initialSauce || null,
        saucePreparation: initialSauce?.preparations?.[0]
          ? typeof initialSauce.preparations[0] === 'string'
            ? initialSauce.preparations[0]
            : initialSauce.preparations[0].name
          : '',
        sauceSize: initialSauce?.sizes?.[0] || null,
        sideDish: initialSideDish || null,
        extras: [],
        quantity: 1,
      };

      setCombo(newCombo);

      // Determine starting step based on what's missing
      // User request: Always start from beginning even if items are pre-selected
      setStep(1);
      return;
    }

    // 3. Resuming a draft (Only if no specific overrides)
    const draft = loadDraft();
    if (draft) {
      // Validate draft contents against current menu
      const restoredSauce = draft.combo.sauce
        ? sauces.find((s) => s.id === draft.combo.sauce?.id) || null
        : null;

      const restoredExtras = draft.combo.extras
        .map((e) => {
          const item = extrasItems.find((ei) => ei.id === e.item?.id);
          return item ? { item, quantity: e.quantity } : null;
        })
        .filter(Boolean) as Array<{ item: MenuItem; quantity: number }>;

      setCombo({
        ...draft.combo,
        sauce: restoredSauce,
        extras: restoredExtras,
      });
      setStep(draft.step);
      setShowDraftBanner(true);
      return;
    }

    // 4. Default clean state
    setCombo({
      mainDishes: [],
      sauce: null,
      saucePreparation: '',
      sauceSize: null,
      sideDish: null,
      extras: [],
      quantity: 1,
    });
    setStep(1);
  }, [open, editingItemId, initialMainDishes, initialSauce, initialSideDish, items, sauces, extrasItems]);

  // Auto-close draft banner
  useEffect(() => {
    if (showDraftBanner) {
      const timer = setTimeout(() => setShowDraftBanner(false), 7000);
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
        return `${t('common.next')}: ${t('combo.step2Title')}`;
      case 2:
        return `${t('common.next')}: ${t('combo.step3Title')}`;
      case 3:
        return `${t('common.next')}: ${t('combo.step4Title')}`;
      case 4:
        return t('combo.step5Title');
      case 5:
        return t('menu.addToOrder');
      default:
        return t('common.next');
    }
  };

  // Selection handlers
  const toggleMainDish = useCallback((name: string) => {
    if (vibrationEnabled) {
      vibrate();
    }
    play('select');
    setCombo((prev) => ({
      ...prev,
      mainDishes: prev.mainDishes.includes(name)
        ? prev.mainDishes.filter((d) => d !== name)
        : [...prev.mainDishes, name],
    }));
  }, [play, vibrationEnabled]);

  const selectSauce = useCallback((sauce: MenuItem) => {
    if (vibrationEnabled) {
      vibrate();
    }
    play('select');
    const firstPrep = sauce.preparations?.[0];
    const prepName = typeof firstPrep === 'string' ? firstPrep : firstPrep?.name || '';
    setCombo((prev) => ({
      ...prev,
      sauce,
      saucePreparation: prepName,
      sauceSize: sauce.sizes && sauce.sizes.length > 0 ? sauce.sizes[0] : null,
    }));
  }, [play, vibrationEnabled]);

  const selectSideDish = useCallback((name: string) => {
    if (vibrationEnabled) {
      vibrate();
    }
    play('select');
    setCombo((prev) => ({ ...prev, sideDish: name }));
  }, [play, vibrationEnabled]);

  const updateExtra = useCallback((item: MenuItem, delta: number) => {
    if (vibrationEnabled) {
      vibrate();
    }
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
  }, [play, vibrationEnabled]);

  const updateQuantity = useCallback((delta: number) => {
    if (vibrationEnabled) {
      vibrate();
    }
    play('tap');
    setCombo((prev) => ({ ...prev, quantity: Math.max(1, prev.quantity + delta) }));
  }, [play, vibrationEnabled]);

  // Handle add to cart
  const handleAddToCart = useCallback(() => {
    if (!combo.sauce) return;

    if (vibrationEnabled) {
      vibrate([50, 50, 50]);
    }
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
      updateItem(editingItemId, cartItem);
    } else {
      addItem(cartItem);
    }
    clearDraft();

    setShowSuccessOverlay(true);
  }, [combo, editingItemId, addItem, updateItem, play, vibrationEnabled]);

  // Auto-close success overlay and modal
  useEffect(() => {
    if (showSuccessOverlay) {
      const timer = setTimeout(() => {
        setShowSuccessOverlay(false);
        onClose();
        resetBuilder();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessOverlay, onClose, resetBuilder]);

  // Show loading state
  if (menuLoading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-3xl p-8 flex flex-col items-center">
          <div className="animate-spin w-12 h-12 border-4 border-secondary border-t-transparent rounded-full mb-4" />
          <p className="text-gray-900 font-medium">Loading menu...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (menuError) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Menu</h3>
          <p className="text-gray-600 mb-6">Please try again later.</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-secondary text-white rounded-full font-bold"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

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
          'relative w-full max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl h-[95vh] md:h-[90vh] md:max-h-[800px] xl:max-h-[900px]',
          'md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col',
          'transition-colors duration-500',
          step === 1 ? 'bg-white' : 'bg-[#FAFAFA]'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="combo-builder-title"
      >
        {/* Header */}
        <header className="flex-none bg-white px-4 pt-4 pb-3 md:px-6 md:pt-6 md:pb-4 shadow-sm z-20 border-b border-gray-100">
          {/* Step Labels - Desktop/Tablet */}
          <div className="hidden sm:flex justify-center gap-1 mb-3 lg:mb-4">
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
                  aria-current={s.num === step ? 'step' : undefined}
                  aria-label={`Step ${s.num} of ${STEPS.length}: ${t(s.labelKey as any)}${s.num < step ? ' (completed)' : s.num === step ? ' (current)' : ''}`}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full text-xs lg:text-sm font-bold transition-all',
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
                  <span className="hidden md:inline">{t(s.labelKey as any)}</span>
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
                className="flex size-10 md:size-12 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-[#212282]"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            ) : (
              <div className="size-10 md:size-12" />
            )}

            {/* Mobile Step Indicator */}
            <div className="flex flex-col items-center sm:hidden">
              <span className="text-xs font-bold uppercase tracking-widest text-[#E6411C]">
                {t('common.next')}: {[
                  t('combo.step1Title'),
                  t('combo.step2Title'),
                  t('combo.step3Title'),
                  t('combo.step4Title'),
                  t('combo.step5Title')
                ][step - 1]}
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
                {t('common.next')}: {[
                  t('combo.step1Title'),
                  t('combo.step2Title'),
                  t('combo.step3Title'),
                  t('combo.step4Title'),
                  t('combo.step5Title')
                ][step - 1]}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {hasSelections && (
                <button
                  onClick={() => setShowResetModal(true)}
                  className="flex h-10 md:h-12 items-center justify-center rounded-full px-2 hover:bg-gray-100 transition-colors text-gray-500 mr-1"
                  title="Start Fresh"
                >
                  <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              )}
              <button
                onClick={handleClose}
                className="flex h-10 md:h-12 items-center justify-center rounded-full px-2 hover:bg-red-50 transition-colors"
              >
                <span className="text-[#E6411C] text-sm md:text-base font-bold">Cancel</span>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main
          ref={mainContentRef}
          className={cn(
            'flex-1 overflow-y-auto pb-44 md:pb-52 transition-colors duration-500',
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
              <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 md:px-6 md:pt-6 md:pb-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h1
                    id="combo-builder-title"
                    className="text-xl sm:text-[28px] md:text-3xl lg:text-4xl font-extrabold leading-tight tracking-tight text-[#212282]"
                  >
                    {t('combo.step1Title')}
                  </h1>
                  {combo.mainDishes.length > 0 && (
                    <span className="shrink-0 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-[#E6411C] text-white text-xs sm:text-sm md:text-base font-bold whitespace-nowrap">
                      {combo.mainDishes.length} {t('menu.itemsInCategory')}
                    </span>
                  )}
                </div>
                <p className="text-sm sm:text-base md:text-lg text-gray-500 font-medium">
                  {t('combo.step1Desc')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 px-4 py-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 md:px-6 md:py-6">
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
                          <span className="text-sm sm:text-base font-bold text-[#212282]">{dish.name}</span>
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
              <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2 md:px-6 md:pt-6 md:pb-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[#212282] tracking-tight">
                    {t('combo.step2Title')}
                  </h1>
                  <span className="shrink-0 px-1.5 sm:px-2 py-0.5 rounded-full bg-[#E6411C]/10 text-[#E6411C] text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider border border-[#E6411C]/20">
                    {t('common.required')}
                  </span>
                </div>
                <p className="text-xs sm:text-sm md:text-lg text-gray-500">
                  {t('combo.step2Desc')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 md:p-6">
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
                        className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[#212282] font-bold text-lg md:text-xl">{sauce.name}</h3>
                          {sauce.is_popular && <Flame className="w-4 h-4 text-[#E6411C]" />}
                        </div>
                        <p className="text-[#E6411C] text-sm md:text-base font-semibold mt-0.5">
                          {formatPrice(basePrice)}
                        </p>
                      </div>
                      <div className="relative flex items-center justify-center w-6 h-6 md:w-8 md:h-8">
                        <input
                          type="radio"
                          name="sauce"
                          checked={isSelected}
                          onChange={() => selectSauce(sauce)}
                          className="peer appearance-none w-6 h-6 md:w-8 md:h-8 border-2 border-gray-300 rounded-full checked:border-[#E6411C] checked:border-[6px] transition-all bg-white"
                          disabled={!sauce.available}
                        />
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Choose Your Side Dish */}
          {step === 3 && (
            <div className="animate-in fade-in duration-300">
              <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2 sm:pb-3 md:px-6 md:pt-6 md:pb-4">
                <h1 className="text-xl sm:text-[28px] md:text-3xl lg:text-4xl font-extrabold leading-[1.1] text-[#212282] mb-1 sm:mb-2">
                  {t('combo.step3Title')}
                </h1>
                <p className="text-xs sm:text-base md:text-lg text-gray-600 leading-relaxed">
                  {t('combo.step3Desc')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 px-4 pb-4 md:px-6 md:pb-6">
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
                          'flex items-center gap-4 bg-white p-3 rounded-2xl border-2 transition-all duration-200 h-full',
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
                            className="w-20 h-20 md:w-24 md:h-24 rounded-xl object-cover shadow-inner"
                          />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0 py-1">
                          <p className="text-[#212282] text-lg md:text-xl font-bold leading-tight truncate pr-2">
                            {side.name}
                          </p>
                          <p className="text-gray-500 text-xs md:text-sm font-medium mt-1.5 uppercase tracking-wide">
                            {t('combo.includedFree')}
                          </p>
                        </div>
                        <div className="flex-shrink-0 pr-2">
                          <div
                            className={cn(
                              'w-6 h-6 md:w-8 md:h-8 rounded-full border-2 relative transition-colors',
                              isSelected ? 'border-[#E6411C] bg-[#E6411C]' : 'border-gray-300'
                            )}
                          >
                            {isSelected && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-white" />
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
              <div className="px-4 pt-5 pb-3 md:px-6 md:pt-6 md:pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-[#212282] tracking-tight text-2xl sm:text-[28px] md:text-3xl lg:text-4xl font-extrabold leading-tight">
                      {t('combo.step4Title')}
                    </h1>
                    <p className="text-gray-500 text-sm md:text-lg mt-1">
                      {t('combo.step4Desc')}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      vibrate();
                      setStep(5);
                    }}
                    className="shrink-0 px-4 py-2 md:px-6 md:py-3 rounded-xl border-2 border-gray-200 text-gray-600 text-sm md:text-base font-bold hover:border-[#212282] hover:text-[#212282] transition-all"
                  >
                    {t('common.skip')} →
                  </button>
                </div>
              </div>

              {/* Juices Section */}
              {juices.length > 0 && (
                <section className="mb-4 sm:mb-6 md:mb-8">
                  <div className="px-4 mb-2 sm:mb-3 md:px-6 md:mb-4 flex justify-between items-end">
                    <div>
                      <h3 className="text-[#212282] text-lg sm:text-xl md:text-2xl font-bold leading-tight tracking-tight">
                        {t('category.juices')}
                      </h3>
                      <p className="text-gray-500 text-xs sm:text-sm md:text-base font-medium mt-0.5 sm:mt-1">
                        Freshly squeezed • 100% Natural
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 px-4 md:px-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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
                              <p className="text-[#212282] text-base md:text-lg font-bold leading-tight">
                                {juice.name}
                              </p>
                              <p className="text-gray-500 text-xs md:text-sm mt-0.5">
                                {formatPrice(juice.price)}
                              </p>
                            </div>
                            {qty > 0 ? (
                              <div className="flex items-center justify-between bg-[#E6411C]/10 rounded-lg p-1">
                                <button
                                  onClick={() => updateExtra(juice, -1)}
                                  className="size-8 md:size-10 flex items-center justify-center rounded-md bg-white text-[#E6411C] shadow-sm hover:scale-105 transition-transform"
                                  aria-label={`Decrease ${juice.name} quantity`}
                                >
                                  <Minus className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                                <span className="text-[#E6411C] font-bold text-sm md:text-base w-6 text-center">
                                  {qty}
                                </span>
                                <button
                                  onClick={() => updateExtra(juice, 1)}
                                  className="size-8 md:size-10 flex items-center justify-center rounded-md bg-[#E6411C] text-white shadow-sm hover:scale-105 transition-transform"
                                  aria-label={`Increase ${juice.name} quantity`}
                                >
                                  <Plus className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => updateExtra(juice, 1)}
                                className="w-full h-9 md:h-11 flex items-center justify-center rounded-xl border border-gray-200 text-[#212282] text-sm md:text-base font-bold hover:bg-gray-50 transition-colors"
                              >
                                {t('common.add')} +
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Divider between Juices and Desserts */}
              {juices.length > 0 && desserts.length > 0 && (
                <div className="px-4 mb-6">
                  <div className="h-px bg-gray-100" />
                </div>
              )}

              {/* Desserts Section */}
              {desserts.length > 0 && (
                <section className="mb-4 sm:mb-6 md:mb-8">
                  <div className="px-4 mb-2 sm:mb-3 md:px-6 md:mb-4 flex justify-between items-end">
                    <div>
                      <h3 className="text-[#212282] text-lg sm:text-xl md:text-2xl font-bold leading-tight tracking-tight">
                        {t('category.desserts')}
                      </h3>
                      <p className="text-gray-500 text-xs sm:text-sm md:text-base font-medium mt-0.5 sm:mt-1">
                        Sweet treats to finish your meal
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 px-4 md:px-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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
                              <p className="text-[#212282] text-base md:text-lg font-bold leading-tight">
                                {dessert.name}
                              </p>
                              <p className="text-gray-500 text-xs md:text-sm mt-0.5">
                                {formatPrice(dessert.price)}
                              </p>
                            </div>
                            {qty > 0 ? (
                              <div className="flex items-center justify-between bg-[#E6411C]/10 rounded-lg p-1">
                                <button
                                  onClick={() => updateExtra(dessert, -1)}
                                  className="size-8 md:size-10 flex items-center justify-center rounded-md bg-white text-[#E6411C] shadow-sm hover:scale-105 transition-transform"
                                  aria-label={`Decrease ${dessert.name} quantity`}
                                >
                                  <Minus className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                                <span className="text-[#E6411C] font-bold text-sm md:text-base w-6 text-center">
                                  {qty}
                                </span>
                                <button
                                  onClick={() => updateExtra(dessert, 1)}
                                  className="size-8 md:size-10 flex items-center justify-center rounded-md bg-[#E6411C] text-white shadow-sm hover:scale-105 transition-transform"
                                  aria-label={`Increase ${dessert.name} quantity`}
                                >
                                  <Plus className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => updateExtra(dessert, 1)}
                                className="w-full h-9 md:h-11 flex items-center justify-center rounded-xl border border-gray-200 text-[#212282] text-sm md:text-base font-bold hover:bg-gray-50 transition-colors"
                              >
                                {t('common.add')} +
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
              <div className="px-4 sm:px-5 pt-5 sm:pt-6 pb-2 md:px-6 md:pt-8 md:pb-4">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-[#212282] tracking-tight mb-1">
                  {t('combo.step5Title')}
                </h1>
                <p className="text-xs sm:text-sm md:text-lg text-gray-500 font-medium">
                  {t('combo.step5Desc')}
                </p>
              </div>

              <div className="p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
                {/* Quantity Selector */}
                <div className="bg-gradient-to-r from-[#212282] to-[#2d2da8] rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-lg">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-white/70 text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-wider mb-0.5 sm:mb-1">
                        {t('combo.quantityLabel')}
                      </p>
                      <p className="text-white text-base sm:text-lg md:text-2xl font-bold">{t('combo.selectSize')}</p>
                    </div>
                    <div
                      className="flex items-center gap-2 sm:gap-3 md:gap-4 bg-white/10 rounded-lg sm:rounded-xl p-0.5 sm:p-1 shrink-0"
                      role="group"
                      aria-label="Combo quantity"
                    >
                      <button
                        onClick={() => updateQuantity(-1)}
                        disabled={combo.quantity <= 1}
                        aria-label="Decrease combo quantity"
                        className="w-9 h-9 sm:w-10 sm:h-10 md:w-14 md:h-14 flex items-center justify-center rounded-md sm:rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" aria-hidden="true" />
                      </button>
                      <span
                        className="w-6 sm:w-8 md:w-12 text-center text-white text-lg sm:text-xl md:text-3xl font-bold"
                        aria-live="polite"
                      >
                        {combo.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(1)}
                        aria-label="Increase combo quantity"
                        className="w-9 h-9 sm:w-10 sm:h-10 md:w-14 md:h-14 flex items-center justify-center rounded-md sm:rounded-lg bg-[#E6411C] text-white hover:bg-[#d13a18] transition-colors"
                      >
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Main Dishes */}
                <ReviewSection title={t('category.mainDishes')} editLabel={t('common.edit')} onEdit={() => setStep(1)}>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-3">
                    {combo.mainDishes.map((name) => (
                      <span
                        key={name}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 md:px-4 md:py-2 bg-gray-50 rounded-md sm:rounded-lg text-xs sm:text-sm md:text-base font-semibold text-[#212282]"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </ReviewSection>

                {/* Sauce */}
                <ReviewSection title={t('category.sauces')} editLabel="Edit" onEdit={() => setStep(2)}>
                  <div className="flex items-center gap-3 sm:gap-4 md:gap-5">
                    {combo.sauce && (
                      <img
                        src={combo.sauce.image_url}
                        alt={combo.sauce.name}
                        className="size-10 sm:size-12 md:size-16 rounded-lg sm:rounded-xl object-cover"
                      />
                    )}
                    <div>
                      <p className="text-sm sm:text-base md:text-xl font-bold text-[#212282]">
                        {combo.sauce?.name || 'None'}
                        {combo.saucePreparation &&
                          combo.saucePreparation !== 'Default' &&
                          ` (${combo.saucePreparation})`}
                      </p>
                      <p className="text-[11px] sm:text-xs md:text-sm text-[#E6411C] font-semibold">
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
                <ReviewSection title={t('category.sideDishes')} editLabel="Edit" onEdit={() => setStep(3)}>
                  <div className="flex items-center gap-3 sm:gap-4 md:gap-5">
                    {combo.sideDish && (
                      <img
                        src={sideDishes.find((s) => s.name === combo.sideDish)?.image_url || ''}
                        alt={combo.sideDish}
                        className="size-10 sm:size-12 md:size-16 rounded-lg sm:rounded-xl object-cover"
                      />
                    )}
                    <div>
                      <p className="text-sm sm:text-base md:text-xl font-bold text-[#212282]">
                        {combo.sideDish || 'None selected'}
                      </p>
                      <p className="text-[10px] sm:text-xs md:text-sm text-gray-500 font-medium uppercase tracking-wider">
                        {t('combo.includedFree')}
                      </p>
                    </div>
                  </div>
                </ReviewSection>

                {/* Extras */}
                {combo.extras.length > 0 && (
                  <ReviewSection title={t('combo.step4Title')} editLabel="Edit" onEdit={() => setStep(4)}>
                    <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
                      {combo.extras.map((e) => (
                        <div key={e.item.id} className="flex justify-between items-center text-xs sm:text-sm md:text-base">
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
              'p-4 pb-8 sm:p-5 sm:pb-6 md:p-6 md:pb-8 lg:p-8 lg:pb-10',
              step >= 2 ? 'bg-[#212282]' : 'bg-white border-t border-gray-100'
            )}
          >
            <div className="flex flex-col gap-3 sm:gap-4 max-w-xl mx-auto md:max-w-3xl lg:max-w-4xl">
              {/* Order Summary */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-[10px] sm:text-xs md:text-sm font-medium uppercase tracking-wider mb-0.5 sm:mb-1',
                      step >= 2 ? 'text-white/60' : 'text-gray-500'
                    )}
                  >
                    Your Combo
                  </p>
                  <p
                    className={cn(
                      'text-sm font-medium leading-relaxed truncate md:text-lg md:font-bold',
                      step >= 2 ? 'text-white/80' : 'text-[#212282]'
                    )}
                  >
                    {summaryText}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p
                    className={cn(
                      'text-[10px] sm:text-xs md:text-sm font-medium uppercase tracking-wider mb-0.5 sm:mb-1',
                      step >= 2 ? 'text-white/60' : 'text-gray-500'
                    )}
                  >
                    {t('cart.total')}
                  </p>
                  <p
                    className={cn(
                      'text-lg sm:text-xl md:text-3xl font-extrabold tracking-tight',
                      step >= 2 ? 'text-white' : 'text-[#212282]'
                    )}
                  >
                    {formatPrice(totalPrice)}
                  </p>
                  {step === 5 && combo.quantity > 1 && (
                    <p className={cn('text-[10px] md:text-xs font-medium', step >= 2 ? 'text-white/50' : 'text-gray-400')}>
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
                  'w-full flex items-center justify-center gap-2 rounded-xl h-12 sm:h-13 md:h-16 lg:h-20 text-white text-base sm:text-lg md:text-2xl font-bold shadow-md transition-all duration-300',
                  'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] hover:shadow-lg',
                  'bg-[#E6411C] hover:bg-[#d13a18]'
                )}
              >
                <span>{getNextButtonText()}</span>
                {step < 5 && <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />}
              </button>
            </div>
          </div>
        </footer>

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-100">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-100">
              <h3 className="text-xl font-extrabold text-[#212282] mb-2">{t('common.close')} Combo Builder?</h3>
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
                  {t('common.save')} & {t('common.close')}
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
                {combo.quantity > 1 ? `${combo.quantity} Combos` : t('combo.addToCart')}!
              </h2>
              <p className="text-white/60 font-bold uppercase tracking-widest text-sm mb-4">
                {combo.quantity > 1 ? t('combo.addToCart') + '!' : 'Great Selection'}
              </p>
              {combo.quantity > 1 && (
                <p className="text-white/80 text-lg font-bold mb-8">{t('cart.total')}: {formatPrice(totalPrice)}</p>
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
                  <span className="sm:hidden">{t('cart.addMore')}</span>
                  <span className="hidden sm:inline">{t('cart.addMore')}</span>
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
                  <span className="sm:hidden">{t('cart.checkout')}</span>
                  <span className="hidden sm:inline">{t('cart.checkout')}</span>
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
  editLabel,
  onEdit,
  children,
}: {
  title: string;
  editLabel: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-2 sm:mb-3 md:mb-4">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="size-6 sm:size-8 md:size-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
            <Check className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </div>
          <h3 className="text-sm sm:text-base md:text-xl font-bold text-[#212282]">{title}</h3>
        </div>
        <button
          onClick={onEdit}
          className="text-[#E6411C] text-xs sm:text-sm md:text-base font-bold hover:underline px-2 py-1"
        >
          {editLabel}
        </button>
      </div>
      {children}
    </div>
  );
}
