import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutGrid,
  Phone,
  Star,
  Pause,
  Play,
} from "lucide-react";
import celebration from "@/assets/celebration-37-years.jpg";
import hero from "@/assets/hero-farm-pipes.jpg";
import agri from "@/assets/product-agricultural.jpg";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import { CelebrationBadge } from "./CelebrationBadge";

type Slide = {
  image: string;
  alt: string;
  eyebrow: string;
  title: React.ReactNode;
  text: string;
  badge?: boolean;
};

const SLIDES: Slide[] = [
  {
    image: celebration,
    alt: "Two Star team celebrating 37 years at the factory",
    eyebrow: `Celebrating ${SITE.years} Years · ${SITE.slogan}`,
    title: (
      <>
        {SITE.years} Years of Trust in <span className="text-leaf">Pipe Manufacturing</span>
      </>
    ),
    text: "Thank you, farmers, dealers and wholesalers, for growing with us.",
    badge: true,
  },
  {
    image: hero,
    alt: "Grey PVC pipe pouring water into a green paddy field",
    eyebrow: "Agricultural & Casing Pipes",
    title: (
      <>
        Water for every field, <span className="text-leaf">pipes for every farmer</span>
      </>
    ),
    text: "PVC, agricultural, drip and borewell casing pipes — direct from our factory.",
  },
  {
    image: agri,
    alt: "Grey irrigation pipeline running through a crop field",
    eyebrow: SITE.slogan,
    title: (
      <>
        Factory-direct prices for <span className="text-leaf">dealers & farmers</span>
      </>
    ),
    text: "PVC, UPVC, casing, electrical and drip pipes in 4 & 6 kgf/cm² classes.",
  },
];

export function HeroSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const go = (n: number) => setIndex((n + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    if (paused || hovered || focused || reduced) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5500);
    return () => clearInterval(t);
  }, [paused, hovered, focused, reduced]);

  return (
    <section
      className="relative overflow-hidden bg-navy-deep"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      aria-label="Two Star Pipes highlights"
      aria-roledescription="carousel"
    >
      <div
        className="flex transition-transform duration-700 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {SLIDES.map((s, i) => (
          <div
            key={i}
            className="relative min-h-[560px] w-full shrink-0 md:min-h-[600px]"
            aria-hidden={i !== index}
          >
            <img
              src={s.image}
              alt={s.alt}
              width={1920}
              height={1024}
              loading={i === 0 ? "eager" : "lazy"}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-hero-dark" />
            <div className="relative mx-auto flex min-h-[560px] max-w-7xl flex-col justify-center gap-8 px-4 py-16 md:min-h-[600px] md:flex-row md:items-center md:justify-between md:px-6">
              <div className="max-w-2xl text-primary-foreground">
                <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-navy-deep/60 px-4 py-1.5 text-sm font-semibold text-gold backdrop-blur">
                  <Star className="size-4 fill-current" /> {s.eyebrow}
                </p>
                <h2 className="headline mt-5 text-4xl sm:text-5xl md:text-7xl">{s.title}</h2>
                <span className="rule-leaf mt-6" />
                <p className="mt-5 text-lg text-primary-foreground/85 md:text-xl">{s.text}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button asChild variant="leaf" size="lg">
                    <Link to="/products" tabIndex={i === index ? 0 : -1}>
                      <LayoutGrid /> Explore Products
                    </Link>
                  </Button>
                  <Button asChild size="lg" className="bg-card text-primary hover:bg-card/90">
                    <Link to="/contact" tabIndex={i === index ? 0 : -1}>
                      <FileText /> Request a Quote
                    </Link>
                  </Button>
                </div>
                <a
                  href={SITE.phoneHref}
                  tabIndex={i === index ? 0 : -1}
                  className="mt-7 inline-flex items-center gap-3 hover:text-leaf"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                    <Phone className="size-5" />
                  </span>
                  <span className="font-display text-base font-bold sm:text-lg">
                    {SITE.phone} · {SITE.phone2}
                  </span>
                </a>
              </div>
              {s.badge && (
                <div className="hidden lg:block">
                  <CelebrationBadge size="lg" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="relative flex items-center justify-center gap-2 py-4">
        {reduced ? (
          <span className="rounded bg-navy-deep px-2 py-1 text-xs text-white">Autoplay off</span>
        ) : (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Play slideshow" : "Pause slideshow"}
            className="grid size-10 place-items-center rounded-full bg-card/30 text-white"
          >
            {paused ? <Play className="size-5" /> : <Pause className="size-5" />}
          </button>
        )}
        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label="Previous slide"
          className="mr-2 hidden size-9 place-items-center rounded-full bg-card/20 text-primary-foreground backdrop-blur hover:bg-card/40 md:grid"
        >
          <ChevronLeft className="size-5" />
        </button>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={`Show slide ${i + 1}`}
            aria-current={i === index ? "true" : undefined}
            className={`h-9 min-w-9 rounded-full border-8 border-transparent bg-clip-padding transition-all ${i === index ? "w-12 bg-leaf" : "w-9 bg-card/60"}`}
          />
        ))}
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Next slide"
          className="ml-2 hidden size-9 place-items-center rounded-full bg-card/20 text-primary-foreground backdrop-blur hover:bg-card/40 md:grid"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </section>
  );
}
