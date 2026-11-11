import { Preferences, useSitePreferences, type Language } from "@/lib/site-preferences";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { translate } from "@/lib/telugu";

// Clear the retired appearance preference before first paint.
export const APPEARANCE_INIT_SCRIPT =
  "document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';try{localStorage.removeItem('two-star-theme')}catch(e){}";

export function SitePreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const lang = localStorage.getItem("two-star-language");
      if (lang === "te" || lang === "en") setLanguage(lang);
    } catch {
      /* Preferences remain usable when storage is blocked. */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = language;
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
    try {
      localStorage.setItem("two-star-language", language);
      localStorage.removeItem("two-star-theme");
    } catch {
      /* Do not prevent changing preferences in private/restricted browsers. */
    }
  }, [language, ready]);
  const t = useCallback(
    (text: string, values?: Record<string, string | number>) => translate(language, text, values),
    [language],
  );
  const value = useMemo(() => ({ language, ready, setLanguage, t }), [language, ready, t]);
  return <Preferences.Provider value={value}>{children}</Preferences.Provider>;
}
export function Text({
  text,
  values,
}: {
  text: string | number | null | undefined;
  values?: Record<string, string | number>;
}) {
  const { t } = useSitePreferences();
  return text == null ? null : t(String(text), values);
}
export function SitePreferencesControls() {
  const { language, setLanguage, ready, t } = useSitePreferences();
  const field =
    "h-9 w-20 cursor-pointer rounded-full border border-primary/15 bg-background px-2 text-xs font-semibold text-primary shadow-sm transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-28 sm:text-sm";
  return (
    <div className="flex shrink-0 items-center">
      <label className="relative">
        <span className="sr-only">{t("Language")}</span>
        <select
          aria-label={t("Language")}
          className={field}
          disabled={!ready}
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
        >
          <option value="en" lang="en">
            English
          </option>
          <option value="te" lang="te">
            తెలుగు
          </option>
        </select>
      </label>
    </div>
  );
}
