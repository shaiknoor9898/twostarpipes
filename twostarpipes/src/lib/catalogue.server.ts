import { createClient } from "@supabase/supabase-js";
import { publicSupabaseConfig } from "@/integrations/supabase/public-config";
import { PRODUCTS } from "./site";
import { productSchema } from "./admin-schema";

export async function loadCatalogue() {
  if (process.env["MANAGED_CATALOGUE"] !== "true")
    return PRODUCTS.map((p) => ({ ...p, category: p.short, specifications: "", brochure: "" }));
  const { url, key } = publicSupabaseConfig(
    process.env["SUPABASE_URL"],
    process.env["SUPABASE_PUBLISHABLE_KEY"],
  );
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_publishable_") && headers.get("Authorization") === `Bearer ${key}`)
          headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers, signal: AbortSignal.timeout(10000) });
      },
    },
  });
  const result = await client
    .from("products")
    .select(
      "slug,name,category,short,description,image,uses,sizes,gauges,advantages,specifications,brochure,published",
    )
    .eq("published", true)
    .order("name");
  if (result.error) throw new Error("Catalogue unavailable. Please call for product details.");
  return result.data.map((row) => {
    const product = productSchema.parse(row);
    const original = PRODUCTS.find((p) => `builtin:${p.slug}` === product.image);
    return { ...product, image: original?.image || product.image };
  });
}
