import { Text } from "@/components/site/SitePreferences";
import { useSitePreferences } from "@/lib/site-preferences";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  children,
  image,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  image?: string;
}) {
  const { t } = useSitePreferences();
  return (
    <section className="relative overflow-hidden bg-leaf-panel">
      {image && (
        <img
          src={image}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
      )}
      <div className="relative mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <p className="eyebrow">
          <Text text={eyebrow} />
        </p>
        <h1 className="headline mt-3 max-w-3xl text-4xl text-primary md:text-6xl">
          {typeof title === "string" ? <Text text={title} /> : title}
        </h1>
        <span className="rule-leaf mt-6" />
        {children && <div className="mt-6 max-w-2xl text-lg text-muted-foreground">{children}</div>}
      </div>
    </section>
  );
}
