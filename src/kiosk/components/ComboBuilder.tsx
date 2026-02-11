import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft, ChevronRight, Check, RotateCcw } from "lucide-react";
import { cn, formatPrice, vibrate } from "@shared/lib/utils";
import { useKioskCart } from "../context/KioskCartContext";
import { Button } from "@shared/components/ui/button";
import type { MenuItem, GroupedMenu } from "@shared/types/menu";

interface ComboBuilderProps {
  sauce: MenuItem;
  groups: GroupedMenu[];
  onClose: () => void;
}

type Step = "preparation" | "size" | "main" | "side";

export default function ComboBuilder({ sauce, groups, onClose }: ComboBuilderProps) {
  const { addItem } = useKioskCart();

  const hasPreparations = (sauce.preparations?.length ?? 0) > 0;
  const steps: Step[] = [
    ...(hasPreparations ? ["preparation" as Step] : []),
    "size",
    "main",
    "side",
  ];

  const stepLabels: Record<Step, string> = {
    preparation: "Style",
    size: "Size",
    main: "Mains",
    side: "Side",
  };

  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = steps[stepIndex];

  const [preparation, setPreparation] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [sizePrice, setSizePrice] = useState(0);
  const [selectedMains, setSelectedMains] = useState<string[]>([]);
  const [selectedSide, setSelectedSide] = useState<string | null>(null);

  const mainGroup = groups.find((g) => g.category.slug === "main-dishes");
  const sideGroup = groups.find((g) => g.category.slug === "side-dishes");

  const canNext = () => {
    switch (currentStep) {
      case "preparation":
        return !!preparation;
      case "size":
        return !!size;
      case "main":
        return selectedMains.length > 0;
      case "side":
        return !!selectedSide;
    }
  };

  const handleNext = () => {
    vibrate();
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleAddToCart();
    }
  };

  const handleBack = () => {
    vibrate();
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  const handleReset = () => {
    vibrate();
    setStepIndex(0);
    setPreparation(null);
    setSize(null);
    setSizePrice(0);
    setSelectedMains([]);
    setSelectedSide(null);
  };

  const handleAddToCart = () => {
    vibrate();
    addItem({
      id: crypto.randomUUID(),
      type: "combo",
      mainDishes: selectedMains,
      sauceName: sauce.name,
      saucePreparation: preparation || undefined,
      sauceSize: size || undefined,
      sideDish: selectedSide || undefined,
      extras: [],
      quantity: 1,
      unitPrice: sizePrice,
      label: `${sauce.name} Combo`,
    });
    onClose();
  };

  const toggleMain = (name: string) => {
    vibrate();
    setSelectedMains((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
    );
  };

  const getNextButtonText = () => {
    switch (currentStep) {
      case "preparation":
        return "Next: Choose Size";
      case "size":
        return "Next: Pick Mains";
      case "main":
        return "Next: Choose Side";
      case "side":
        return "Add to Cart";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative flex flex-col w-full h-full bg-background md:rounded-3xl md:max-w-2xl md:max-h-[90vh] md:m-auto md:h-auto overflow-hidden shadow-2xl">
        
        {/* Header */}
        <header className="flex-none bg-white px-4 pt-4 pb-3 shadow-sm z-20 border-b border-gray-100">
          {/* Desktop Step Labels */}
          <div className="hidden sm:flex justify-center gap-1 mb-3">
            {steps.map((s, idx) => (
              <div key={s} className="flex items-center">
                <button
                  onClick={() => {
                    if (idx < stepIndex) {
                      vibrate();
                      setStepIndex(idx);
                    }
                  }}
                  disabled={idx > stepIndex}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                    idx === stepIndex
                      ? "bg-secondary text-white"
                      : idx < stepIndex
                        ? "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  )}
                >
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                    idx < stepIndex
                      ? "bg-primary text-white"
                      : idx === stepIndex
                        ? "bg-white/20 text-white"
                        : "bg-gray-200 text-gray-500"
                  )}>
                    {idx < stepIndex ? <Check className="w-3 h-3" /> : idx + 1}
                  </span>
                  <span className="hidden md:inline">{stepLabels[s]}</span>
                </button>
                {idx < steps.length - 1 && (
                  <ChevronRight className={cn(
                    "w-4 h-4 mx-1",
                    idx < stepIndex ? "text-primary/40" : "text-gray-300"
                  )} />
                )}
              </div>
            ))}
          </div>

          {/* Header row */}
          <div className="flex items-center justify-between">
            {stepIndex > 0 ? (
              <button
                onClick={handleBack}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-primary"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-primary"
                aria-label="Close combo builder"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Mobile Step Indicator */}
            <div className="flex flex-col items-center sm:hidden">
              <span className="text-xs font-bold uppercase tracking-widest text-secondary">
                Step {stepIndex + 1} of {steps.length}
              </span>
              <div className="mt-1.5 flex gap-1">
                {steps.map((s, i) => (
                  <button
                    key={s}
                    onClick={() => {
                      if (i < stepIndex) {
                        vibrate();
                        setStepIndex(i);
                      }
                    }}
                    disabled={i > stepIndex}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i === stepIndex
                        ? "w-8 bg-secondary"
                        : i < stepIndex
                          ? "w-3 bg-primary cursor-pointer hover:bg-primary/80"
                          : "w-2 bg-gray-200"
                    )}
                    aria-label={`Go to step ${i + 1}`}
                  />
                ))}
              </div>
              <span className="text-[10px] text-gray-500 mt-1 font-medium">
                {stepLabels[currentStep]}
              </span>
            </div>

            {/* Desktop Title */}
            <div className="hidden sm:block">
              <span className="text-xs font-bold uppercase tracking-widest text-secondary">
                {sauce.name} Combo
              </span>
            </div>

            {/* Reset & Cancel */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="flex h-10 items-center justify-center rounded-full px-2 hover:bg-gray-100 transition-colors text-gray-500"
                title="Start Fresh"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="flex h-10 items-center justify-center rounded-full px-2 hover:bg-red-50 transition-colors"
              >
                <span className="text-secondary text-sm font-bold">Cancel</span>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto pb-52 sm:pb-48 bg-gray-50/50">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.15 }}
              className="p-4 sm:p-5"
            >
              {currentStep === "preparation" && (
                <div className="animate-in fade-in duration-300">
                  <div className="mb-4">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight mb-1">
                      How would you like it?
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Choose your preferred preparation style
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {sauce.preparations?.map((p) => {
                      const isSelected = preparation === p.name;
                      return (
                        <button
                          key={p.name}
                          onClick={() => { vibrate(); setPreparation(p.name); }}
                          className={cn(
                            "relative p-5 rounded-2xl border-2 text-lg font-bold transition-all duration-200",
                            isSelected
                              ? "border-secondary bg-secondary/5 text-primary"
                              : "border-gray-100 bg-white hover:border-secondary/50"
                          )}
                        >
                          {p.name}
                          {isSelected && (
                            <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentStep === "size" && (
                <div className="animate-in fade-in duration-300">
                  <div className="mb-4">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h1 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
                        Choose your size
                      </h1>
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-wider border border-secondary/20">
                        Required
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Select a portion size for your combo
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    {sauce.sizes?.map((s) => {
                      const isSelected = size === s.name;
                      return (
                        <button
                          key={s.name}
                          onClick={() => {
                            vibrate();
                            setSize(s.name);
                            setSizePrice(s.price);
                          }}
                          className={cn(
                            "relative flex items-center gap-4 p-4 rounded-2xl border-2 bg-white cursor-pointer transition-all duration-200",
                            isSelected
                              ? "border-secondary bg-secondary/5"
                              : "border-gray-100 hover:border-secondary/50"
                          )}
                        >
                          <div className="flex-1 text-left">
                            <h3 className="text-primary font-bold text-lg">{s.name}</h3>
                          </div>
                          <span className="text-secondary text-lg font-bold">
                            {formatPrice(s.price)}
                          </span>
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 relative transition-colors",
                            isSelected
                              ? "border-secondary bg-secondary"
                              : "border-gray-300"
                          )}>
                            {isSelected && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-white" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentStep === "main" && (
                <div className="animate-in fade-in duration-300">
                  <div className="mb-4">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h1 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
                        Pick your mains
                      </h1>
                      {selectedMains.length > 0 && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-secondary text-white text-xs font-bold">
                          {selectedMains.length} selected
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Choose as many as you like - they're all included free!
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {mainGroup?.items.map((item) => {
                      const isSelected = selectedMains.includes(item.name);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleMain(item.name)}
                          className={cn(
                            "relative flex flex-col overflow-hidden rounded-2xl border-2 bg-white transition-all duration-200",
                            isSelected
                              ? "border-secondary bg-secondary/5"
                              : "border-gray-100 hover:border-secondary/50"
                          )}
                        >
                          <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                            {item.image_url && (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                loading="eager"
                                decoding="sync"
                                className="h-full w-full object-cover"
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                            {/* Checkmark Badge */}
                            <div className={cn(
                              "absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-white shadow-lg transition-all duration-300",
                              isSelected ? "scale-100 opacity-100" : "scale-0 opacity-0"
                            )}>
                              <Check className="w-4 h-4" strokeWidth={3} />
                            </div>
                          </div>
                          <div className="flex flex-col p-3">
                            <span className="text-sm font-bold text-primary">{item.name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentStep === "side" && (
                <div className="animate-in fade-in duration-300">
                  <div className="mb-4">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
                      Choose Your <span className="text-secondary">FREE</span> Side
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Every combo comes with a free side dish of your choice
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    {sideGroup?.items.map((item) => {
                      const isSelected = selectedSide === item.name;
                      return (
                        <button
                          key={item.id}
                          onClick={() => { vibrate(); setSelectedSide(item.name); }}
                          className={cn(
                            "relative flex items-center gap-4 bg-white p-3 rounded-2xl border-2 transition-all duration-200",
                            isSelected
                              ? "border-secondary bg-orange-50/50"
                              : "border-gray-100 hover:border-secondary/50"
                          )}
                        >
                          <div className="relative flex-shrink-0">
                            {item.image_url && (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                loading="lazy"
                                decoding="async"
                                className="w-20 h-20 rounded-xl object-cover shadow-inner"
                              />
                            )}
                            <span className="absolute -top-2 -left-2 bg-secondary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border border-white">
                              Free
                            </span>
                          </div>
                          <div className="flex flex-col flex-1 min-w-0 py-1 text-left">
                            <p className="text-primary text-lg font-bold leading-tight truncate pr-2">
                              {item.name}
                            </p>
                            <p className="text-secondary text-xs font-bold mt-1.5 uppercase tracking-wide">
                              Included
                            </p>
                          </div>
                          <div className="flex-shrink-0 pr-2">
                            <div className={cn(
                              "w-6 h-6 rounded-full border-2 relative transition-colors",
                              isSelected
                                ? "border-secondary bg-secondary"
                                : "border-gray-300"
                            )}>
                              {isSelected && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-2 h-2 rounded-full bg-white" />
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Sticky Footer */}
        <footer className="absolute bottom-0 left-0 right-0 z-30">
          <div className={cn(
            "p-4 pb-8 sm:p-5 sm:pb-6",
            stepIndex >= 1 ? "bg-primary" : "bg-white border-t border-gray-100"
          )}>
            <div className="flex flex-col gap-3 sm:gap-4 max-w-xl mx-auto">
              {/* Order Summary */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-[10px] sm:text-xs font-medium uppercase tracking-wider mb-0.5 sm:mb-1",
                    stepIndex >= 1 ? "text-white/60" : "text-gray-500"
                  )}>
                    Your Combo
                  </p>
                  <p className={cn(
                    "text-sm font-bold leading-relaxed truncate",
                    stepIndex >= 1 ? "text-white/80" : "text-primary"
                  )}>
                    {sauce.name}
                    {size && ` • ${size}`}
                    {selectedMains.length > 0 && ` • ${selectedMains.length} main${selectedMains.length > 1 ? 's' : ''}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn(
                    "text-[10px] sm:text-xs font-medium uppercase tracking-wider mb-0.5 sm:mb-1",
                    stepIndex >= 1 ? "text-white/60" : "text-gray-500"
                  )}>
                    Total
                  </p>
                  <p className={cn(
                    "text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight",
                    stepIndex >= 1 ? "text-white" : "text-primary"
                  )}>
                    {sizePrice > 0 ? formatPrice(sizePrice) : "—"}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <Button
                onClick={handleNext}
                disabled={!canNext()}
                className="w-full h-12 sm:h-14 rounded-xl bg-secondary hover:bg-secondary/90 text-white text-base sm:text-lg font-bold shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{getNextButtonText()}</span>
                {stepIndex < steps.length - 1 && <ChevronRight className="w-5 h-5 ml-1" />}
                {stepIndex === steps.length - 1 && <Check className="w-5 h-5 ml-2" />}
              </Button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
