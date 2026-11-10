import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { trackUsage } from "@/lib/analytics.functions";
const pages = ["/", "/about", "/products", "/dealers", "/contact"] as const;
export function PrivacyControls() {
  const [consent, setConsent] = useState(false),
    [ready, setReady] = useState(false);
  const location = useLocation();
  const send = useServerFn(trackUsage);
  useEffect(() => {
    try {
      setConsent(localStorage.getItem("two-star-analytics") === "yes");
    } catch {
      /* Storage may be disabled. */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    const page = pages.find((p) => p === location.pathname);
    if (!ready || !consent || !page) return;
    void send({ data: { event: "pageview", page, consent: true } }).catch(() => {});
    const success = () => {
      void send({ data: { event: "quote_success", page, consent: true } }).catch(() => {});
    };
    window.addEventListener("quote-success", success);
    return () => window.removeEventListener("quote-success", success);
  }, [ready, consent, location.pathname, send]);
  return (
    <aside className="mx-auto max-w-7xl px-4 py-4 text-sm text-muted-foreground">
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
            try {
              localStorage.setItem("two-star-analytics", e.target.checked ? "yes" : "no");
            } catch {
              /* Preference remains valid for this visit. */
            }
          }}
        />
        Allow anonymous page and enquiry-success counts. No customer details, IP addresses or
        visitor identifiers are recorded by this feature. Optional counts are off by default; you
        can change this choice here.
      </label>
    </aside>
  );
}
