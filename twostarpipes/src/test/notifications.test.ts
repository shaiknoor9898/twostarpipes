import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn(), fetch: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
import { deliverNotifications } from "@/lib/notifications.server";
const job = {
  id: "11111111-1111-4111-8111-111111111111",
  enquiry_id: "22222222-2222-4222-8222-222222222222",
  lease_id: "33333333-3333-4333-8333-333333333333",
  kind: "new",
  recipients: ["owner@example.com"],
  sender: "Sales <sales@example.com>",
  site_origin: "https://example.com",
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("RESEND_API_KEY", "test-api-key");
  vi.stubEnv("NOTIFICATION_FROM", "sales@example.com");
  vi.stubEnv("SITE_URL", "https://example.com");
  vi.stubEnv(
    "SUPABASE_NOTIFICATION_WORKER_KEY",
    "a." + btoa(JSON.stringify({ role: "notification_worker", exp: 4102444800 })) + ".c",
  );
  mocks.createClient.mockReturnValue({ rpc: mocks.rpc });
  mocks.rpc.mockImplementation(async (name) =>
    name === "claim_notification_jobs"
      ? { data: { jobs: [job] }, error: null }
      : { data: null, error: null },
  );
  mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ id: "provider-1" })));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("uses a stable provider idempotency key and a lease-bound acknowledgement", async () => {
  expect(await deliverNotifications()).toEqual({ processed: 1 });
  expect(mocks.fetch.mock.calls[0]![1].headers["Idempotency-Key"]).toBe("enquiry/" + job.id);
  const payload = JSON.parse(mocks.fetch.mock.calls[0]![1].body);
  expect(payload.to).toEqual(job.recipients);
  expect(payload.text).not.toContain("phone");
  expect(mocks.rpc).toHaveBeenCalledWith("finish_notification_job", {
    job_id: job.id,
    lease: job.lease_id,
    delivered: true,
    provider: "provider-1",
  });
});
it.each(["http", "timeout", "malformed"])(
  "releases %s provider failures for controlled retry",
  async (kind) => {
    if (kind === "http")
      mocks.fetch.mockResolvedValue(new Response("sensitive diagnostic", { status: 503 }));
    if (kind === "timeout") mocks.fetch.mockRejectedValue(new Error("private provider detail"));
    if (kind === "malformed") mocks.fetch.mockResolvedValue(new Response("{}"));
    await deliverNotifications();
    expect(mocks.rpc).toHaveBeenCalledWith(
      "finish_notification_job",
      expect.objectContaining({ delivered: false, provider: null }),
    );
  },
);
it("does not send when disabled or no jobs are claimed", async () => {
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  expect(await deliverNotifications()).toEqual({ processed: 0 });
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("rejects a privileged worker credential before touching the queue", async () => {
  vi.stubEnv(
    "SUPABASE_NOTIFICATION_WORKER_KEY",
    "a." + btoa(JSON.stringify({ role: "service_role", exp: 4102444800 })) + ".c",
  );
  await expect(deliverNotifications()).rejects.toThrow("Worker credential");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("reports queue and acknowledgement failures without pretending delivery succeeded", async () => {
  mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "private queue error" } });
  await expect(deliverNotifications()).rejects.toThrow("queue unavailable");
  expect(mocks.fetch).not.toHaveBeenCalled();
  mocks.rpc.mockImplementation(async (name) =>
    name === "claim_notification_jobs"
      ? { data: { jobs: [job] }, error: null }
      : { data: null, error: { message: "private ack error" } },
  );
  await expect(deliverNotifications()).rejects.toThrow("acknowledgement unavailable");
});
