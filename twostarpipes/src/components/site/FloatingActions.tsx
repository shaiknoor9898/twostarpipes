import { Link } from "@tanstack/react-router";
import { FileText, Phone } from "lucide-react";
import { SITE } from "@/lib/site";
import { WhatsAppIcon } from "./WhatsAppIcon";

/** Right-side floating buttons (desktop/tablet): quote, call, WhatsApp. */
export function FloatingActions() {
  const base =
    "group flex items-center gap-2 rounded-l-full py-3 pl-4 pr-3 font-display text-sm font-semibold shadow-lift transition-transform hover:-translate-x-1";
  return (
    <div className="fixed right-0 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-2 md:flex">
      <Link
        to="/contact"
        className={`${base} bg-accent text-accent-foreground`}
        aria-label="Get a quote"
      >
        <FileText className="size-5" />
        <span className="hidden group-hover:inline">Get a Quote</span>
      </Link>
      <a
        href={SITE.phoneHref}
        className={`${base} bg-primary text-primary-foreground`}
        aria-label="Call us"
      >
        <Phone className="size-5" />
        <span className="hidden group-hover:inline">{SITE.phone}</span>
      </a>
      <a
        href={SITE.whatsappHref}
        target="_blank"
        rel="noreferrer"
        className={`${base} bg-whatsapp text-whatsapp-foreground`}
        aria-label="Chat on WhatsApp"
      >
        <WhatsAppIcon className="size-6" />
        <span className="hidden group-hover:inline">WhatsApp</span>
      </a>
    </div>
  );
}

/** Round WhatsApp bubble above the phone bottom bar. */
export function WhatsAppBubble() {
  return (
    <a
      href={SITE.whatsappHref}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-20 right-4 z-40 grid size-14 place-items-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-lift md:hidden"
    >
      <WhatsAppIcon className="size-8" />
    </a>
  );
}
