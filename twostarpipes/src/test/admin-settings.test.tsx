import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  products: vi.fn(),
  saveProduct: vi.fn(),
  remove: vi.fn(),
  upload: vi.fn(),
  seed: vi.fn(),
  settings: vi.fn(),
  saveSettings: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/admin.functions", () => ({
  adminProducts: mocks.products,
  adminSaveProduct: mocks.saveProduct,
  adminDeleteProduct: mocks.remove,
  adminUpload: mocks.upload,
  adminImportCatalogue: mocks.seed,
  adminNotificationSettings: mocks.settings,
  adminSaveNotificationSettings: mocks.saveSettings,
}));
import { ProductManager } from "@/components/admin/ProductManager";
import { NotificationSettings } from "@/components/admin/NotificationSettings";
const product = {
  slug: "fixture-pipe",
  name: "Fixture pipe",
  category: "Pipes",
  short: "Fixture",
  description: "Synthetic test product",
  image: "https://example.com/pipe.png",
  brochure: "",
  specifications: "",
  uses: ["Water"],
  sizes: ["20 mm"],
  gauges: [],
  advantages: [],
  published: false,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.products.mockResolvedValue({ ok: true, value: [product] });
  mocks.saveProduct.mockResolvedValue({ ok: true, value: true });
  mocks.settings.mockResolvedValue({
    ok: true,
    value: { settings: { enabled: false, recipients: [] }, jobs: [] },
  });
  mocks.saveSettings.mockResolvedValue({
    ok: true,
    value: { settings: { enabled: true, recipients: ["fixture@example.com"] }, jobs: [] },
  });
});
afterEach(cleanup);
it("does not allow product changes or claim an empty catalogue when loading is denied", async () => {
  mocks.products.mockResolvedValue({ ok: false, error: "Access denied" });
  render(<ProductManager accessToken="fixture-session" />);
  await screen.findByText("Access denied");
  expect(screen.getByRole("button", { name: "Create product" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Import current catalogue" })).toBeDisabled();
  expect(screen.queryByText(/No products available/)).not.toBeInTheDocument();
  expect(mocks.saveProduct).not.toHaveBeenCalled();
});
it("saves publication state and keeps the existing product slug immutable", async () => {
  render(<ProductManager accessToken="fixture-session" />);
  fireEvent.click(await screen.findByRole("button", { name: /Fixture pipe/ }));
  expect(screen.getByLabelText("slug")).toBeDisabled();
  fireEvent.click(screen.getByLabelText("Published"));
  fireEvent.click(screen.getByRole("button", { name: "Save product" }));
  await waitFor(() =>
    expect(mocks.saveProduct).toHaveBeenCalledWith({
      data: {
        accessToken: "fixture-session",
        product: { ...product, published: true },
      },
    }),
  );
});
it("locks product switching during uploads and rejects a PDF used as an image", async () => {
  mocks.upload.mockReturnValue(new Promise(() => {}));
  render(<ProductManager accessToken="fixture-session" />);
  fireEvent.click(await screen.findByRole("button", { name: /Fixture pipe/ }));
  const fileInput = screen.getByLabelText(/Upload image/);
  fireEvent.change(fileInput, {
    target: { files: [new File(["%PDF-1"], "fixture.pdf", { type: "application/pdf" })] },
  });
  expect(mocks.upload).not.toHaveBeenCalled();
  fireEvent.change(fileInput, {
    target: { files: [new File(["fixture"], "fixture.png", { type: "image/png" })] },
  });
  await waitFor(() => expect(mocks.upload).toHaveBeenCalled());
  expect(screen.getByRole("button", { name: /Fixture pipe/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Save product" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
});
it("cannot overwrite notification settings after an initial load failure", async () => {
  mocks.settings.mockRejectedValue(new Error("network"));
  render(<NotificationSettings accessToken="fixture-session" />);
  await screen.findByText("Notification settings unavailable.");
  expect(screen.getByRole("button", { name: "Save notification settings" })).toBeDisabled();
  expect(screen.getByRole("checkbox")).toBeDisabled();
  expect(screen.queryByText("No jobs queued.")).not.toBeInTheDocument();
  expect(mocks.saveSettings).not.toHaveBeenCalled();
});
it("saves notification preferences through the authenticated server function", async () => {
  render(<NotificationSettings accessToken="fixture-session" />);
  const save = await screen.findByRole("button", { name: "Save notification settings" });
  await waitFor(() => expect(save).toBeEnabled());
  fireEvent.change(screen.getByRole("textbox"), { target: { value: " fixture@example.com " } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(save);
  await waitFor(() =>
    expect(mocks.saveSettings).toHaveBeenCalledWith({
      data: {
        accessToken: "fixture-session",
        enabled: true,
        recipients: ["fixture@example.com"],
      },
    }),
  );
  await screen.findByText(/Settings saved/);
});
