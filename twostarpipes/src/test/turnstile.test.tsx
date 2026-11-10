import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Turnstile } from "@/components/site/Turnstile";

const renderWidget = vi.fn();
const remove = vi.fn();
beforeEach(() => {
  vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "public-site-key");
  renderWidget.mockReset().mockReturnValue("widget-1");
  remove.mockReset();
  window.turnstile = { render: renderWidget, remove };
});
afterEach(() => {
  cleanup();
  delete window.turnstile;
  document.querySelector("script[data-quote-turnstile]")?.remove();
  vi.unstubAllEnvs();
});
it("renders quote action, passes tokens and clears expired/error tokens", () => {
  const onToken = vi.fn();
  render(<Turnstile onToken={onToken} />);
  const options = renderWidget.mock.calls[0]![1];
  expect(options).toMatchObject({ sitekey: "public-site-key", action: "quote" });
  act(() => options.callback("challenge-token"));
  expect(onToken).toHaveBeenLastCalledWith("challenge-token");
  act(() => options["expired-callback"]());
  expect(onToken).toHaveBeenLastCalledWith("");
  act(() => options["error-callback"]());
  expect(screen.getByRole("alert")).toHaveTextContent("Security check unavailable");
});
it("removes consumed widgets on unmount and creates a new widget for retries", () => {
  const onToken = vi.fn();
  const view = render(<Turnstile onToken={onToken} />);
  view.unmount();
  expect(remove).toHaveBeenCalledWith("widget-1");
  render(<Turnstile onToken={onToken} />);
  expect(renderWidget).toHaveBeenCalledTimes(2);
  expect(document.querySelectorAll("script[data-quote-turnstile]")).toHaveLength(1);
});
it("fails closed when the site key is missing", () => {
  vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "");
  render(<Turnstile onToken={vi.fn()} />);
  expect(renderWidget).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toBeInTheDocument();
});
it("reports script loading failure", () => {
  delete window.turnstile;
  const onToken = vi.fn();
  render(<Turnstile onToken={onToken} />);
  fireEvent.error(document.querySelector("script[data-quote-turnstile]")!);
  expect(onToken).toHaveBeenCalledWith("");
  expect(screen.getByRole("alert")).toBeInTheDocument();
});

it("clears error messages after successful widget recovery", () => {
  const onToken = vi.fn();
  render(<Turnstile onToken={onToken} />);
  const options = renderWidget.mock.calls[0]![1];
  act(() => options["error-callback"]());
  expect(screen.getByRole("alert")).toBeInTheDocument();
  act(() => options.callback("fresh-token"));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(onToken).toHaveBeenLastCalledWith("fresh-token");
  act(() => options["timeout-callback"]());
  expect(onToken).toHaveBeenLastCalledWith("");
});
it("ignores stale callbacks after removing a widget", () => {
  const onToken = vi.fn();
  const view = render(<Turnstile onToken={onToken} />);
  const options = renderWidget.mock.calls[0]![1];
  view.unmount();
  act(() => {
    options.callback("stale-token");
    options["expired-callback"]();
    options["error-callback"]();
  });
  expect(onToken).not.toHaveBeenCalled();
});
it("shows a safe fallback if the widget API throws", () => {
  renderWidget.mockImplementationOnce(() => {
    throw new Error("widget failure");
  });
  const onToken = vi.fn();
  render(<Turnstile onToken={onToken} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Security check unavailable");
  expect(onToken).toHaveBeenCalledWith("");
});
