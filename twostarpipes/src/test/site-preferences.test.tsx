import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  SitePreferencesProvider,
  SitePreferencesControls,
  Text,
} from "@/components/site/SitePreferences";
import { TELUGU, translate } from "@/lib/telugu";
import { PRODUCTS, SITE } from "@/lib/site";
import { QuoteForm } from "@/components/site/QuoteForm";
import { FloatingActions, WhatsAppBubble } from "@/components/site/FloatingActions";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileActionBar } from "@/components/site/SiteFooter";
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => send }));
vi.mock("@/lib/quote.functions", () => ({ submitQuote: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    activeOptions: _active,
    activeProps: _props,
    hash: _hash,
    ...props
  }: {
    to: string;
    children: React.ReactNode;
    activeOptions?: unknown;
    activeProps?: unknown;
    hash?: unknown;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/site/Turnstile", () => ({ Turnstile: () => null }));
let prefersDark = false;
const listeners = new Set<() => void>();
beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.lang = "en";
  prefersDark = false;
  listeners.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return prefersDark;
      },
      addEventListener: (_name: string, callback: () => void) => listeners.add(callback),
      removeEventListener: (_name: string, callback: () => void) => listeners.delete(callback),
    })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.lang = "en";
});
function Example() {
  return (
    <SitePreferencesProvider>
      <SitePreferencesControls />
      <h1>
        <Text text="Our Products" />
      </h1>
    </SitePreferencesProvider>
  );
}
it("defaults to English and persists Telugu across remounts", async () => {
  const view = render(<Example />);
  expect(screen.getByRole("heading")).toHaveTextContent("Our Products");
  fireEvent.change(screen.getByLabelText("Language"), { target: { value: "te" } });
  await waitFor(() => expect(document.documentElement.lang).toBe("te"));
  expect(screen.getByRole("heading")).toHaveTextContent("మా ఉత్పత్తులు");
  expect(localStorage.getItem("two-star-language")).toBe("te");
  view.unmount();
  render(<Example />);
  await screen.findByLabelText("భాష");
  expect(screen.getByRole("heading")).toHaveTextContent("మా ఉత్పత్తులు");
  fireEvent.change(screen.getByLabelText("భాష"), { target: { value: "en" } });
  expect(screen.getByRole("heading")).toHaveTextContent("Our Products");
});
it("keeps light appearance and clears retired theme preferences", () => {
  localStorage.setItem("two-star-theme", "dark");
  document.documentElement.classList.add("dark");
  render(<Example />);
  expect(document.documentElement).not.toHaveClass("dark");
  expect(document.documentElement.style.colorScheme).toBe("light");
  expect(localStorage.getItem("two-star-theme")).toBeNull();
  expect(screen.queryByLabelText("Theme")).not.toBeInTheDocument();
});
it("works when browser persistence is unavailable", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  render(<Example />);
  fireEvent.change(screen.getByLabelText("Language"), { target: { value: "te" } });
  expect(screen.getByRole("heading")).toHaveTextContent("మా ఉత్పత్తులు");
});
it("translates form labels and errors while preserving submitted option values", () => {
  localStorage.setItem("two-star-language", "te");
  render(
    <SitePreferencesProvider>
      <QuoteForm />
    </SitePreferencesProvider>,
  );
  expect(screen.getByLabelText("మీ పేరు *")).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "రైతు" })).toHaveValue("farmer");
  expect(screen.getByRole("option", { name: "PVC పైపులు" })).toHaveValue("PVC Pipes");
  fireEvent.click(screen.getByRole("button", { name: "ధర వివరాలు అడగండి" }));
  expect(screen.getByText("దయచేసి మీ పేరు నమోదు చేయండి")).toBeInTheDocument();
});
it("routes every shared WhatsApp link to the exact owner-approved destination", () => {
  render(
    <>
      <SiteHeader />
      <SiteFooter />
      <MobileActionBar />
      <FloatingActions />
      <WhatsAppBubble />
    </>,
  );
  const links = document.querySelectorAll<HTMLAnchorElement>('a[href*="wa.me"]');
  expect(links.length).toBeGreaterThanOrEqual(5);
  links.forEach((link) => {
    expect(link).toHaveAttribute("href", "https://wa.me/919505503550");
    expect(link).toHaveAttribute("target", "_blank");
  });
  expect(SITE.phone).toBe("+91 98481 61127");
  expect(SITE.phone2).toBe("+91 95055 03550");
  expect(SITE.phoneHref).toBe("tel:+919848161127");
});
it("has Telugu copy for every existing product name, description, application and advantage", () => {
  for (const p of PRODUCTS) {
    for (const text of [p.name, p.short, p.description, ...p.uses, ...(p.advantages ?? [])])
      expect(TELUGU[text], text).toMatch(/[\u0c00-\u0c7f]/);
  }
  expect(translate("te", "Show slide 2")).toContain("2");
  expect(translate("te", "Hello {name}", { name: "Fixture" })).toBe("Hello Fixture");
});
