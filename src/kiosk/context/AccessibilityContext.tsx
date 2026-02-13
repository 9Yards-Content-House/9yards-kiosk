import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  touchTargetSize: "normal" | "large" | "extra-large";
  soundEnabled: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void;
  toggleHighContrast: () => void;
  toggleLargeText: () => void;
  toggleReducedMotion: () => void;
  toggleSound: () => void;
  resetToDefaults: () => void;
  isAccessibilityMode: boolean;
  soundEnabled: boolean;
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  screenReader: false,
  touchTargetSize: "normal",
  soundEnabled: true, // Sound enabled by default for premium kiosk feel
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const STORAGE_KEY = "kiosk-accessibility-settings";

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) };
      }
    } catch {
      // Ignore parsing errors
    }
    return defaultSettings;
  });

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage errors
    }
  }, [settings]);

  // Apply CSS classes to document root
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast mode
    if (settings.highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }
    
    // Large text mode
    if (settings.largeText) {
      root.classList.add("large-text");
    } else {
      root.classList.remove("large-text");
    }
    
    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add("reduced-motion");
    } else {
      root.classList.remove("reduced-motion");
    }
    
    // Touch target size
    root.classList.remove("touch-normal", "touch-large", "touch-extra-large");
    root.classList.add(`touch-${settings.touchTargetSize}`);
  }, [settings]);

  // Check for system preferences
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const prefersContrast = window.matchMedia("(prefers-contrast: more)");
    
    if (prefersReducedMotion.matches && !settings.reducedMotion) {
      setSettings(prev => ({ ...prev, reducedMotion: true }));
    }
    
    if (prefersContrast.matches && !settings.highContrast) {
      setSettings(prev => ({ ...prev, highContrast: true }));
    }
  }, []);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleHighContrast = () => {
    setSettings(prev => ({ ...prev, highContrast: !prev.highContrast }));
  };

  const toggleLargeText = () => {
    setSettings(prev => ({ ...prev, largeText: !prev.largeText }));
  };

  const toggleReducedMotion = () => {
    setSettings(prev => ({ ...prev, reducedMotion: !prev.reducedMotion }));
  };

  const toggleSound = () => {
    setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
  };

  const isAccessibilityMode = settings.highContrast || settings.largeText || settings.reducedMotion;

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        updateSetting,
        toggleHighContrast,
        toggleLargeText,
        toggleReducedMotion,
        toggleSound,
        resetToDefaults,
        isAccessibilityMode,
        soundEnabled: settings.soundEnabled,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within AccessibilityProvider");
  }
  return context;
}

// Helper hook for animations that respect reduced motion
export function useReducedMotion() {
  const { settings } = useAccessibility();
  return settings.reducedMotion;
}

// Helper for getting appropriate touch target class
export function useTouchTargetClass() {
  const { settings } = useAccessibility();
  
  const sizes = {
    normal: "min-h-[44px] min-w-[44px]",
    large: "min-h-[56px] min-w-[56px]",
    "extra-large": "min-h-[72px] min-w-[72px]",
  };
  
  return sizes[settings.touchTargetSize];
}
