import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    channel: process.env["PLAYWRIGHT_CHANNEL"] || "msedge",
    trace: "off",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      MANAGED_CATALOGUE: "false",
      ANALYTICS_ENABLED: "false",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      VITE_TURNSTILE_SITE_KEY: "",
      TURNSTILE_SECRET_KEY: "",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
      SUPABASE_QUOTE_WRITER_KEY: "",
      RESEND_API_KEY: "",
    },
  },
});
