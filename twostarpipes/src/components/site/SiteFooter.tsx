import { Text } from "@/components/site/SitePreferences";
import { useSitePreferences } from "@/lib/site-preferences";
import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { PRODUCTS, SITE } from "@/lib/site";
import { WhatsAppIcon } from "./WhatsAppIcon";

export function SiteFooter() {
  const { t } = useSitePreferences();
  return (
    <footer className="bg-navy-gradient text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 lg:grid-cols-4 md:px-6">
        <div className="md:col-span-2">
          <p className="headline text-3xl">
            <Text text={"Two Star Pipes Industries"} />
          </p>
          <p className="mt-3 max-w-md text-primary-foreground/75">
            <Text
              text="{years} years of manufacturing PVC, agricultural, casing, UPVC, electrical and drip pipes for farmers, dealers and wholesalers."
              values={{ years: SITE.years }}
            />
          </p>
          <p className="mt-4 headline text-2xl text-gold">
            <Text text={SITE.slogan} />
          </p>
          <p className="mt-2 italic text-leaf">
            “<Text text={SITE.tagline} />”
          </p>
          <p className="mt-4 text-sm text-primary-foreground/60">
            <Text text={"Proprietor: "} />
            {SITE.proprietor} · {SITE.website}
          </p>
        </div>
        <div>
          <p className="font-display font-semibold">
            <Text text={"Products"} />
          </p>
          <ul className="mt-3 space-y-2 text-primary-foreground/75">
            {PRODUCTS.map((p) => (
              <li key={p.slug}>
                <Link to="/products" hash={p.slug} className="hover:text-leaf">
                  <Text text={p.name} />
                </Link>
              </li>
            ))}
            <li>
              <Link to="/dealers" className="hover:text-leaf">
                <Text text={"Become a dealer"} />
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-display font-semibold">
            <Text text={"Contact"} />
          </p>
          <ul className="mt-3 space-y-3 text-primary-foreground/75">
            <li>
              <a href={SITE.phoneHref} className="flex items-center gap-2 hover:text-leaf">
                <Phone className="size-4" /> {SITE.phone}
              </a>
            </li>
            <li>
              <a href={SITE.phone2Href} className="flex items-center gap-2 hover:text-leaf">
                <Phone className="size-4" /> {SITE.phone2}
              </a>
            </li>
            <li>
              <a
                href={SITE.whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-leaf"
              >
                <WhatsAppIcon className="size-4 text-whatsapp" />
                <Text text={" WhatsApp"} />
              </a>
            </li>
            <li>
              <a href={`mailto:${SITE.email}`} className="flex items-center gap-2 hover:text-leaf">
                <Mail className="size-4" /> {SITE.email}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-1 size-4 shrink-0" /> <Text text={SITE.address} />
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15 py-5 pb-24 text-center text-sm text-primary-foreground/60 md:pb-5">
        © {new Date().getFullYear()}
        <Text text={" Two Star Pipes Industries. All rights reserved."} />
      </div>
    </footer>
  );
}

/** Thumb-reach call / WhatsApp bar for phones — makes the site feel like an app. */
export function MobileActionBar() {
  const { t } = useSitePreferences();
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t bg-card shadow-lift md:hidden">
      <a
        href={SITE.phoneHref}
        className="flex flex-col items-center gap-1 py-2.5 text-xs font-semibold text-primary"
      >
        <Phone className="size-5" />
        <Text text={" Call"} />
      </a>
      <a
        href={SITE.whatsappHref}
        target="_blank"
        rel="noreferrer"
        className="flex flex-col items-center gap-1 py-2.5 text-xs font-semibold text-whatsapp"
      >
        <WhatsAppIcon className="size-5" />
        <Text text={" WhatsApp"} />
      </a>
      <Link
        to="/contact"
        className="flex flex-col items-center gap-1 bg-accent py-2.5 text-xs font-semibold text-accent-foreground"
      >
        <Mail className="size-5" />
        <Text text={" Get Quote"} />
      </Link>
    </div>
  );
}
