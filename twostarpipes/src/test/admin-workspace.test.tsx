import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  history: vi.fn(),
  dashboard: vi.fn(),
  update: vi.fn(),
  exportRows: vi.fn(),
  getSession: vi.fn(),
  login: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/admin.functions", () => ({
  adminDashboard: mocks.dashboard,
  adminHistory: mocks.history,
  adminList: mocks.list,
  adminUpdate: mocks.update,
  adminExport: mocks.exportRows,
}));
vi.mock("@/components/admin/ProductManager", () => ({ ProductManager: () => null }));
vi.mock("@/components/admin/NotificationSettings", () => ({ NotificationSettings: () => null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      signInWithPassword: mocks.login,
      signOut: mocks.signOut,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));
import { Admin } from "@/components/admin/AdminWorkspace";
const row = {
  id: "12345678-1234-4234-8234-123456789012",
  created_at: "2026-11-10T00:00:00Z",
  updated_at: "2026-11-10T00:00:00Z",
  name: "Fixture Customer",
  phone: "1234567890",
  email: null,
  city: "Fixture City",
  customer_type: "dealer",
  product: "PVC Pipes",
  quantity: "100",
  message: "Fixture enquiry",
  status: "New",
  internal_notes: "",
  follow_up_at: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.history.mockResolvedValue({ ok: true, value: [] });
  mocks.getSession.mockResolvedValue({
    data: { session: { access_token: "verified-test-session" } },
  });
  mocks.list.mockResolvedValue({ ok: true, value: { rows: [row], count: 1, csv: "" } });
  mocks.dashboard.mockResolvedValue({
    ok: true,
    value: { metrics: { total: 1, new: 1 }, activity: [] },
  });
  mocks.update.mockResolvedValue({ ok: true, value: { ...row, status: "Contacted" } });
  mocks.signOut.mockResolvedValue({ error: null });
});
afterEach(cleanup);
it("loads and updates enquiries through authenticated functions", async () => {
  render(<Admin />);
  fireEvent.click(await screen.findByRole("button", { name: /Fixture Customer/ }));
  fireEvent.change(screen.getAllByLabelText("Status")[1]!, { target: { value: "Contacted" } });
  fireEvent.change(screen.getByLabelText("Internal notes"), {
    target: { value: "Follow up tomorrow" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save enquiry" }));
  await waitFor(() =>
    expect(mocks.update).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accessToken: "verified-test-session",
        id: row.id,
        status: "Contacted",
        internal_notes: "Follow up tomorrow",
      }),
    }),
  );
});
it("shows denial without exposing customer data to nonadmins", async () => {
  mocks.list.mockResolvedValue({ ok: false, error: "Access denied" });
  render(<Admin />);
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Access denied"));
  expect(screen.queryByText("Fixture Customer")).not.toBeInTheDocument();
});
it("clears customer data on sign out", async () => {
  render(<Admin />);
  await screen.findByRole("button", { name: /Fixture Customer/ });
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  await screen.findByRole("heading", { name: "Admin sign in" });
  expect(screen.queryByText("Fixture Customer")).not.toBeInTheDocument();
});
it("shows a generic sign-in failure", async () => {
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  mocks.login.mockResolvedValue({ error: { message: "private Auth error" } });
  render(<Admin />);
  fireEvent.change(await screen.findByLabelText("Email"), {
    target: { value: "admin@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "fixture-password" } });
  fireEvent.click(screen.getByRole("button", { name: /^Sign in$/ }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Sign-in failed"));
  expect(screen.queryByText("private Auth error")).not.toBeInTheDocument();
});
