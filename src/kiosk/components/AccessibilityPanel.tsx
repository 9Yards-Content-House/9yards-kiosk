import { motion, AnimatePresence } from "framer-motion";
import { 
  Accessibility, 
  Sun, 
  Type, 
  Zap, 
  Hand, 
  RotateCcw, 
  X,
  Check
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
    updateSetting,
    resetToDefaults 
  } = useAccessibility();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Accessibility className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Accessibility</h2>
                    <p className="text-white/80 text-sm">Customize your experience</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="p-6 space-y-4">
              {/* High Contrast */}
              <AccessibilityOption
                icon={<Sun className="w-6 h-6" />}
                title="High Contrast"
                description="Increase color contrast for better visibility"
                enabled={settings.highContrast}
                onToggle={toggleHighContrast}
              />

              {/* Large Text */}
              <AccessibilityOption
                icon={<Type className="w-6 h-6" />}
                title="Large Text"
                description="Make text bigger and easier to read"
                enabled={settings.largeText}
                onToggle={toggleLargeText}
              />

              {/* Reduced Motion */}
              <AccessibilityOption
                icon={<Zap className="w-6 h-6" />}
                title="Reduced Motion"
                description="Minimize animations and transitions"
                enabled={settings.reducedMotion}
                onToggle={toggleReducedMotion}
              />

              {/* Touch Target Size */}
              <div className="p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <Hand className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Touch Target Size</h3>
                    <p className="text-sm text-gray-500">Size of buttons and controls</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {(["normal", "large", "extra-large"] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => updateSetting("touchTargetSize", size)}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all capitalize ${
                        settings.touchTargetSize === size
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-gray-200 text-gray-700 hover:border-blue-300"
                      }`}
                    >
                      {size.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={resetToDefaults}
                className="flex-1 py-4 px-6 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold flex items-center justify-center gap-2 hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                <RotateCcw className="w-5 h-5" />
                Reset
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-4 px-6 rounded-2xl bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
              >
                <Check className="w-5 h-5" />
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface AccessibilityOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

function AccessibilityOption({ icon, title, description, enabled, onToggle }: AccessibilityOptionProps) {
  return (
    <button
      onClick={onToggle}
      className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${
        enabled 
          ? "bg-blue-50 border-2 border-blue-200" 
          : "bg-gray-50 border-2 border-transparent hover:border-gray-200"
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        enabled ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
      }`}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className={`w-12 h-7 rounded-full p-1 transition-colors ${
        enabled ? "bg-blue-600" : "bg-gray-300"
      }`}>
        <motion.div
          layout
          className="w-5 h-5 bg-white rounded-full shadow"
          animate={{ x: enabled ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
    </button>
  );
}
