import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  csvCell,
  listSchema,
  productSchema,
  updateEnquirySchema,
  uploadSchema,
} from "@/lib/admin-schema";
const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
import { requireAdmin, listEnquiries, updateEnquiry, validateAsset } from "@/lib/admin.server";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  mocks.createClient.mockReturnValue({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    from: mocks.from,
  });
  mocks.getUser.mockResolvedValue({ data: { user: { id: "approved-admin" } }, error: null });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
});
afterEach(() => vi.unstubAllEnvs());
it.each([
  { data: { user: null }, error: null },
  {
    data: { user: { id: "forged", user_metadata: { admin: true } } },
    error: { message: "invalid JWT" },
  },
])("rejects unverified identity before any table access", async (result) => {
  mocks.getUser.mockResolvedValue(result);
  await expect(listEnquiries(listSchema.parse({ accessToken: "forged" }))).rejects.toThrow(
    "Access denied",
  );
  expect(mocks.from).not.toHaveBeenCalled();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it.each([
  { data: false, error: null },
  { data: true, error: { message: "permission denied" } },
  { data: "true", error: null },
])("requires database-confirmed admin membership", async (result) => {
  mocks.rpc.mockResolvedValue(result);
  await expect(requireAdmin("user-jwt")).rejects.toThrow("Access denied");
  expect(mocks.from).not.toHaveBeenCalled();
});
it("verifies the JWT remotely and sends that JWT to RLS-protected operations", async () => {
  await requireAdmin("user-jwt");
  expect(mocks.getUser).toHaveBeenCalledWith("user-jwt");
  expect(mocks.rpc).toHaveBeenCalledWith("is_admin");
  expect(mocks.createClient.mock.calls[0]![2].global.headers.Authorization).toBe("Bearer user-jwt");
});
it("bounds filters and rejects malformed admin payloads", () => {
  expect(listSchema.safeParse({ accessToken: "token", page: -1 }).success).toBe(false);
  expect(listSchema.safeParse({ accessToken: "token", status: "root" }).success).toBe(false);
  expect(
    updateEnquirySchema.safeParse({ accessToken: "token", id: "bad", status: "New" }).success,
  ).toBe(false);
  expect(
    uploadSchema.safeParse({
      accessToken: "token",
      kind: "image",
      mime: "image/svg+xml",
      content: "payload",
    }).success,
  ).toBe(false);
});
it("paginates, sorts, sanitizes search and reports database failures", async () => {
  const query = {
    select: vi.fn(),
    or: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    overrideTypes: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
  };
  for (const key of ["select", "or", "eq", "in", "order"] as const)
    query[key].mockReturnValue(query);
  query.range.mockReturnValue(query);
  mocks.from.mockReturnValue(query);
  await listEnquiries(
    listSchema.parse({
      accessToken: "token",
      search: "x),id.gt.0",
      page: 2,
      dealersOnly: true,
      status: "New",
    }),
  );
  expect(query.range).toHaveBeenCalledWith(50, 74);
  expect(query.in).toHaveBeenCalledWith("customer_type", ["dealer", "wholesaler"]);
  expect(query.or.mock.calls[0]![0]).not.toContain(")");
  query.overrideTypes.mockResolvedValue({
    data: null,
    count: 0,
    error: { message: "private database error" },
  });
  await expect(listEnquiries(listSchema.parse({ accessToken: "token" }))).rejects.toThrow(
    "Enquiries unavailable",
  );
});
it("uses optimistic update conditions and treats conflicts as failures", async () => {
  const query = {
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.select.mockReturnValue(query);
  mocks.from.mockReturnValue(query);
  const input = updateEnquirySchema.parse({
    accessToken: "token",
    id: "12345678-1234-4234-8234-123456789012",
    status: "Contacted",
    internal_notes: "Call tomorrow",
    follow_up_at: null,
    updated_at: "2026-11-10T00:00:00Z",
  });
  await expect(updateEnquiry(input)).rejects.toThrow("record changed");
  expect(query.eq).toHaveBeenCalledWith("updated_at", input.updated_at);
  expect(query.update).toHaveBeenCalledWith({
    status: "Contacted",
    internal_notes: "Call tomorrow",
    follow_up_at: null,
  });
});
it.each(["=SUM(A1:A2)", "+123", "@cmd", "-1", "  =1", "\t=1"])(
  "neutralizes spreadsheet formula %s",
  (value) => {
    expect(csvCell(value)).toContain("'");
  },
);
it("escapes CSV quotes", () => expect(csvCell('a,"b"')).toBe('"a,""b"""'));
it("rejects disguised, oversized and wrong-kind uploads", () => {
  expect(() =>
    validateAsset(new TextEncoder().encode("<script>bad</script>"), "image/png", "image"),
  ).toThrow();
  expect(() => validateAsset(new Uint8Array(5 * 1024 * 1024 + 1), "image/jpeg", "image")).toThrow();
  expect(() =>
    validateAsset(new TextEncoder().encode("%PDF-1.7"), "application/pdf", "image"),
  ).toThrow();
  expect(() => validateAsset(Uint8Array.of(255, 216, 255, 0), "image/jpeg", "image")).not.toThrow();
});
it("rejects unsafe product URLs and preserves a valid built-in image reference", () => {
  const base = {
    slug: "pvc",
    name: "PVC",
    category: "Pipes",
    short: "Water pipes",
    description: "Description",
    image: "builtin:pvc",
    uses: [],
    sizes: [],
    published: true,
  };
  expect(productSchema.safeParse(base).success).toBe(true);
  expect(productSchema.safeParse({ ...base, image: "javascript:alert(1)" }).success).toBe(false);
  expect(productSchema.safeParse({ ...base, slug: "../escape" }).success).toBe(false);
  expect(
    productSchema.safeParse({ ...base, image: "https://fixture:password@example.com/image.png" })
      .success,
  ).toBe(false);
  expect(productSchema.safeParse({ ...base, brochure: "builtin:pvc" }).success).toBe(false);
  expect(
    productSchema.safeParse({
      ...base,
      brochure: "https://fixture:password@example.com/catalogue.pdf",
    }).success,
  ).toBe(false);
  expect(
    productSchema.safeParse({ ...base, brochure: "https://example.com/catalogue.pdf" }).success,
  ).toBe(true);
});
