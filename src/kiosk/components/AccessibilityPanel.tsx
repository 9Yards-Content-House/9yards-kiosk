import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { 
  Accessibility, 
  Sun, 
  Type, 
  Zap, 
  Hand, 
  RotateCcw, 
  X,
  Check,
  Volume2,
} from "lucide-react";
import { useAccessibility } from "../context/AccessibilityContext";

interface AccessibilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccessibilityPanel({ isOpen, onClose }: AccessibilityPanelProps) {
  const { 
    settings, 
    toggleHighContrast, 
    toggleLargeText, 
    toggleReducedMotion,
    toggleSound,
    updateSetting,
    resetToDefaults 
  } = useAccessibility();

  const hasChanges = settings.highContrast || settings.largeText || settings.reducedMotion || settings.touchTargetSize !== "normal" || !settings.soundEnabled;

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-[clamp(1rem,4vmin,2rem)]"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-label="Accessibility settings"
            className="bg-white rounded-[clamp(1.25rem,3vmin,2rem)] shadow-2xl w-full max-w-[clamp(20rem,60vmin,30rem)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-primary p-[clamp(1.25rem,3.5vmin,1.75rem)] text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[clamp(0.5rem,1.5vmin,0.75rem)]">
                  <div className="w-[clamp(2.5rem,5.5vmin,3.25rem)] h-[clamp(2.5rem,5.5vmin,3.25rem)] bg-white/15 rounded-full flex items-center justify-center">
                    <Accessibility className="w-[clamp(1.25rem,2.8vmin,1.625rem)] h-[clamp(1.25rem,2.8vmin,1.625rem)]" />
                  </div>
                  <div>
                    <h2 className="text-[clamp(1.125rem,3vmin,1.5rem)] font-bold">Accessibility</h2>
                    <p className="text-white/70 text-[clamp(0.7rem,1.5vmin,0.85rem)]">Adjust display settings</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close accessibility settings"
                  className="w-[clamp(2.75rem,6vmin,3.5rem)] h-[clamp(2.75rem,6vmin,3.5rem)] rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 active:bg-white/30 active:scale-95 transition-all"
                >
                  <X className="w-[clamp(1.125rem,2.5vmin,1.375rem)] h-[clamp(1.125rem,2.5vmin,1.375rem)]" />
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="p-[clamp(0.75rem,2.5vmin,1.5rem)] space-y-[clamp(0.5rem,1.5vmin,0.75rem)]">
              {/* High Contrast */}
              <ToggleOption
                icon={<Sun />}
                title="High Contrast"
                description="Bolder colours, easier to see"
                enabled={settings.highContrast}
                onToggle={toggleHighContrast}
              />

              {/* Large Text */}
              <ToggleOption
                icon={<Type />}
                title="Larger Text"
                description="Bigger text across all screens"
                enabled={settings.largeText}
                onToggle={toggleLargeText}
              />

              {/* Reduced Motion */}
              <ToggleOption
                icon={<Zap />}
                title="Reduce Motion"
                description="Less movement on screen"
                enabled={settings.reducedMotion}
                onToggle={toggleReducedMotion}
              />

              {/* Sound Effects */}
              <ToggleOption
                icon={<Volume2 />}
                title="Sound Effects"
                description="Play sounds on interactions"
                enabled={settings.soundEnabled}
                onToggle={toggleSound}
              />

              {/* Touch Target Size */}
              <div className="p-[clamp(0.75rem,2.5vmin,1.125rem)] bg-gray-50 rounded-[clamp(0.75rem,2vmin,1.25rem)]">
                <div className="flex items-center gap-[clamp(0.5rem,1.2vmin,0.75rem)] mb-[clamp(0.625rem,1.5vmin,0.875rem)]">
                  <div className="w-[clamp(2.25rem,5vmin,2.75rem)] h-[clamp(2.25rem,5vmin,2.75rem)] bg-primary/10 text-primary rounded-[clamp(0.5rem,1.2vmin,0.75rem)] flex items-center justify-center">
                    <Hand className="w-[clamp(1.125rem,2.2vmin,1.375rem)] h-[clamp(1.125rem,2.2vmin,1.375rem)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-[clamp(0.8rem,1.8vmin,1rem)]">Button Size</h3>
                    <p className="text-[clamp(0.65rem,1.3vmin,0.8rem)] text-gray-500">Make buttons easier to tap</p>
                  </div>
                </div>
                <div className="flex gap-[clamp(0.375rem,1vmin,0.5rem)]">
                  {(["normal", "large", "extra-large"] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => updateSetting("touchTargetSize", size)}
                      className={`flex-1 py-[clamp(0.625rem,2vmin,0.875rem)] px-[clamp(0.5rem,1.2vmin,0.75rem)] rounded-[clamp(0.5rem,1.2vmin,0.75rem)] font-medium transition-all text-[clamp(0.75rem,1.6vmin,0.9375rem)] capitalize active:scale-[0.97] ${
                        settings.touchTargetSize === size
                          ? "bg-primary text-white"
                          : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 active:bg-gray-100"
                      }`}
                    >
                      {size === "extra-large" ? "Extra Large" : size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-[clamp(0.75rem,2.5vmin,1.5rem)] pb-[clamp(0.75rem,2.5vmin,1.5rem)] flex gap-[clamp(0.5rem,1.2vmin,0.75rem)]">
              <button
                onClick={() => { resetToDefaults(); }}
                disabled={!hasChanges}
                className="flex-1 py-[clamp(0.875rem,2.5vmin,1.125rem)] rounded-[clamp(0.75rem,2vmin,1.25rem)] border-2 border-gray-200 text-gray-500 font-semibold flex items-center justify-center gap-[clamp(0.25rem,0.8vmin,0.5rem)] hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none text-[clamp(0.8rem,1.7vmin,1rem)]"
              >
                <RotateCcw className="w-[clamp(0.875rem,1.8vmin,1.125rem)] h-[clamp(0.875rem,1.8vmin,1.125rem)]" />
                Reset
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-[clamp(0.875rem,2.5vmin,1.125rem)] rounded-[clamp(0.75rem,2vmin,1.25rem)] bg-primary text-white font-semibold flex items-center justify-center gap-[clamp(0.25rem,0.8vmin,0.5rem)] hover:bg-primary/90 active:bg-primary/80 active:scale-[0.98] transition-all text-[clamp(0.8rem,1.7vmin,1rem)]"
              >
                <Check className="w-[clamp(0.875rem,1.8vmin,1.125rem)] h-[clamp(0.875rem,1.8vmin,1.125rem)]" />
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ToggleOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

function ToggleOption({ icon, title, description, enabled, onToggle }: ToggleOptionProps) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      aria-label={title}
      className={`w-full p-[clamp(0.75rem,2.5vmin,1.125rem)] rounded-[clamp(0.75rem,2vmin,1.25rem)] flex items-center gap-[clamp(0.5rem,1.5vmin,0.875rem)] transition-all active:scale-[0.98] ${
        enabled 
          ? "bg-primary/5 border-2 border-primary/20" 
          : "bg-gray-50 border-2 border-transparent hover:border-gray-200 active:bg-gray-100"
      }`}
    >
      <div className={`w-[clamp(2.25rem,5vmin,2.75rem)] h-[clamp(2.25rem,5vmin,2.75rem)] rounded-[clamp(0.5rem,1.2vmin,0.75rem)] flex items-center justify-center flex-shrink-0 [&>svg]:w-[clamp(1.125rem,2.2vmin,1.375rem)] [&>svg]:h-[clamp(1.125rem,2.2vmin,1.375rem)] ${
        enabled ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
      }`}>
        {icon}
      </div>
      <div className="flex-1 text-left min-w-0">
        <h3 className="font-semibold text-gray-900 text-[clamp(0.8rem,1.8vmin,1rem)]">{title}</h3>
        <p className="text-[clamp(0.65rem,1.3vmin,0.8rem)] text-gray-500">{description}</p>
      </div>
      <div className={`w-[clamp(2.75rem,6vmin,3.25rem)] h-[clamp(1.625rem,3.5vmin,1.875rem)] rounded-full p-[2px] transition-colors flex-shrink-0 ${
        enabled ? "bg-primary" : "bg-gray-300"
      }`}>
        <motion.div
          layout
          className="h-full aspect-square bg-white rounded-full shadow-sm"
          animate={{ x: enabled ? "100%" : "0%" }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
    </button>
  );
}
