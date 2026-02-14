import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';

interface AnnouncerContextValue {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AnnouncerContext = createContext<AnnouncerContextValue | null>(null);

/**
 * Hook to access the screen reader announcer
 */
export function useAnnouncer() {
  const context = useContext(AnnouncerContext);
  if (!context) {
    throw new Error('useAnnouncer must be used within an AnnouncerProvider');
  }
  return context;
}

interface AnnouncerProviderProps {
  children: ReactNode;
}

/**
 * Provider component that adds an accessible screen reader announcer
 * Uses ARIA live regions to announce dynamic content changes
 */
export function AnnouncerProvider({ children }: AnnouncerProviderProps) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');
  const politeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const assertiveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (priority === 'assertive') {
      // Clear any pending assertive message
      if (assertiveTimeoutRef.current) {
        clearTimeout(assertiveTimeoutRef.current);
      }
      // Clear then set to force announcement even if same message
      setAssertiveMessage('');
      requestAnimationFrame(() => {
        setAssertiveMessage(message);
      });
      // Clear after announcement
      assertiveTimeoutRef.current = setTimeout(() => {
        setAssertiveMessage('');
      }, 1000);
    } else {
      // Clear any pending polite message
      if (politeTimeoutRef.current) {
        clearTimeout(politeTimeoutRef.current);
      }
      setPoliteMessage('');
      requestAnimationFrame(() => {
        setPoliteMessage(message);
      });
      politeTimeoutRef.current = setTimeout(() => {
        setPoliteMessage('');
      }, 1000);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (politeTimeoutRef.current) clearTimeout(politeTimeoutRef.current);
      if (assertiveTimeoutRef.current) clearTimeout(assertiveTimeoutRef.current);
    };
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      {/* Visually hidden ARIA live regions */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
}

/**
 * Utility hook for announcing step/page changes in multi-step flows
 */
export function useStepAnnouncer() {
  const { announce } = useAnnouncer();

  const announceStep = useCallback((stepName: string, currentStep: number, totalSteps: number) => {
    announce(`Step ${currentStep} of ${totalSteps}: ${stepName}`, 'polite');
  }, [announce]);

  const announceAction = useCallback((action: string) => {
    announce(action, 'polite');
  }, [announce]);

  const announceError = useCallback((error: string) => {
    announce(error, 'assertive');
  }, [announce]);

  return { announceStep, announceAction, announceError };
}
