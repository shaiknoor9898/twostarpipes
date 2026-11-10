import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/notifications")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { authorizedCron, deliverNotifications } = await import("@/lib/notifications.server");
        if (!authorizedCron(request.headers.get("authorization")))
          return new Response("Unauthorized", {
            status: 401,
            headers: { "Cache-Control": "no-store" },
          });
        try {
          return Response.json(await deliverNotifications(), {
            headers: { "Cache-Control": "no-store" },
          });
        } catch {
          console.error("Notification worker failed", { category: "configuration-or-provider" });
          return new Response("Notification service unavailable", {
            status: 503,
            headers: { "Cache-Control": "no-store" },
          });
        }
      },
    },
  },
});
