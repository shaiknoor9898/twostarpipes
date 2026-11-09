import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { quoteSchema } from "./quote-schema";

export const submitQuote = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => quoteSchema.parse(input))
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { error } = await client.from("quote_requests").insert({
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      city: data.city || null,
      customer_type: data.customer_type,
      product: data.product,
      quantity: data.quantity || null,
      message: data.message || null,
    });

    if (error) {
      console.error("quote insert failed", error);
      return { ok: false as const, error: "Could not send your request. Please call us." };
    }
    return { ok: true as const };
  });
