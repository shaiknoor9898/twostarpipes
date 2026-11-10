// HTTPS-only dependencies work across Cloudflare Worker instances; no local counters.
const counterScript = `local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return n`;

async function redisCommand(command: string[]) {
  const url = new URL(process.env["UPSTASH_REDIS_REST_URL"] || "");
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"];
  if (url.protocol !== "https:" || url.username || url.password || !token)
    throw new Error("Rate limit configuration");
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Rate limit unavailable");
  const data = await response.json();
  if (!data || typeof data !== "object" || data.error || !("result" in data))
    throw new Error("Invalid rate limit response");
  return data.result as unknown;
}

export async function consumeLimit(key: string, limit: number, seconds: number) {
  const count = await redisCommand([
    "EVAL",
    counterScript,
    "1",
    `quotes:v1:${key}`,
    String(seconds),
  ]);
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 1)
    throw new Error("Invalid rate limit response");
  return count <= limit;
}

export async function verifyTurnstile(token: string) {
  const secret = process.env["TURNSTILE_SECRET_KEY"];
  const hosts = (process.env["TURNSTILE_HOSTNAMES"] || "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  if (!secret || !hosts.length) throw new Error("Turnstile configuration");
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Verification unavailable");
  const data = await response.json();
  return data?.success === true && data.action === "quote" && hosts.includes(data.hostname);
}

export async function protectQuote(token: string, phone: string) {
  // Global budget also bounds Siteverify traffic. No spoofable forwarding headers.
  if (!(await consumeLimit("global", 100, 60))) return false;
  if (!(await verifyTurnstile(token))) return false;
  const secret = process.env["QUOTE_RATE_LIMIT_SECRET"];
  if (!secret || secret.length < 32) throw new Error("Rate limit hashing configuration");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const hash = async (value: string) => {
    const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join("");
  };
  // Siteverify redemption can converge across locations. Claim each verified token
  // atomically before inserting, independently of provider replay detection.
  const claimed = await redisCommand([
    "SET",
    `quotes:v1:token:${await hash(`token:${token}`)}`,
    "1",
    "NX",
    "EX",
    "600",
  ]);
  if (claimed === null) return false;
  if (claimed !== "OK") throw new Error("Invalid replay guard response");
  return consumeLimit(`phone:${await hash(phone.replace(/\D/g, ""))}`, 5, 900);
}
