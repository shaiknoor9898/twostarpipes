import { expect, it, vi, afterEach } from "vitest";
import { secureResponse } from "@/lib/security-headers";
import { authorizedCron } from "@/lib/notifications.server";
afterEach(() => vi.unstubAllEnvs());
it("never caches private admin or API responses", () => {
  for (const path of ["/admin", "/api/notifications", "/_serverFn/test"]) {
    const response = secureResponse(new Response("private"), path);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  }
});
it("requires a configured high-entropy cron credential", () => {
  vi.stubEnv("NOTIFICATION_CRON_SECRET", "x".repeat(32));
  expect(authorizedCron(null)).toBe(false);
  expect(authorizedCron("Bearer wrong")).toBe(false);
  expect(authorizedCron("Bearer " + "x".repeat(32))).toBe(true);
  vi.stubEnv("NOTIFICATION_CRON_SECRET", "short");
  expect(authorizedCron("Bearer short")).toBe(false);
});
