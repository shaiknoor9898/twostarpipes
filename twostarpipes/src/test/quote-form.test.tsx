import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => send }));
vi.mock("@/lib/quote.functions", () => ({ submitQuote: vi.fn() }));
vi.mock("@/components/site/Turnstile", () => ({
  Turnstile: ({ onToken }: { onToken: (token: string) => void }) => {
    return (
      <button type="button" onClick={() => onToken("test-token")}>
        Solve challenge
      </button>
    );
  },
}));
import { QuoteForm } from "@/components/site/QuoteForm";
import { QUOTE_PRODUCTS } from "@/lib/quote-schema";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
beforeEach(() => {
  send.mockReset();
  vi.stubGlobal("crypto", {
    randomUUID: vi.fn().mockReturnValue("12345678-1234-4234-8234-123456789012"),
  });
});
function fill() {
  fireEvent.click(screen.getByRole("button", { name: "Solve challenge" }));
  fireEvent.change(screen.getByLabelText("Your name *"), { target: { value: "Farmer" } });
  fireEvent.change(screen.getByLabelText("Phone / WhatsApp *"), {
    target: { value: "9848161127" },
  });
  fireEvent.change(screen.getByLabelText("Product *"), { target: { value: QUOTE_PRODUCTS[0] } });
}
it("shows accessible validation errors without sending", () => {
  render(<QuoteForm />);
  fireEvent.click(screen.getByRole("button", { name: "Request a Quote" }));
  expect(screen.getByLabelText("Your name *")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByText("Please enter your name")).toHaveAttribute("role", "alert");
  expect(send).not.toHaveBeenCalled();
});
it("prevents concurrent submissions and shows success", async () => {
  let resolve!: (value: { ok: boolean }) => void;
  send.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  render(<QuoteForm defaultType="dealer" />);
  fill();
  const form = screen.getByLabelText("Your name *").closest("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(send).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledWith({ data: expect.objectContaining({ customer_type: "dealer" }) });
  await act(async () => resolve({ ok: true }));
  expect(screen.getByText("Request received")).toBeInTheDocument();
});
it.each(["returned", "thrown"])("retains input and permits retry after %s errors", async (kind) => {
  if (kind === "returned")
    send.mockResolvedValueOnce({
      ok: false,
      error: "Could not send your request. Please call us.",
    });
  else send.mockRejectedValueOnce(new Error("network"));
  render(<QuoteForm />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Request a Quote" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Could not send"));
  expect(screen.getByLabelText("Your name *")).toHaveValue("Farmer");
  send.mockResolvedValueOnce({ ok: true });
  fireEvent.click(screen.getByRole("button", { name: "Solve challenge" }));
  fireEvent.click(screen.getByRole("button", { name: "Request a Quote" }));
  await screen.findByText("Request received");
  expect(send.mock.calls[1]![0].data.requestId).toBe(send.mock.calls[0]![0].data.requestId);
  expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
});

it("generates a new request ID when the customer edits a failed request", async () => {
  const secondId = "87654321-4321-4321-8321-210987654321";
  vi.mocked(crypto.randomUUID)
    .mockReturnValueOnce("12345678-1234-4234-8234-123456789012")
    .mockReturnValueOnce(secondId);
  send
    .mockResolvedValueOnce({ ok: false, error: "Please retry." })
    .mockResolvedValueOnce({ ok: true });
  render(<QuoteForm />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Request a Quote" }));
  await screen.findByRole("alert");
  fireEvent.change(screen.getByLabelText("Phone / WhatsApp *"), {
    target: { value: "1234567890" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Solve challenge" }));
  fireEvent.click(screen.getByRole("button", { name: "Request a Quote" }));
  await screen.findByText("Request received");
  expect(send.mock.calls[1]![0].data.requestId).toBe(secondId);
  expect(crypto.randomUUID).toHaveBeenCalledTimes(2);
});

it("does not send valid lead fields without a completed challenge", () => {
  render(<QuoteForm />);
  fireEvent.change(screen.getByLabelText("Your name *"), { target: { value: "Farmer" } });
  fireEvent.change(screen.getByLabelText("Phone / WhatsApp *"), {
    target: { value: "9848161127" },
  });
  fireEvent.change(screen.getByLabelText("Product *"), { target: { value: QUOTE_PRODUCTS[0] } });
  fireEvent.click(screen.getByRole("button", { name: "Request a Quote" }));
  expect(send).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("complete the security check");
});
