import { Text } from "@/components/site/SitePreferences";
import { useSitePreferences } from "@/lib/site-preferences";
import { createFileRoute } from "@tanstack/react-router";
import { Award, Factory, Sprout, Truck } from "lucide-react";
import factory from "@/assets/factory-extrusion.jpg";
import warehouse from "@/assets/warehouse-stock.jpg";
import { PageHeader } from "@/components/site/PageHeader";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/about")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://www.twostarpipes.com/about" }],
    meta: [
      { property: "og:url", content: "https://www.twostarpipes.com/about" },
      { title: "About Us — Two Star Pipes Industries" },
      {
        name: "description",
        content:
          "Since 1989 in Rayachoty, Two Star Pipes Industries has made PVC, agricultural, casing, UPVC, electrical and drip pipes for farmers, dealers and wholesalers.",
      },
      { property: "og:title", content: "About Two Star Pipes Industries" },
      {
        property: "og:description",
        content: "37 years of pipe manufacturing for Indian farmers and dealers.",
      },
    ],
  }),
  component: About,
});

const VALUES = [
  {
    icon: Factory,
    title: "In-house manufacturing",
    text: "Every pipe is made in our own factory with strict quality checks.",
  },
  {
    icon: Award,
    title: "Quality you can trust",
    text: "Thick walls, correct sizes and pipes that last for years in the field.",
  },
  {
    icon: Sprout,
    title: "Made for farmers",
    text: "We understand irrigation needs and sell directly to farmers.",
  },
  {
    icon: Truck,
    title: "Wholesale supply",
    text: "Steady stock and timely delivery for dealers and wholesalers.",
  },
];

function About() {
  const { t } = useSitePreferences();
  return (
    <>
      <PageHeader
        eyebrow="About Us"
        title="37 years of making pipes India relies on"
        image={factory}
      >
        <Text
          text={
            "Two Star Pipes Industries manufactures PVC, agricultural, casing, UPVC, electrical and drip pipes with drip fittings. We supply wholesale to dealers and directly to farmers."
          }
        />
      </PageHeader>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:px-6 md:py-24">
        <img
          src={warehouse}
          alt={t("Two Star pipe stock ready for dispatch")}
          loading="lazy"
          width={1280}
          height={896}
          className="w-full rounded-3xl object-cover shadow-lift"
        />
        <div>
          <p className="eyebrow">
            <Text text={"Our Story"} />
          </p>
          <h2 className="headline mt-3 text-3xl text-primary md:text-4xl">
            <Text text={"Built on trust, one pipe at a time"} />
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            <Text
              text="Our founder, {founder}, started in {founded} in Rayachoty, Kadapa Dist, with one goal: quality pipes for drinking water, irrigation and drainage in the region. He was one of the first to start a PVC pipe factory in Rayachoty."
              values={{ founder: SITE.founder, founded: SITE.founded }}
            />
          </p>
          <p className="mt-4 text-lg text-muted-foreground">
            <Text
              text="Today {leaders} lead the company. We make pipes from 20 mm to 200 mm from virgin raw material on a German twin-screw RPVC plant. Star Pipes is one of the best-known PVC pipe brands in Rayalaseema."
              values={{ leaders: SITE.leaders.join(t(" and ")) }}
            />
          </p>
        </div>
      </section>

      <section className="bg-muted/60 py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-2 md:px-6 lg:grid-cols-4">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl border bg-card p-6 shadow-soft">
              <v.icon className="size-10 text-accent" strokeWidth={1.75} />
              <h3 className="mt-4 font-display text-xl font-bold text-primary">
                <Text text={v.title} />
              </h3>
              <p className="mt-2 text-muted-foreground">
                <Text text={v.text} />
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
