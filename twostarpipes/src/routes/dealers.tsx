import { getCatalogue } from "@/lib/catalogue.functions";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeIndianRupee, Boxes, Headset, Truck } from "lucide-react";
import warehouse from "@/assets/warehouse-stock.jpg";
import { PageHeader } from "@/components/site/PageHeader";
import { QuoteForm } from "@/components/site/QuoteForm";

export const Route = createFileRoute("/dealers")({
  loader: () => getCatalogue(),
  head: () => ({
    links: [{ rel: "canonical", href: "https://www.twostarpipes.com/dealers" }],
    meta: [
      { property: "og:url", content: "https://www.twostarpipes.com/dealers" },
      { title: "Become a Dealer — Two Star Pipes Industries" },
      {
        name: "description",
        content:
          "Join the Two Star Pipes dealer and wholesaler network. Factory-direct pricing, steady stock and timely delivery.",
      },
      { property: "og:title", content: "Become a Two Star Pipes Dealer" },
      {
        property: "og:description",
        content: "Wholesale PVC, UPVC and electrical pipes at factory prices.",
      },
    ],
  }),
  component: Dealers,
});

const BENEFITS = [
  {
    icon: BadgeIndianRupee,
    title: "Factory prices",
    text: "Buy direct from the manufacturer with good margins.",
  },
  {
    icon: Boxes,
    title: "Full range in stock",
    text: "PVC, UPVC and electrical pipes in all common sizes.",
  },
  { icon: Truck, title: "Timely delivery", text: "Bulk orders dispatched on time to your shop." },
  {
    icon: Headset,
    title: "Dedicated support",
    text: "A direct line to our sales team for every order.",
  },
];

function Dealers() {
  const products = Route.useLoaderData();
  return (
    <>
      <PageHeader
        eyebrow="Dealers & Wholesalers"
        title="Grow your business with Two Star"
        image={warehouse}
      >
        Our dealers and wholesalers have trusted us for decades. Join the network today.
      </PageHeader>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-2xl border bg-card p-6 shadow-soft">
              <b.icon className="size-10 text-accent" strokeWidth={1.75} />
              <h3 className="mt-4 font-display text-xl font-bold text-primary">{b.title}</h3>
              <p className="mt-2 text-muted-foreground">{b.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[2fr_3fr]">
          <div>
            <p className="eyebrow">Dealer Enquiry</p>
            <h2 className="headline mt-3 text-3xl text-primary md:text-4xl">
              Apply to become a dealer
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Share your details and our sales team will call you with dealer pricing.
            </p>
          </div>
          <QuoteForm defaultType="dealer" products={products} />
        </div>
      </section>
    </>
  );
}
