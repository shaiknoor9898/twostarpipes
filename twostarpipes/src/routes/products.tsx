import { getCatalogue } from "@/lib/catalogue.functions";
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/site/PageHeader";
import { GAUGES, PRODUCTS } from "@/lib/site";

export const Route = createFileRoute("/products")({
  loader: () => getCatalogue(),
  head: () => ({
    links: [{ rel: "canonical", href: "https://www.twostarpipes.com/products" }],
    meta: [
      { property: "og:url", content: "https://www.twostarpipes.com/products" },
      { title: "Products — PVC, UPVC, Casing & Electrical Pipes | Two Star Pipes" },
      {
        name: "description",
        content:
          "Browse Two Star PVC, agricultural, borewell casing, UPVC, electrical, drip pipes and drip fittings with sizes and pressure classes.",
      },
      { property: "og:title", content: "Two Star Pipes — Products" },
      {
        property: "og:description",
        content: "PVC, UPVC and electrical pipes in all common sizes.",
      },
    ],
  }),
  component: Products,
});

function Products() {
  const products = Route.useLoaderData();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (!category || p.category === category) &&
          `${p.name} ${p.description}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [products, search, category],
  );
  return (
    <>
      <PageHeader eyebrow="Products" title="Strong pipes for farms, homes and wiring">
        PVC, agricultural, casing, UPVC, electrical and drip pipes plus drip fittings — in many
        sizes and {GAUGES.join(" & ")} pressure classes. Ask us for wholesale or farmer prices.
      </PageHeader>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-16 md:space-y-24 md:px-6 md:py-24">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            Search products
            <input
              className="mt-2 w-full rounded-md border bg-card p-3"
              disabled={!hydrated}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            Category
            <select
              className="mt-2 w-full rounded-md border bg-card p-3"
              disabled={!hydrated}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {[...new Set(products.map((p) => p.category))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        {!filtered.length && <p>No matching products. Try another search or contact us.</p>}
        {filtered.map((p, i) => (
          <section
            key={p.slug}
            id={p.slug}
            className="grid scroll-mt-28 items-center gap-10 md:grid-cols-2"
          >
            <img
              src={p.image}
              alt={p.name}
              loading="lazy"
              width={1024}
              height={768}
              className={`w-full rounded-3xl border bg-card object-cover shadow-soft ${i % 2 ? "md:order-2" : ""}`}
            />
            <div>
              <p className="eyebrow">{p.short}</p>
              <h2 className="headline mt-3 text-4xl text-primary md:text-5xl">{p.name}</h2>
              <p className="mt-4 text-lg text-muted-foreground">{p.description}</p>
              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {p.uses.map((u) => (
                  <li key={u} className="flex items-center gap-2">
                    <Check className="size-5 text-accent" /> {u}
                  </li>
                ))}
              </ul>
              {p.specifications && <p className="mt-4 whitespace-pre-wrap">{p.specifications}</p>}
              {p.brochure && (
                <a
                  href={p.brochure}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block underline"
                >
                  Download product brochure (PDF)
                </a>
              )}
              {p.advantages && (
                <>
                  <p className="mt-6 font-display text-sm font-semibold text-primary">Advantages</p>
                  <ul className="mt-2 space-y-2">
                    {p.advantages.map((a) => (
                      <li key={a} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-5 shrink-0 text-accent" /> {a}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {p.gauges && (
                <>
                  <p className="mt-6 font-display text-sm font-semibold text-primary">
                    Pressure class (gauge)
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {p.gauges.map((g) => (
                      <span
                        key={g}
                        className="rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </>
              )}
              <p className="mt-6 font-display text-sm font-semibold text-primary">
                Available sizes
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {p.sizes.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-leaf-soft px-3 py-1 text-sm font-semibold text-accent"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <Button asChild variant="leaf" size="lg" className="mt-8">
                <Link to="/contact">
                  <FileText /> Get price for {p.name}
                </Link>
              </Button>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
