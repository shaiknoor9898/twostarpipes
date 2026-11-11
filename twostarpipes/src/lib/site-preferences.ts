import { createContext, useContext } from "react";
import { translate } from "./telugu";
export type Language = "en" | "te";
export const Preferences = createContext({
  language: "en" as Language,
  ready: false,
  setLanguage: (_language: Language) => {},
  t: (text: string, values?: Record<string, string | number>) => translate("en", text, values),
});
export function useSitePreferences() {
  return useContext(Preferences);
}
