import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { quoteSchema, QUOTE_PRODUCTS } from "@/lib/quote-schema";
import { publicSupabaseConfig } from "@/integrations/supabase/public-config";
const { createClient, insert, abortSignal } = vi.hoisted(() => ({
  createClient: vi.fn(),
  insert: vi.fn(),
  abortSignal: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
import { protectQuote } from "@/lib/quote-security.server";
import { saveQuote } from "@/lib/quote.server";
vi.mock("@/lib/quote-security.server", () => ({ protectQuote: vi.fn().mockResolvedValue(true) }));
const writerJWT = "a." + btoa(JSON.stringify({ role: "quote_writer", exp: 4102444800 })) + ".c";
const valid = {
  requestId: "12345678-1234-4234-8234-123456789012",
  turnstileToken: "verified-token",
  name: " Test ",
  phone: "+91 98481 61127",
  customer_type: "farmer",
  product: QUOTE_PRODUCTS[0],
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_QUOTE_WRITER_KEY", writerJWT);
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  createClient.mockReturnValue({ from: vi.fn().mockReturnValue({ insert }) });
  insert.mockReturnValue({ abortSignal });
  abortSignal.mockResolvedValue({ error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
describe("quotation validation", () => {
  it("trims input and allows a blank optional email", () => {
    expect(quoteSchema.parse({ ...valid, email: "   " })).toMatchObject({
      name: "Test",
      email: "",
    });
  });
  it.each(["------", "() () ()", "12+3456789", "12345", "1234567890123456"])(
    "rejects invalid phone %s",
    (phone) => {
      expect(quoteSchema.safeParse({ ...valid, phone }).success).toBe(false);
    },
  );
  it.each([
    { product: "invented" },
    { customer_type: "admin" },
    { email: "bad" },
    { name: " " },
    { city: "x".repeat(101) },
    { quantity: "x".repeat(101) },
    { message: "x".repeat(1001) },
  ])("rejects invalid fields %j", (override) => {
    expect(quoteSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});
describe("public configuration", () => {
  it("normalizes configuration", () =>
    expect(
      publicSupabaseConfig(" https://example.supabase.co/ ", " sb_publishable_test ").url,
    ).toBe("https://example.supabase.co"));
  it.each([
    undefined,
    "sb_secret_private",
    "invalid",
    "a." + btoa(JSON.stringify({ role: "service_role" })) + ".c",
  ])("rejects unsafe key %s", (key) =>
    expect(() => publicSupabaseConfig("https://example.supabase.co", key)).toThrow(),
  );
  it("accepts legacy anon keys", () =>
    expect(
      publicSupabaseConfig(
        "https://example.supabase.co",
        "a." + btoa(JSON.stringify({ role: "anon" })) + ".c",
      ).key,
    ).toBeTruthy());
  it.each([
    "ftp://example.com",
    "bad",
    "https://user:pass@example.com",
    "https://example.com/rest",
  ])("rejects URL %s", (url) =>
    expect(() => publicSupabaseConfig(url, "sb_publishable_test")).toThrow(),
  );
});
describe("quotation persistence", () => {
  it("inserts normalized data without requesting public reads", async () => {
    expect(await saveQuote(valid)).toEqual({ ok: true });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Test", email: null, message: null }),
    );
    expect(abortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
  });
  it("rejects invalid data before contacting Supabase", async () => {
    expect((await saveQuote({ ...valid, phone: "------" })).ok).toBe(false);
    expect(createClient).not.toHaveBeenCalled();
  });
  it("handles missing configuration", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_URL", "");
    expect((await saveQuote(valid)).ok).toBe(false);
    expect(createClient).not.toHaveBeenCalled();
  });
  it("supports Vite-only local configuration", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    expect((await saveQuote(valid)).ok).toBe(true);
  });
  it.each(["database", "network", "client"])(
    "handles %s failures without leaking details",
    async (kind) => {
      const secret = "private lead or key";
      if (kind === "database") abortSignal.mockResolvedValueOnce({ error: { message: secret } });
      if (kind === "network") abortSignal.mockRejectedValueOnce(new Error(secret));
      if (kind === "client")
        createClient.mockImplementationOnce(() => {
          throw new Error(secret);
        });
      expect(await saveQuote(valid)).toEqual({
        ok: false,
        error: "Could not send your request. Please call us.",
      });
      expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(secret);
    },
  );
});

it("sends public apikey and dedicated writer authorization, preserving other headers", async () => {
  await saveQuote(valid);
  const transport = createClient.mock.calls[0]![2].global.fetch;
  const fetchMock = vi.fn().mockResolvedValue(new Response());
  vi.stubGlobal("fetch", fetchMock);
  try {
    await transport("https://example.supabase.co/rest/v1/quote_requests", {
      headers: { Authorization: "Bearer sb_publishable_test", "X-Test": "kept" },
    });
    let headers = fetchMock.mock.calls[0]![1].headers;
    expect(headers.get("Authorization")).toBe(`Bearer ${writerJWT}`);
    expect(headers.get("apikey")).toBe("sb_publishable_test");
    expect(headers.get("X-Test")).toBe("kept");
    await transport(
      new Request("https://example.supabase.co/rest/v1/quote_requests", {
        headers: { Authorization: "Bearer user-jwt" },
      }),
    );
    headers = fetchMock.mock.calls[1]![1].headers;
    expect(headers.get("Authorization")).toBe(`Bearer ${writerJWT}`);
  } finally {
    vi.unstubAllGlobals();
  }
});

it.each([
  "",
  "sb_secret_unsafe",
  "a." + btoa(JSON.stringify({ role: "service_role", exp: 4102444800 })) + ".c",
  "a." + btoa(JSON.stringify({ role: "quote_writer", exp: 1 })) + ".c",
])("rejects unsafe or expired writer credential %s", async (credential) => {
  vi.stubEnv("SUPABASE_QUOTE_WRITER_KEY", credential);
  expect((await saveQuote(valid)).ok).toBe(false);
  expect(insert).not.toHaveBeenCalled();
});
it("requires a challenge token before persistence", async () => {
  expect((await saveQuote({ ...valid, turnstileToken: "" })).ok).toBe(false);
  expect(createClient).not.toHaveBeenCalled();
});

it("does not create a database client after failed bot or rate checks", async () => {
  vi.mocked(protectQuote).mockResolvedValueOnce(false);
  expect((await saveQuote(valid)).ok).toBe(false);
  expect(createClient).not.toHaveBeenCalled();
});
it("does not insert when protection services fail", async () => {
  vi.mocked(protectQuote).mockRejectedValueOnce(new Error("private outage details"));
  const result = await saveQuote(valid);
  expect(result.ok).toBe(false);
  expect(JSON.stringify(result)).not.toContain("private");
  expect(insert).not.toHaveBeenCalled();
});

it("treats an already-stored request ID as success without another notification", async () => {
  abortSignal.mockResolvedValueOnce({
    error: {
      code: "23505",
      message: 'duplicate key violates unique constraint "quote_request_id_unique"',
    },
  });
  expect(await saveQuote(valid)).toEqual({ ok: true });
});
it("does not hide unrelated unique constraint errors", async () => {
  abortSignal.mockResolvedValueOnce({
    error: { code: "23505", message: 'duplicate key violates constraint "another_key"' },
  });
  expect((await saveQuote(valid)).ok).toBe(false);
});
