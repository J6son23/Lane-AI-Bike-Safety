import { createContext, useContext, useState } from "react";
import { translations, LANGUAGES } from "@/i18n/translations";
import type { Language, TranslationKey } from "@/i18n/translations";

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => translations.en[key] ?? key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("app_language");
      if (saved && saved in LANGUAGES) return saved as Language;
    } catch {}
    return "en";
  });

  const setLang = (l: Language) => {
    setLangState(l);
    try { localStorage.setItem("app_language", l); } catch {}
  };

  const t = (key: TranslationKey): string =>
    (translations[lang] as Record<string, string>)[key] ??
    (translations.en as Record<string, string>)[key] ??
    key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
