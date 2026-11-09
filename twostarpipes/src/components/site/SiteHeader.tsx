import { Link } from "@tanstack/react-router";
import { useState } from "react";
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
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 shadow-soft">
      {/* Main bar */}
      <div className="border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/" className="min-w-0 shrink" aria-label="Two Star Pipes Industries home">
              <img src={logo} alt="Two Star Pipes Industries" width={900} height={168} className="h-8 w-auto sm:h-10 md:h-12" />
            </Link>
            <CelebrationBadge />
          </div>

          <nav className="hidden items-center gap-0.5 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                className="relative whitespace-nowrap px-3 py-2 font-display text-[15px] font-medium text-foreground transition-colors after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-accent after:transition-transform hover:text-primary hover:after:scale-x-100"
                activeProps={{ className: "text-primary font-semibold after:scale-x-100" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a href={SITE.phoneHref} className="hidden items-center gap-3 whitespace-nowrap 2xl:flex">
              <span className="grid size-11 place-items-center rounded-full bg-leaf-soft text-accent">
                <Phone className="size-5" />
              </span>
              <span className="leading-tight">
                <span className="block text-xs text-muted-foreground">Call for best price</span>
                <span className="block font-display font-bold text-primary">{SITE.phone}</span>
              </span>
            </a>
            <a
              href={SITE.whatsappHref}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp us"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-whatsapp text-whatsapp-foreground hover:opacity-90"
            >
              <WhatsAppIcon className="size-5" />
            </a>
            <Button asChild variant="leaf" size="lg" className="hidden sm:inline-flex">
              <Link to="/contact">
                <FileText /> Get a Quote
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="!size-6" /> : <Menu className="!size-6" />}
            </Button>
          </div>
        </div>

        {open && (
          <nav className="border-t bg-card px-4 pb-4 lg:hidden">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: n.to === "/" }}
                className="block rounded-lg px-3 py-3 font-display text-base font-medium"
                activeProps={{ className: "bg-leaf-soft text-accent" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
