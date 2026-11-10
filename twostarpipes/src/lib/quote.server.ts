import { protectQuote } from "./quote-security.server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { publicSupabaseConfig } from "@/integrations/supabase/public-config";
import { quoteSubmissionSchema } from "./quote-schema";

export async function saveQuote(input: unknown) {
  const parsed = quoteSubmissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Please check your request details." };
  try {
    if (!(await protectQuote(parsed.data.turnstileToken, parsed.data.phone)))
      return {
        ok: false as const,
        error: "Verification failed or too many requests. Please try again later.",
      };
    const { loadCatalogue } = await import("./catalogue.server");
    const products = await loadCatalogue();
    if (
      parsed.data.product !== "Multiple products" &&
      !products.some((p) => p.name === parsed.data.product)
    )
      return { ok: false as const, error: "Please choose an available product." };
    const writerKey = process.env["SUPABASE_QUOTE_WRITER_KEY"];
    if (!writerKey) throw new Error("Missing quotation writer credential");
    const parts = writerKey.split(".");
    const claims = JSON.parse(atob((parts[1] || "").replace(/-/g, "+").replace(/_/g, "/")));
    if (
      parts.length !== 3 ||
      claims.role !== "quote_writer" ||
      !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000
    )
      throw new Error("Invalid quotation writer credential");
    const { url, key } = publicSupabaseConfig(
      process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"],
      process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
    );
    const client = createClient<Database>(url, key, {
      global: {
        fetch: (input, init) => {
          const headers = new Headers(input instanceof Request ? input.headers : undefined);
          new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
          if (
            key.startsWith("sb_publishable_") &&
            headers.get("Authorization") === `Bearer ${key}`
          ) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          headers.set("Authorization", `Bearer ${writerKey}`);
          return fetch(input, { ...init, headers });
        },
      },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const data = parsed.data;
    const { error } = await client
      .from("quote_requests")
      .insert({
        request_id: data.requestId,
        name: data.name,
        phone: data.phone,
        customer_type: data.customer_type,
        product: data.product,
        email: data.email || null,
        city: data.city || null,
        quantity: data.quantity || null,
        message: data.message || null,
      })
      .abortSignal(AbortSignal.timeout(10000));
    if (error?.code === "23505" && error.message.includes('"quote_request_id_unique"'))
      return { ok: true as const };
    if (error) {
      // Never log lead data, credentials, or raw database error messages.
      console.error("Quote submission failed", { category: "database" });
      return { ok: false as const, error: "Could not send your request. Please call us." };
    }
    return { ok: true as const };
  } catch {
    console.error("Quote submission failed", { category: "configuration-or-network" });
    return { ok: false as const, error: "Could not send your request. Please call us." };
  }
}
