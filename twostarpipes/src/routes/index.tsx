import { getCatalogue } from "@/lib/catalogue.functions";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  FileText,
  Handshake,
  Layers,
  Mail,
  MapPin,
  Phone,
  Quote,
  Sprout,
  Star,
  Zap,
} from "lucide-react";
import factory from "@/assets/factory-extrusion.jpg";
import farmer from "@/assets/farmer-pipes.jpg";
import warehouse from "@/assets/warehouse-stock.jpg";
import celebration from "@/assets/celebration-37-years.jpg";
import hero from "@/assets/hero-farm-pipes.jpg";
import { Button } from "@/components/ui/button";
import { HeroSlider } from "@/components/site/HeroSlider";
import { WhatsAppIcon } from "@/components/site/WhatsAppIcon";
import { GAUGES, PRODUCTS, SITE } from "@/lib/site";

export const Route = createFileRoute("/")({
  loader: () => getCatalogue(),
  head: () => ({
    links: [{ rel: "canonical", href: "https://www.twostarpipes.com/" }],
    meta: [
      { property: "og:url", content: "https://www.twostarpipes.com/" },
      { title: "Two Star Pipes Industries — Celebrating 37 Years | PVC, UPVC, Casing Pipes" },
      {
        name: "description",
        content:
          "Celebrating 37 years of pipe manufacturing. PVC, agricultural, casing, UPVC, electrical and drip pipes for farmers, dealers and wholesalers.",
      },
      {
        property: "og:title",
        content: "Two Star Pipes Industries — Celebrating 37 Years of Trust",
      },
      {
        property: "og:description",
        content:
          "Be a Star, Be with Star. PVC, agricultural, casing, UPVC and electrical pipes direct from the factory.",
      },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { icon: Sprout, title: "Reliable Pipes", sub: "for Agriculture" },
  { icon: Layers, title: "Durable &", sub: "Long Lasting" },
  { icon: Zap, title: "Electrical", sub: "Piping Solutions" },
  { icon: Handshake, title: "Trusted by", sub: "Dealers & Wholesalers" },
];

const STATS = [
  { value: `${SITE.years}+`, label: "Years of manufacturing" },
  { value: SITE.farmersServed, label: "Farmers served" },
  { value: "ISO", label: "9001:2015 certified" },
  { value: "Direct", label: "Factory prices" },
];

const STRIP = [
  ...PRODUCTS.map((p) => ({ src: p.image, label: p.name })),
  { src: celebration, label: "Our team" },
  { src: factory, label: "Our factory" },
  { src: warehouse, label: "Ready stock" },
  { src: farmer, label: "Happy farmers" },
  { src: hero, label: "In the field" },
];

function Index() {
  const products = Route.useLoaderData();
  return (
    <>
      <h1 className="sr-only">Two Star Pipes Industries — celebrating {SITE.years} years</h1>
      <HeroSlider />

      {/* Feature strip — floating card */}
      <section className="relative z-10 px-4 pt-6 md:px-6">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-6 rounded-2xl border bg-card px-4 py-8 shadow-lift md:grid-cols-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`flex items-center justify-center gap-3 px-2 ${i > 0 ? "md:border-l" : ""}`}
            >
              <f.icon className="size-8 shrink-0 text-accent md:size-9" strokeWidth={1.75} />
              <p className="font-display text-sm font-semibold leading-tight text-primary md:text-base">
                {f.title}
                <br />
                {f.sub}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Product overview */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <div className="text-center">
          <p className="eyebrow">Our Products</p>
          <h2 className="headline mt-3 text-3xl text-primary md:text-5xl">
            Uncompromised quality, <span className="text-accent">assured performance</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            PVC, agricultural, casing, UPVC, electrical and drip pipes with drip fittings — all made
            in our Rayachoty factory, in {GAUGES.join(" and ")} pressure classes.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {products.map((p, i) => (
            <article
              key={p.slug}
              className={`group overflow-hidden rounded-3xl border bg-card shadow-soft ${
                i === products.length - 1 && products.length % 2 === 1 ? "lg:col-span-2" : ""
              }`}
            >
              <div className="grid h-full sm:grid-cols-2">
                <div className="relative aspect-[4/3] overflow-hidden sm:aspect-auto sm:min-h-[320px]">
                  <img
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    width={1024}
                    height={768}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col p-6 md:p-8">
                  <p className="text-sm font-semibold text-accent">{p.short}</p>
                  <h3 className="headline mt-1 text-3xl text-primary">{p.name}</h3>
                  <span className="rule-leaf mt-4" />
                  <p className="mt-4 text-muted-foreground">{p.description}</p>
                  <ul className="mt-5 space-y-2">
                    {(p.advantages ?? p.uses).slice(0, 4).map((u) => (
                      <li
                        key={u}
                        className="flex items-center gap-2 font-display font-semibold text-primary"
                      >
                        <Check className="size-4 shrink-0 text-accent" /> {u}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant="navy" className="mt-6 self-start">
                    <Link to="/products" hash={p.slug}>
                      View Product <ArrowRight />
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Auto-scrolling photo strip */}
      <section
        className="overflow-hidden bg-navy-gradient py-12 md:py-16"
        aria-label="Photo gallery"
      >
        <div className="mx-auto mb-8 max-w-7xl px-4 md:px-6">
          <h2 className="headline text-3xl text-primary-foreground md:text-4xl">
            Our pipes, our people
          </h2>
        </div>
        <div className="flex w-max animate-marquee gap-4">
          {[...STRIP, ...STRIP].map((s, i) => (
            <figure
              key={i}
              className="relative h-48 w-72 shrink-0 overflow-hidden rounded-2xl md:h-60 md:w-96"
              aria-hidden={i >= STRIP.length}
            >
              <img
                src={s.src}
                alt={s.label}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-deep/90 to-transparent p-3 font-display text-sm font-semibold text-primary-foreground">
                {s.label}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Message */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <div className="grid items-center overflow-hidden rounded-3xl bg-leaf-panel md:grid-cols-[2fr_3fr]">
          <div className="relative h-64 md:h-full md:min-h-[340px]">
            <img
              src={factory}
              alt="Two Star pipe extrusion line in the factory"
              loading="lazy"
              width={1280}
              height={896}
              className="absolute inset-0 h-full w-full object-cover md:[clip-path:polygon(0_0,100%_0,88%_100%,0_100%)]"
            />
          </div>
          <div className="p-8 md:p-12">
            <p className="eyebrow">Trusted Leadership</p>
            <h2 className="headline mt-3 text-3xl text-primary md:text-4xl">
              A Message from Our Proprietor
            </h2>
            <Quote className="mt-5 size-8 text-accent/40" />
            <p className="mt-2 text-lg text-foreground/80">
              For {SITE.years} years, Two Star Pipes Industries has delivered durable and reliable
              piping solutions that support the growth of Indian farmers and our trusted dealer
              network. Be a Star — be with Star.
            </p>
            <span className="rule-leaf mt-6" />
            <p className="mt-4 font-display text-xl font-bold text-primary">{SITE.proprietor}</p>
            <p className="text-sm text-muted-foreground">Proprietor, Two Star Pipes Industries</p>
          </div>
        </div>
      </section>

      {/* Stats + farmers */}
      <section className="bg-muted/60">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:px-6 md:py-24">
          <div>
            <p className="eyebrow">Direct to Farmers</p>
            <h2 className="headline mt-3 text-3xl text-primary md:text-5xl">
              From our factory to your field
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              We sell wholesale to dealers and directly to farmers — so you get strong pipes at
              fair, factory-direct prices.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {STATS.map((s) => (
                <div key={s.label} className="rounded-xl border bg-card p-5">
                  <p className="headline text-xl sm:text-2xl md:text-xl lg:text-3xl text-accent">
                    {s.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <img
            src={farmer}
            alt="Farmer holding a Two Star PVC pipe in his field"
            loading="lazy"
            width={1024}
            height={1024}
            className="aspect-square w-full rounded-3xl object-cover shadow-lift"
          />
        </div>
      </section>

      {/* Visit us */}
      <section className="py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 md:px-6 lg:grid-cols-[2fr_3fr]">
          <div>
            <p className="eyebrow">Visit Our Factory</p>
            <h2 className="headline mt-3 text-3xl text-primary md:text-4xl">
              Rayachoty, Andhra Pradesh
            </h2>
            <ul className="mt-8 space-y-5">
              <li className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-leaf-soft text-accent">
                  <MapPin className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display font-semibold text-primary">
                    {SITE.addressLine1}
                  </span>
                  <span className="text-muted-foreground">{SITE.addressLine2}</span>
                </span>
              </li>
              <li className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-leaf-soft text-accent">
                  <Phone className="size-5" />
                </span>
                <span className="font-display font-semibold text-primary">
                  <a href={SITE.phoneHref} className="block hover:text-accent">
                    {SITE.phone}
                  </a>
                  <a href={SITE.phone2Href} className="block hover:text-accent">
                    {SITE.phone2}
                  </a>
                </span>
              </li>
              <li className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-leaf-soft text-accent">
                  <Mail className="size-5" />
                </span>
                <span className="min-w-0">
                  <a
                    href={`mailto:${SITE.email}`}
                    className="block break-all font-display font-semibold text-primary hover:text-accent"
                  >
                    {SITE.email}
                  </a>
                  <span className="text-muted-foreground">{SITE.website}</span>
                </span>
              </li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="navy" size="lg">
                <a href={SITE.mapLink} target="_blank" rel="noreferrer">
                  <MapPin /> Get Directions
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                className="bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
              >
                <a href={SITE.whatsappHref} target="_blank" rel="noreferrer">
                  <WhatsAppIcon /> WhatsApp Us
                </a>
              </Button>
            </div>
          </div>
          <div className="min-h-[320px] overflow-hidden rounded-3xl border bg-card shadow-soft">
            <iframe
              title="Two Star Pipes Industries location map"
              src={SITE.mapEmbed}
              loading="lazy"
              className="h-full min-h-[320px] w-full border-0"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-16 md:px-6 md:pb-24">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-3xl bg-navy-gradient p-8 text-primary-foreground md:flex-row md:items-center md:p-14">
          <div>
            <p className="flex items-center gap-2 font-display font-semibold italic text-gold">
              <Star className="size-4 fill-current" /> {SITE.slogan}
            </p>
            <h2 className="headline mt-2 text-3xl md:text-4xl">Need pipes in bulk?</h2>
            <p className="mt-2 text-primary-foreground/75">
              Tell us what you need and we will call you back with the best price.
            </p>
          </div>
          <Button asChild variant="leaf" size="lg">
            <Link to="/contact">
              <FileText /> Request a Quote
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
