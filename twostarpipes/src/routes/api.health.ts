import { createFileRoute } from "@tanstack/react-router";

// Liveness only. No project identifiers, credentials or dependency diagnostics.
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: () => Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } }),
    },
  },
});
