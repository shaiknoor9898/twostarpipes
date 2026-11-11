import { Text } from "@/components/site/SitePreferences";
import { useSitePreferences } from "@/lib/site-preferences";
import { Turnstile } from "./Turnstile";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitQuote } from "@/lib/quote.functions";
import { CUSTOMER_TYPES, createQuoteSchema } from "@/lib/quote-schema";
import { PRODUCTS } from "@/lib/site";

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-card px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function QuoteForm({
  defaultType = "farmer",
  products = PRODUCTS,
}: {
  defaultType?: (typeof CUSTOMER_TYPES)[number];
  products?: { name: string }[];
}) {
  const { t } = useSitePreferences();
  const send = useServerFn(submitQuote);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const [turnstileToken, setTurnstileToken] = useState("");
  const [challengeVersion, setChallengeVersion] = useState(0);
  const submitting = useRef(false);
  const requestRef = useRef<{ fingerprint: string; id: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    setServerError(null);
    const form = e.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    const parsed = createQuoteSchema([
      ...products.map((p) => p.name),
      "Multiple products",
    ]).safeParse(raw);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] ??= issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    if (!turnstileToken) {
      setServerError("Please complete the security check.");
      return;
    }
    setErrors({});
    setServerError(null);
    submitting.current = true;
    setStatus("sending");
    try {
      const fingerprint = JSON.stringify(parsed.data);
      if (requestRef.current?.fingerprint !== fingerprint)
        requestRef.current = { fingerprint, id: crypto.randomUUID() };
      const res = await send({
        data: { ...parsed.data, turnstileToken, requestId: requestRef.current.id },
      });
      if (res.ok) {
        setStatus("done");
        window.dispatchEvent(new Event("quote-success"));
        form.reset();
        requestRef.current = null;
      } else {
        setServerError(res.error);
        setStatus("idle");
      }
    } catch {
      setServerError("Could not send your request. Please call us.");
      setStatus("idle");
    } finally {
      submitting.current = false;
      setTurnstileToken("");
      setChallengeVersion((v) => v + 1);
    }
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center rounded-2xl border bg-card p-10 text-center shadow-soft">
        <CheckCircle2 className="size-14 text-accent" />
        <h3 className="headline mt-4 text-2xl text-primary">
          <Text text={"Request received"} />
        </h3>
        <p className="mt-2 text-muted-foreground">
          <Text text={"Thank you. Our team will contact you soon."} />
        </p>
        <Button variant="leafOutline" className="mt-6" onClick={() => setStatus("idle")}>
          <Text text={"Send another request"} />
        </Button>
      </div>
    );
  }

  const err = (k: string) =>
    errors[k] && (
      <p id={`${k}-error`} role="alert" className="mt-1 text-sm text-destructive">
        <Text text={errors[k]} />
      </p>
    );

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      noValidate
      className="grid gap-4 rounded-2xl border bg-card p-6 shadow-soft md:grid-cols-2 md:p-8"
    >
      <div>
        <Label htmlFor="name">
          <Text text={"Your name *"} />
        </Label>
        <Input
          id="name"
          aria-invalid={!!errors["name"]}
          aria-describedby={errors["name"] ? "name-error" : undefined}
          name="name"
          className="mt-1.5 h-11"
          maxLength={100}
        />
        {err("name")}
      </div>
      <div>
        <Label htmlFor="phone">
          <Text text={"Phone / WhatsApp *"} />
        </Label>
        <Input
          id="phone"
          aria-invalid={!!errors["phone"]}
          aria-describedby={errors["phone"] ? "phone-error" : undefined}
          name="phone"
          type="tel"
          inputMode="tel"
          className="mt-1.5 h-11"
          maxLength={20}
        />
        {err("phone")}
      </div>
      <div>
        <Label htmlFor="customer_type">
          <Text text={"I am a *"} />
        </Label>
        <select
          id="customer_type"
          aria-invalid={!!errors["customer_type"]}
          aria-describedby={errors["customer_type"] ? "customer_type-error" : undefined}
          name="customer_type"
          defaultValue={defaultType}
          className={`${selectClass} mt-1.5`}
        >
          <option value="farmer">
            <Text text={"Farmer"} />
          </option>
          <option value="dealer">
            <Text text={"Dealer"} />
          </option>
          <option value="wholesaler">
            <Text text={"Wholesaler"} />
          </option>
          <option value="contractor">
            <Text text={"Contractor / Builder"} />
          </option>
          <option value="other">
            <Text text={"Other"} />
          </option>
        </select>
        {err("customer_type")}
      </div>
      <div>
        <Label htmlFor="product">
          <Text text={"Product *"} />
        </Label>
        <select
          id="product"
          aria-invalid={!!errors["product"]}
          aria-describedby={errors["product"] ? "product-error" : undefined}
          name="product"
          defaultValue=""
          className={`${selectClass} mt-1.5`}
        >
          <option value="" disabled>
            <Text text={"Choose a product"} />
          </option>
          {products.map((p) => (
            <option key={p.name} value={p.name}>
              <Text text={p.name} />
            </option>
          ))}
          <option value="Multiple products">
            <Text text={"Multiple products"} />
          </option>
        </select>
        {err("product")}
      </div>
      <div>
        <Label htmlFor="city">
          <Text text={"Village / City"} />
        </Label>
        <Input
          id="city"
          aria-invalid={!!errors["city"]}
          aria-describedby={errors["city"] ? "city-error" : undefined}
          name="city"
          className="mt-1.5 h-11"
          maxLength={100}
        />
        {err("city")}
      </div>
      <div>
        <Label htmlFor="quantity">
          <Text text={"Quantity needed"} />
        </Label>
        <Input
          id="quantity"
          aria-invalid={!!errors["quantity"]}
          aria-describedby={errors["quantity"] ? "quantity-error" : undefined}
          name="quantity"
          placeholder={t("e.g. 100 pipes, 63 mm")}
          className="mt-1.5 h-11"
          maxLength={100}
        />
        {err("quantity")}
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="email">
          <Text text={"Email (optional)"} />
        </Label>
        <Input
          id="email"
          aria-invalid={!!errors["email"]}
          aria-describedby={errors["email"] ? "email-error" : undefined}
          name="email"
          type="email"
          className="mt-1.5 h-11"
          maxLength={255}
        />
        {err("email")}
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="message">
          <Text text={"Message"} />
        </Label>
        <Textarea
          id="message"
          aria-invalid={!!errors["message"]}
          aria-describedby={errors["message"] ? "message-error" : undefined}
          name="message"
          rows={4}
          className="mt-1.5"
          maxLength={1000}
        />
        {err("message")}
      </div>
      <div className="md:col-span-2">
        <Turnstile key={challengeVersion} onToken={setTurnstileToken} />
      </div>
      {serverError && (
        <p role="alert" className="text-sm text-destructive md:col-span-2">
          <Text text={serverError} />
        </p>
      )}
      <div className="md:col-span-2">
        <Button
          type="submit"
          variant="leaf"
          size="lg"
          disabled={!hydrated || status === "sending"}
          className="w-full md:w-auto"
        >
          {status === "sending" ? <Loader2 className="animate-spin" /> : <Send />}
          <Text text={"Request a Quote"} />
        </Button>
      </div>
    </form>
  );
}
