import { useEffect } from "react";
import { useSitePreferences } from "@/lib/site-preferences";
import { TELUGU, translate } from "@/lib/telugu";
const english = new Map(Object.entries(TELUGU).map(([en, te]) => [te, en]));
export function LocalizedMetadata({ enabled }: { enabled: boolean }) {
  const { language } = useSitePreferences();
  useEffect(() => {
    if (!enabled) return;
    const update = () => {
      const title = translate(language, english.get(document.title) ?? document.title);
      if (document.title !== title) document.title = title;
      document.head
        .querySelectorAll<HTMLMetaElement>(
          'meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"]',
        )
        .forEach((meta) => {
          const next = translate(language, english.get(meta.content) ?? meta.content);
          if (next !== meta.content) meta.content = next;
        });
    };
    const observer = new MutationObserver(update);
    observer.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["content"],
    });
    update();
    return () => observer.disconnect();
  }, [language, enabled]);
  return null;
}
