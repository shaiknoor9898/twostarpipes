import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/site/WhatsAppIcon";
import { QuoteForm } from "@/components/site/QuoteForm";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Request a Quote — Two Star Pipes Industries" },
      {
        name: "description",
        content: "Call, WhatsApp or send a quote request to Two Star Pipes Industries for PVC, UPVC and electrical pipes.",
      },
      { property: "og:title", content: "Contact Two Star Pipes Industries" },
      { property: "og:description", content: "Request a quote for PVC, UPVC and electrical pipes." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const items = [
    { icon: Phone, label: "Call us", value: SITE.phone, href: SITE.phoneHref },
    { icon: Phone, label: "Call us (alternate)", value: SITE.phone2, href: SITE.phone2Href },
    { icon: WhatsAppIcon, label: "WhatsApp", value: "Chat with us", href: SITE.whatsappHref },
    { icon: Mail, label: "Email", value: SITE.email, href: `mailto:${SITE.email}` },
    { icon: MapPin, label: "Address", value: SITE.address },
    { icon: Clock, label: "Working hours", value: SITE.hours },
  ];
  return (
    <>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:px-6 md:py-12 lg:grid-cols-[3fr_2fr]">
        <div>
          <p className="eyebrow">Get a Quote</p>
          <h1 className="headline mt-2 text-3xl text-primary md:text-5xl">Your details — we call you back</h1>
          <p className="mb-6 mt-3 text-muted-foreground">
            Farmers, dealers and wholesalers: fill in your name, phone and the pipes you need.
          </p>
          <QuoteForm />
        </div>
        <ul className="space-y-3 lg:pt-[7.5rem]">
          {items.map((it) => {
            const body = (
              <>
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-leaf-soft text-accent">
                  <it.icon className="size-6" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-muted-foreground">{it.label}</span>
                  <span className="block break-words font-display text-base font-semibold text-primary md:text-lg">{it.value}</span>
                </span>
              </>
            );
            return (
              <li key={it.label}>
                {it.href ? (
                  <a href={it.href} className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition-shadow hover:shadow-soft">
                    {body}
                  </a>
                ) : (
                  <div className="flex items-center gap-4 rounded-2xl border bg-card p-4">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6 md:pb-24">
        <div className="overflow-hidden rounded-3xl border bg-card shadow-soft">
          <iframe
            title="Two Star Pipes Industries location map"
            src={SITE.mapEmbed}
            loading="lazy"
            className="h-[320px] w-full border-0 md:h-[400px]"
          />
        </div>
      </section>
    </>
  );
}
