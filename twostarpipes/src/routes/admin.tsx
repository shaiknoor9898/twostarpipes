import { createFileRoute } from "@tanstack/react-router";
import { Admin } from "@/components/admin/AdminWorkspace";
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration | Two Star Pipes" },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: Admin,
});
