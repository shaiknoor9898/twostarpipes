import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { publicSupabaseConfig } from "@/integrations/supabase/public-config";

export function authorizedCron(header: string | null) {
  const expected = process.env["NOTIFICATION_CRON_SECRET"];
  if (!expected || expected.length < 32 || !header?.startsWith("Bearer ") || header.length > 256)
    return false;
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(header.slice(7)), hash(expected));
}
const jobSchema = z.object({
  id: z.uuid(),
  enquiry_id: z.uuid(),
  lease_id: z.uuid(),
  kind: z.enum(["new", "followup"]),
  recipients: z.array(z.email()).min(1).max(10),
  sender: z.string().min(1).max(300),
  site_origin: z.url(),
});
export async function deliverNotifications() {
  const apiKey = process.env["RESEND_API_KEY"],
    from = process.env["NOTIFICATION_FROM"],
    worker = process.env["SUPABASE_NOTIFICATION_WORKER_KEY"];
  const origin = new URL(process.env["SITE_URL"] || "");
  if (
    !apiKey ||
    !from ||
    !worker ||
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  )
    throw new Error("Notification configuration");
  const claims = JSON.parse(
    atob((worker.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/")),
  );
  if (
    worker.split(".").length !== 3 ||
    claims.role !== "notification_worker" ||
    !Number.isFinite(claims.exp) ||
    claims.exp <= Date.now() / 1000
  )
    throw new Error("Worker credential configuration");
  const { url, key } = publicSupabaseConfig(
    process.env["SUPABASE_URL"],
    process.env["SUPABASE_PUBLISHABLE_KEY"],
  );
  const client = createClient(url, key, {
    accessToken: async () => worker,
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
    },
  });
  const claim = await client.rpc("claim_notification_jobs", {
    sender_address: from,
    site_address: origin.origin,
  });
  if (claim.error) throw new Error("Notification queue unavailable");
  if (Array.isArray(claim.data) && claim.data.length === 0) return { processed: 0 };
  const batch = z.object({ jobs: z.array(jobSchema).max(10) }).parse(claim.data);
  for (const job of batch.jobs) {
    let delivered = false,
      provider: string | null = null;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `enquiry/${job.id}`,
        },
        body: JSON.stringify({
          from: job.sender,
          to: job.recipients,
          subject:
            job.kind === "followup" ? "Two Star Pipes follow-up due" : "New Two Star Pipes enquiry",
          text: `An enquiry is ready for review. Sign in at ${new URL(job.site_origin).origin}/admin. Reference: ${job.enquiry_id}`,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        const result = z.object({ id: z.string().min(1).max(200) }).parse(await response.json());
        delivered = true;
        provider = result.id;
      }
    } catch {
      /* No raw provider diagnostics or recipient details are logged. */
    }
    const finished = await client.rpc("finish_notification_job", {
      job_id: job.id,
      lease: job.lease_id,
      delivered,
      provider,
    });
    if (finished.error) throw new Error("Notification acknowledgement unavailable");
  }
  return { processed: batch.jobs.length };
}
