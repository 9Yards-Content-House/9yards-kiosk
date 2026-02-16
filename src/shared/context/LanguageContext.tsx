import { t as translate, TranslationKeys } from '@shared/lib/i18n';

/**
 * Simple translation hook that always returns English.
 * Language switching has been removed - this is kept for backwards compatibility.
 */
export function useTranslation() {
  const t = (key: keyof TranslationKeys): string => {
    return translate(key);
  };
  return { t, language: 'en' as const };
}

/**
 * @deprecated Language switching has been removed
 */
export function useLanguage() {
  return {
    language: 'en' as const,
    setLanguage: (_lang: string) => {},
  };
}
