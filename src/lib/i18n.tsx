import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { en } from './translations/en';
import { nl } from './translations/nl';

export type Locale = 'en' | 'nl';
export type TranslationKey = keyof typeof en;

const dictionaries: Record<Locale, Record<string, string>> = { en, nl };

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  nl: 'Nederlands',
};

const LS_KEY = 'osl_locale';

function getInitialLocale(): Locale {
  const stored = localStorage.getItem(LS_KEY);
  if (stored === 'en' || stored === 'nl') return stored;
  const browser = navigator.language.slice(0, 2);
  if (browser === 'nl') return 'nl';
  return 'en';
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(LS_KEY, l);
  }, []);

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
    let str = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replaceAll(`{{${k}}}`, String(v));
      }
    }
    return str;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
