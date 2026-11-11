export function secureResponse(response: Response, path: string) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // Enforce a narrow baseline without breaking framework inline scripts or Turnstile.
  headers.set(
    "Content-Security-Policy",
    "base-uri 'self'; object-src 'none'; form-action 'self'; upgrade-insecure-requests",
  );
  if (path.startsWith("/admin") || path.startsWith("/api/") || path.includes("/_serverFn/")) {
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Frame-Options", "DENY");
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
