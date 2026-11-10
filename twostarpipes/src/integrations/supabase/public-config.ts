// Public clients must never use credentials that bypass RLS.
export function publicSupabaseConfig(url?: string, key?: string) {
  url = url?.trim();
  key = key?.trim();
  if (!url || !key) throw new Error("Missing Supabase URL or publishable key");
  const parsed = new URL(url);
  if (
    !["https:", "http:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/"
  ) {
    throw new Error("Invalid Supabase URL");
  }
  let publicKey = key.startsWith("sb_publishable_") && key.length > "sb_publishable_".length;
  if (!publicKey) {
    try {
      const payload = JSON.parse(
        atob((key.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/")),
      );
      publicKey = key.split(".").length === 3 && payload.role === "anon";
    } catch {
      /* Invalid public credential. */
    }
  }
  if (!publicKey) throw new Error("Supabase requires a publishable or legacy anon key");
  return { url: parsed.origin, key };
}
