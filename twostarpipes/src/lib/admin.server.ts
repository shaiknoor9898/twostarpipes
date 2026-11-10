import { createClient } from "@supabase/supabase-js";
import { publicSupabaseConfig } from "@/integrations/supabase/public-config";
import { enquiryCSV, productSchema, type Enquiry } from "./admin-schema";
import type { z } from "zod";
import type { listSchema, updateEnquirySchema, uploadSchema } from "./admin-schema";

export async function requireAdmin(accessToken: string) {
  const { url, key } = publicSupabaseConfig(
    process.env["SUPABASE_URL"],
    process.env["SUPABASE_PUBLISHABLE_KEY"],
  );
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
    },
  });
  // getSession / decoded JWT claims / user_metadata are never authorization evidence.
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) throw new Error("Access denied");
  const membership = await client.rpc("is_admin");
  if (membership.error || membership.data !== true) throw new Error("Access denied");
  return client;
}

export async function listEnquiries(input: z.infer<typeof listSchema>, exporting = false) {
  const client = await requireAdmin(input.accessToken);
  let query = client
    .from("quote_requests")
    .select(
      exporting
        ? "created_at,name,phone,email,city,customer_type,product,quantity,status,follow_up_at"
        : "*",
      { count: "exact" },
    );
  // Strip PostgREST filter syntax and wildcard operators from user search.
  const search = input.search
    .replace(/[^\p{L}\p{N} @._+-]/gu, " ")
    .replace(/[%_]/g, " ")
    .trim();
  if (search)
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,product.ilike.%${search}%`);
  if (input.status) query = query.eq("status", input.status);
  if (input.dealersOnly) query = query.in("customer_type", ["dealer", "wholesaler"]);
  const start = exporting ? 0 : input.page * 25;
  const { data, error, count } = await query
    .order("created_at", { ascending: input.ascending })
    .order("id", { ascending: input.ascending })
    .range(start, exporting ? 4999 : start + 24)
    .overrideTypes<Enquiry[], { merge: false }>();
  if (error) throw new Error("Enquiries unavailable");
  if (exporting) {
    if ((count ?? 0) > 5000) throw new Error("Narrow filters to export at most 5000 enquiries");
    const audit = await client
      .from("admin_audit")
      .insert({ action: "export", entity_type: "quote_requests", entity_id: null });
    if (audit.error) throw new Error("Export audit unavailable");
    return { rows: [] as Enquiry[], count: count ?? 0, csv: enquiryCSV(data as Enquiry[]) };
  }
  return { rows: data as Enquiry[], count: count ?? 0, csv: "" };
}
export async function dashboard(accessToken: string) {
  const client = await requireAdmin(accessToken);
  const metrics = await client.rpc("admin_metrics");
  const activity = await client
    .from("admin_audit")
    .select("id,action,entity_type,entity_id,old_status,new_status,created_at")
    .order("created_at", { ascending: false })
    .limit(15);
  if (metrics.error || activity.error) throw new Error("Dashboard unavailable");
  return {
    metrics: metrics.data as Record<string, number>,
    activity: activity.data as {
      id: string;
      action: string;
      entity_type: string;
      entity_id: string | null;
      old_status: string | null;
      new_status: string | null;
      created_at: string;
    }[],
  };
}
export async function updateEnquiry(input: z.infer<typeof updateEnquirySchema>) {
  const client = await requireAdmin(input.accessToken);
  const { data, error } = await client
    .from("quote_requests")
    .update({
      status: input.status,
      internal_notes: input.internal_notes,
      follow_up_at: input.follow_up_at,
    })
    .eq("id", input.id)
    .eq("updated_at", input.updated_at)
    .select("*")
    .maybeSingle();
  if (error || !data) throw new Error("Update failed or record changed. Refresh before retrying.");
  return data as Enquiry;
}
export async function listProducts(accessToken: string) {
  const client = await requireAdmin(accessToken);
  const result = await client.from("products").select("*").order("name");
  if (result.error) throw new Error("Products unavailable");
  return result.data.map((item) => productSchema.parse(item));
}
export async function saveProduct(accessToken: string, product: z.infer<typeof productSchema>) {
  const client = await requireAdmin(accessToken);
  const result = await client.from("products").upsert(product, { onConflict: "slug" });
  if (result.error) throw new Error("Product could not be saved");
  return true;
}
export async function deleteProduct(accessToken: string, slug: string) {
  const client = await requireAdmin(accessToken);
  const result = await client.from("products").delete().eq("slug", slug);
  if (result.error) throw new Error("Product could not be deleted");
  return true;
}
export function validateAsset(bytes: Uint8Array, mime: string, kind: string) {
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error("File must be at most 5 MB");
  const prefix = new TextDecoder().decode(bytes.slice(0, 12));
  const valid =
    mime === "image/jpeg"
      ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : mime === "image/png"
        ? [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)
        : mime === "image/webp"
          ? prefix.startsWith("RIFF") && prefix.slice(8, 12) === "WEBP"
          : mime === "application/pdf" && prefix.startsWith("%PDF-");
  if (!valid || (kind === "brochure") !== (mime === "application/pdf"))
    throw new Error("Invalid file type");
}
export async function uploadAsset(input: z.infer<typeof uploadSchema>) {
  const client = await requireAdmin(input.accessToken);
  const bytes = Uint8Array.from(atob(input.content), (c) => c.charCodeAt(0));
  validateAsset(bytes, input.mime, input.kind);
  const ext = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  }[input.mime];
  const path = `${input.kind}/${crypto.randomUUID()}.${ext}`;
  const result = await client.storage
    .from("product-assets")
    .upload(path, bytes, { contentType: input.mime, upsert: false });
  if (result.error) throw new Error("Upload failed");
  return client.storage.from("product-assets").getPublicUrl(path).data.publicUrl;
}

export async function importCatalogue(accessToken: string) {
  const client = await requireAdmin(accessToken);
  const { PRODUCTS } = await import("./site");
  const seeds = PRODUCTS.map((p) => ({
    ...p,
    category: p.short,
    image: "builtin:" + p.slug,
    published: true,
    specifications: "",
    brochure: "",
    gauges: p.gauges || [],
    advantages: p.advantages || [],
  }));
  const result = await client
    .from("products")
    .upsert(seeds, { onConflict: "slug", ignoreDuplicates: true });
  if (result.error) throw new Error("Catalogue import failed");
  return true;
}
export async function notificationSettings(
  accessToken: string,
  settings?: { enabled: boolean; recipients: string[] },
) {
  const client = await requireAdmin(accessToken);
  if (settings) {
    const result = await client.from("notification_settings").update(settings).eq("id", true);
    if (result.error) throw new Error("Settings update failed");
  }
  const result = await client
    .from("notification_settings")
    .select("enabled,recipients")
    .eq("id", true)
    .single();
  const jobs = await client
    .from("notification_outbox")
    .select("id,state,attempts,created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (result.error || jobs.error) throw new Error("Settings unavailable");
  return {
    settings: result.data as { enabled: boolean; recipients: string[] },
    jobs: jobs.data as { id: string; state: string; attempts: number; created_at: string }[],
  };
}

export async function enquiryHistory(accessToken: string, id: string) {
  const client = await requireAdmin(accessToken);
  const result = await client
    .from("admin_audit")
    .select("id,action,old_status,new_status,created_at")
    .eq("entity_type", "quote_requests")
    .eq("entity_id", id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (result.error) throw new Error("History unavailable");
  return result.data as {
    id: string;
    action: string;
    old_status: string | null;
    new_status: string | null;
    created_at: string;
  }[];
}
