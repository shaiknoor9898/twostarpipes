import { Text } from "@/components/site/SitePreferences";
import { useSitePreferences } from "@/lib/site-preferences";
import { SitePreferencesControls } from "./SitePreferences";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FileText, Menu, Phone, X } from "lucide-react";
import logo from "@/assets/two-star-logo.png";
import { CelebrationBadge } from "./CelebrationBadge";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About Us" },
  { to: "/products", label: "Products" },
  { to: "/dealers", label: "Dealers" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const { t } = useSitePreferences();
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);
  useEffect(() => {
    if (open) menu.current?.querySelector<HTMLAnchorElement>("a")?.focus();
  }, [open]);
  return (
    <header className="sticky top-0 z-40 shadow-soft">
      {/* Main bar */}
      <div className="border-b bg-card/95 backdrop-blur">
        <div className="mx-auto grid h-20 max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 px-3 sm:gap-4 sm:px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className="min-w-0 shrink"
              aria-label={t("Two Star Pipes Industries home")}
            >
              <img
                src={logo}
                alt={t("Two Star Pipes Industries")}
                width={900}
                height={168}
                className="h-auto w-full max-w-40 sm:max-w-60"
              />
            </Link>
          </div>
          <div
            data-anniversary-logo
            className="justify-self-center [&>div]:border-0 [&>div]:pl-0 [&_img]:h-6 sm:[&_img]:h-11 md:[&_img]:h-14"
          >
            <CelebrationBadge />
          </div>

          <div className="flex min-w-0 items-center justify-self-end sm:gap-3">
            <SitePreferencesControls />
            <Button
              variant="ghost"
              size="icon"
              className="size-8 sm:size-9 xl:hidden"
              disabled={!hydrated}
              ref={toggle}
              aria-expanded={open}
              aria-controls="mobile-navigation"
              aria-label={t(open ? "Close menu" : "Open menu")}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="!size-6" /> : <Menu className="!size-6" />}
            </Button>
          </div>
        </div>

        <div className="mx-auto hidden max-w-7xl items-center justify-between gap-4 border-t px-6 py-2 xl:flex">
          <nav aria-label={t("Main navigation")} className="hidden items-center gap-0.5 xl:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                className="relative whitespace-nowrap px-3 py-2 font-display text-[15px] font-medium text-foreground transition-colors after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-accent after:transition-transform hover:text-primary hover:after:scale-x-100"
                activeProps={{ className: "text-primary font-semibold after:scale-x-100" }}
              >
                <Text text={n.label} />
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a
              href={SITE.phoneHref}
              className="hidden items-center gap-3 whitespace-nowrap 2xl:flex"
            >
              <span className="grid size-11 place-items-center rounded-full bg-leaf-soft text-accent">
                <Phone className="size-5" />
              </span>
              <span className="leading-tight">
                <span className="block text-xs text-muted-foreground">
                  <Text text={"Call for best price"} />
                </span>
                <span className="block font-display font-bold text-primary">{SITE.phone}</span>
              </span>
            </a>
            <a
              href={SITE.whatsappHref}
              target="_blank"
              rel="noreferrer"
              aria-label={t("WhatsApp us")}
              className="hidden size-11 shrink-0 place-items-center sm:grid rounded-full bg-whatsapp text-whatsapp-foreground hover:opacity-90"
            >
              <WhatsAppIcon className="size-5" />
            </a>
            <Button asChild variant="leaf" size="lg" className="inline-flex">
              <Link to="/contact">
                <FileText />
                <Text text={" Get a Quote"} />
              </Link>
            </Button>
          </div>
        </div>
        {open && (
          <nav
            ref={menu}
            id="mobile-navigation"
            aria-label={t("Mobile navigation")}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                toggle.current?.focus();
              }
            }}
            className="border-t bg-card px-4 pb-4 xl:hidden"
          >
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: n.to === "/" }}
                className="block rounded-lg px-3 py-3 font-display text-base font-medium"
                activeProps={{ className: "bg-leaf-soft text-accent" }}
              >
                <Text text={n.label} />
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
