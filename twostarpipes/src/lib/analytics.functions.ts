import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
export const trackUsage = createServerFn({ method: "POST" })
  .validator(
    z.object({
      event: z.enum(["pageview", "quote_success"]),
      page: z.enum(["/", "/about", "/products", "/dealers", "/contact"]),
      consent: z.literal(true),
    }),
  )
  .handler(async ({ data }) => {
    if (process.env["ANALYTICS_ENABLED"] !== "true") return false;
    try {
      const { consumeLimit } = await import("./quote-security.server");
      if (!(await consumeLimit("analytics-budget", 1000, 60))) return false;
      return await consumeLimit(
        `analytics:${new Date().toISOString().slice(0, 10)}:${data.page}:${data.event}`,
        1000000,
        90 * 86400,
      );
    } catch {
      return false;
    }
  });
