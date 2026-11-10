import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { consumeLimit, protectQuote, verifyTurnstile } from "@/lib/quote-security.server";

const transport = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", transport);
  vi.stubGlobal("crypto", webcrypto);
  transport.mockReset();
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-secret");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "turnstile-secret");
  vi.stubEnv("TURNSTILE_HOSTNAMES", "example.com");
  vi.stubEnv("QUOTE_RATE_LIMIT_SECRET", "a".repeat(32));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const reply = (data: unknown) => new Response(JSON.stringify(data));
it.each([
  { success: false },
  { success: true, hostname: "evil.com", action: "quote" },
  { success: true, hostname: "example.com", action: "login" },
  {},
])("rejects invalid, expired, replayed or mismatched challenge responses %j", async (data) => {
  transport.mockResolvedValue(reply(data));
  expect(await verifyTurnstile("opaque-token")).toBe(false);
});
it("posts challenge to Siteverify with action and exact hostname checks", async () => {
  transport.mockResolvedValue(reply({ success: true, hostname: "example.com", action: "quote" }));
  expect(await verifyTurnstile("opaque-token")).toBe(true);
  expect(transport.mock.calls[0]![0]).toBe(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  );
  expect(transport.mock.calls[0]![1].body.get("response")).toBe("opaque-token");
});
it("uses an atomic Redis script and enforces the boundary", async () => {
  transport.mockResolvedValueOnce(reply({ result: 5 })).mockResolvedValueOnce(reply({ result: 6 }));
  expect(await consumeLimit("test", 5, 900)).toBe(true);
  expect(await consumeLimit("test", 5, 900)).toBe(false);
  const command = JSON.parse(transport.mock.calls[0]![1].body);
  expect(command).toEqual([
    "EVAL",
    expect.stringContaining("EXPIRE"),
    "1",
    "quotes:v1:test",
    "900",
  ]);
});
it.each([{}, { result: "1" }, { result: -1 }, { error: "failure" }])(
  "fails closed on malformed Redis response %j",
  async (data) => {
    transport.mockResolvedValue(reply(data));
    await expect(consumeLimit("test", 5, 900)).rejects.toThrow();
  },
);
it("stops before Siteverify when the global budget is exhausted", async () => {
  transport.mockResolvedValue(reply({ result: 101 }));
  expect(await protectQuote("token", "1234567890")).toBe(false);
  expect(transport).toHaveBeenCalledTimes(1);
});
it("hashes normalized phones and rejects phone budget exhaustion", async () => {
  transport
    .mockResolvedValueOnce(reply({ result: 1 }))
    .mockResolvedValueOnce(reply({ success: true, hostname: "example.com", action: "quote" }))
    .mockResolvedValueOnce(reply({ result: "OK" }))
    .mockResolvedValueOnce(reply({ result: 6 }));
  expect(await protectQuote("token", "+91 98481 61127")).toBe(false);
  const body = transport.mock.calls[3]![1].body;
  expect(body).not.toContain("98481");
  expect(JSON.parse(body)[3]).toMatch(/^quotes:v1:phone:[a-f0-9]{64}$/);
});
it("fails closed on network and HTTP errors", async () => {
  transport.mockRejectedValueOnce(new Error("network"));
  await expect(protectQuote("token", "1234567890")).rejects.toThrow();
  transport.mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
  await expect(verifyTurnstile("token")).rejects.toThrow();
});
it("fails closed on missing server configuration", async () => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "");
  await expect(verifyTurnstile("token")).rejects.toThrow();
  expect(transport).not.toHaveBeenCalled();
});

it("rejects a verified token already claimed by another instance", async () => {
  transport
    .mockResolvedValueOnce(reply({ result: 1 }))
    .mockResolvedValueOnce(reply({ success: true, hostname: "example.com", action: "quote" }))
    .mockResolvedValueOnce(reply({ result: null }));
  expect(await protectQuote("reused-token", "1234567890")).toBe(false);
  expect(transport).toHaveBeenCalledTimes(3);
  const command = JSON.parse(transport.mock.calls[2]![1].body);
  expect(command).toEqual([
    "SET",
    expect.stringMatching(/^quotes:v1:token:[a-f0-9]{64}$/),
    "1",
    "NX",
    "EX",
    "600",
  ]);
  expect(JSON.stringify(command)).not.toContain("reused-token");
});
it.each(["unexpected", 1, false])(
  "fails closed on invalid replay guard result %s",
  async (result) => {
    transport
      .mockResolvedValueOnce(reply({ result: 1 }))
      .mockResolvedValueOnce(reply({ success: true, hostname: "example.com", action: "quote" }))
      .mockResolvedValueOnce(reply({ result }));
    await expect(protectQuote("token", "1234567890")).rejects.toThrow();
  },
);
it("shares limits and replay claims across reloaded modules and concurrent callers", async () => {
  // Simulated persistent Redis service: state intentionally outlives server modules.
  const counts = new Map<string, number>();
  const claims = new Set<string>();
  transport.mockImplementation(async (url, init) => {
    if (String(url).includes("siteverify"))
      return reply({ success: true, hostname: "example.com", action: "quote" });
    const command = JSON.parse(init.body);
    if (command[0] === "SET") {
      const key = command[1];
      if (claims.has(key)) return reply({ result: null });
      claims.add(key);
      return reply({ result: "OK" });
    }
    const key = command[3];
    const count = (counts.get(key) || 0) + 1;
    counts.set(key, count);
    return reply({ result: count });
  });
  vi.resetModules();
  const first = await import("@/lib/quote-security.server");
  vi.resetModules();
  const restarted = await import("@/lib/quote-security.server");
  expect(await first.protectQuote("first-token", "1234567890")).toBe(true);
  const replayResults = await Promise.all([
    first.protectQuote("shared-token", "1234567890"),
    restarted.protectQuote("shared-token", "1234567890"),
  ]);
  expect(replayResults.filter(Boolean)).toHaveLength(1);
  const results = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      (i % 2 ? first : restarted).protectQuote("fresh-token-" + i, "1234567890"),
    ),
  );
  expect(results.filter(Boolean)).toHaveLength(3); // total budget is five
});
