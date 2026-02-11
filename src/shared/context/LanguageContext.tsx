import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Language, getLanguage, setLanguage as setLang, t as translate, TranslationKeys } from '@shared/lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationKeys) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(getLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLang(lang);
    setLanguageState(lang);
  }, []);

  const t = useCallback((key: keyof TranslationKeys): string => {
    return translate(key);
  }, [language]); // Re-compute when language changes

  useEffect(() => {
    // Sync with sessionStorage on mount
    const saved = getLanguage();
    if (saved !== language) {
      setLanguageState(saved);
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function useTranslation() {
  const { t, language } = useLanguage();
  return { t, language };
}
