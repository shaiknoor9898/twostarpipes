import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  order: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
import { loadCatalogue } from "@/lib/catalogue.server";
import { PRODUCTS } from "@/lib/site";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("MANAGED_CATALOGUE", "false");
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  const query = { select: mocks.select, eq: mocks.eq, order: mocks.order };
  mocks.select.mockReturnValue(query);
  mocks.eq.mockReturnValue(query);
  mocks.from.mockReturnValue(query);
  mocks.createClient.mockReturnValue({ from: mocks.from });
});
afterEach(() => vi.unstubAllEnvs());
it("preserves the complete existing catalogue before opt-in", async () => {
  expect((await loadCatalogue()).map((p) => p.name)).toEqual(PRODUCTS.map((p) => p.name));
  expect(mocks.createClient).not.toHaveBeenCalled();
});
it("requests only published products and resolves built-in image references", async () => {
  vi.stubEnv("MANAGED_CATALOGUE", "true");
  const original = PRODUCTS[0]!;
  mocks.order.mockResolvedValue({
    data: [{ ...original, image: "builtin:" + original.slug, published: true, category: "Pipes" }],
    error: null,
  });
  const data = await loadCatalogue();
  expect(data[0]!.image).toBe(original.image);
  expect(mocks.eq).toHaveBeenCalledWith("published", true);
});
it("does not resurrect unpublished static products on an empty managed catalogue", async () => {
  vi.stubEnv("MANAGED_CATALOGUE", "true");
  mocks.order.mockResolvedValue({ data: [], error: null });
  expect(await loadCatalogue()).toEqual([]);
});
it("fails clearly instead of hiding a managed database outage", async () => {
  vi.stubEnv("MANAGED_CATALOGUE", "true");
  mocks.order.mockResolvedValue({ data: null, error: { message: "private" } });
  await expect(loadCatalogue()).rejects.toThrow("Catalogue unavailable");
});
