import { Text } from "@/components/site/SitePreferences";
import { useSitePreferences } from "@/lib/site-preferences";
import logo37 from "@/assets/two-star-37-years-logo.png";
import { SITE } from "@/lib/site";

/** "37th Years of Excellence" logo shown beside the main logo and on the hero. */
export function CelebrationBadge({ size = "sm" }: { size?: "sm" | "lg" }) {
  const { t } = useSitePreferences();
  const alt = `${SITE.years}th Years of Excellence`;
  if (size === "lg") {
    return (
      <div className="shrink-0 rounded-3xl bg-card p-4 shadow-lift">
        <img src={logo37} alt={t(alt)} width={1967} height={799} className="h-auto w-64 lg:w-80" />
      </div>
    );
  }
  return (
    <div className="flex shrink-0 items-center border-l pl-3">
      <img
        src={logo37}
        alt={t(alt)}
        width={1967}
        height={799}
        className="h-9 w-auto sm:h-11 md:h-14"
      />
    </div>
  );
}
