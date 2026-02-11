import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft, ArrowRight, Check } from "lucide-react";
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
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleAddToCart();
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
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

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold">{sauce.name} Combo</h2>
        <div className="w-10" />
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 px-4 py-3">
        {steps.map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= stepIndex ? "bg-yards-orange" : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.15 }}
          >
            {currentStep === "preparation" && (
              <div>
                <h3 className="text-xl font-bold mb-1">How would you like it?</h3>
                <p className="text-muted-foreground mb-4">Choose a preparation style</p>
                <div className="grid grid-cols-2 gap-3">
                  {sauce.preparations?.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => { vibrate(); setPreparation(p.name); }}
                      className={cn(
                        "p-4 rounded-xl border-2 text-lg font-medium transition-colors",
                        preparation === p.name
                          ? "border-yards-orange bg-yards-orange/10"
                          : "border-muted hover:border-muted-foreground/30"
                      )}
                    >
                      {p.name}
                      {preparation === p.name && (
                        <Check className="w-5 h-5 text-yards-orange inline ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === "size" && (
              <div>
                <h3 className="text-xl font-bold mb-1">Choose your size</h3>
                <p className="text-muted-foreground mb-4">Select a portion size</p>
                <div className="space-y-3">
                  {sauce.sizes?.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => {
                        vibrate();
                        setSize(s.name);
                        setSizePrice(s.price);
                      }}
                      className={cn(
                        "w-full p-4 rounded-xl border-2 flex items-center justify-between text-lg transition-colors",
                        size === s.name
                          ? "border-yards-orange bg-yards-orange/10"
                          : "border-muted hover:border-muted-foreground/30"
                      )}
                    >
                      <span className="font-medium">{s.name}</span>
                      <span className="font-bold text-yards-orange">
                        {formatPrice(s.price)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === "main" && (
              <div>
                <h3 className="text-xl font-bold mb-1">Pick your mains</h3>
                <p className="text-muted-foreground mb-4">
                  Select one or more (included free)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {mainGroup?.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleMain(item.name)}
                      className={cn(
                        "p-3 rounded-xl border-2 text-left transition-colors",
                        selectedMains.includes(item.name)
                          ? "border-yards-orange bg-yards-orange/10"
                          : "border-muted hover:border-muted-foreground/30"
                      )}
                    >
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full aspect-[4/3] object-cover rounded-lg mb-2"
                        />
                      )}
                      <span className="font-medium text-base">{item.name}</span>
                      {selectedMains.includes(item.name) && (
                        <Check className="w-4 h-4 text-yards-orange inline ml-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === "side" && (
              <div>
                <h3 className="text-xl font-bold mb-1">Choose a side dish</h3>
                <p className="text-muted-foreground mb-4">Included free with your combo</p>
                <div className="grid grid-cols-2 gap-3">
                  {sideGroup?.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { vibrate(); setSelectedSide(item.name); }}
                      className={cn(
                        "p-3 rounded-xl border-2 text-left transition-colors",
                        selectedSide === item.name
                          ? "border-yards-orange bg-yards-orange/10"
                          : "border-muted hover:border-muted-foreground/30"
                      )}
                    >
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full aspect-[4/3] object-cover rounded-lg mb-2"
                        />
                      )}
                      <span className="font-medium text-base">{item.name}</span>
                      {selectedSide === item.name && (
                        <Check className="w-4 h-4 text-yards-orange inline ml-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      <div className="border-t bg-card p-4">
        {sizePrice > 0 && (
          <p className="text-center font-bold text-yards-orange mb-3">
            {formatPrice(sizePrice)}
          </p>
        )}
        <div className="flex gap-3">
          {stepIndex > 0 ? (
            <Button variant="outline" size="touch" className="flex-1" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          ) : (
            <Button variant="outline" size="touch" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button
            size="touch"
            className="flex-1 bg-yards-orange hover:bg-yards-orange/90"
            disabled={!canNext()}
            onClick={handleNext}
          >
            {stepIndex === steps.length - 1 ? (
              <>
                Add to Cart
                <Check className="w-5 h-5 ml-2" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
