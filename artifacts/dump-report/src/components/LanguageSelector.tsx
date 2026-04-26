import { LANGUAGES } from "@/i18n/translations";
import type { Language } from "@/i18n/translations";
import { useLang } from "@/contexts/LanguageContext";
import { ChevronDown } from "lucide-react";

export function LanguageSelector() {
  const { lang, setLang } = useLang();

  return (
    <div className="relative inline-block">
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Language)}
        className="appearance-none pl-3 pr-8 py-1.5 text-sm font-medium border border-gray-300 rounded-full bg-white text-gray-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-400"
        style={{ minWidth: 110 }}
      >
        {(Object.entries(LANGUAGES) as [Language, string][]).map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
    </div>
  );
}
