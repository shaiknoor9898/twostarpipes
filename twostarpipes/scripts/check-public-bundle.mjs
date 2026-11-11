import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
const root = process.argv[2] || ".output/public";
const forbidden = [
  "TURNSTILE_SECRET_KEY",
  "UPSTASH_REDIS_REST_TOKEN",
  "QUOTE_RATE_LIMIT_SECRET",
  "SUPABASE_QUOTE_WRITER_KEY",
  "RESEND_API_KEY",
  "NOTIFICATION_CRON_SECRET",
  "SUPABASE_NOTIFICATION_WORKER_KEY",
];
let count = 0;
function inspect(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, item.name);
    if (item.isDirectory()) inspect(file);
    else if (file.endsWith(".js")) {
      count++;
      const content = readFileSync(file, "utf8");
      if (forbidden.some((name) => content.includes(name)))
        throw new Error("Server-only code detected in public bundle: " + file);
    }
  }
}
inspect(root);
if (!count) throw new Error("Build public bundle before checking");
console.log("Public bundle boundary check passed (" + count + " JavaScript files).");
