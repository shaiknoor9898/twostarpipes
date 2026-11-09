import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitQuote } from "@/lib/quote.functions";
import { CUSTOMER_TYPES, quoteSchema } from "@/lib/quote-schema";
import { PRODUCTS } from "@/lib/site";

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-card px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function QuoteForm({ defaultType = "farmer" }: { defaultType?: (typeof CUSTOMER_TYPES)[number] }) {
  const send = useServerFn(submitQuote);
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    const parsed = quoteSchema.safeParse(raw);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] ??= issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setServerError(null);
    setStatus("sending");
    try {
      const res = await send({ data: parsed.data });
      if (res.ok) {
        setStatus("done");
        form.reset();
      } else {
        setServerError(res.error);
        setStatus("idle");
      }
    } catch {
      setServerError("Could not send your request. Please call us.");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center rounded-2xl border bg-card p-10 text-center shadow-soft">
        <CheckCircle2 className="size-14 text-accent" />
        <h3 className="headline mt-4 text-2xl text-primary">Request received</h3>
        <p className="mt-2 text-muted-foreground">Thank you. Our team will contact you soon.</p>
        <Button variant="leafOutline" className="mt-6" onClick={() => setStatus("idle")}>
          Send another request
        </Button>
      </div>
    );
  }

  const err = (k: string) => errors[k] && <p className="mt-1 text-sm text-destructive">{errors[k]}</p>;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 rounded-2xl border bg-card p-6 shadow-soft md:grid-cols-2 md:p-8">
      <div>
        <Label htmlFor="name">Your name *</Label>
        <Input id="name" name="name" className="mt-1.5 h-11" maxLength={100} />
        {err("name")}
      </div>
      <div>
        <Label htmlFor="phone">Phone / WhatsApp *</Label>
        <Input id="phone" name="phone" type="tel" inputMode="tel" className="mt-1.5 h-11" maxLength={20} />
        {err("phone")}
      </div>
      <div>
        <Label htmlFor="customer_type">I am a *</Label>
        <select id="customer_type" name="customer_type" defaultValue={defaultType} className={`${selectClass} mt-1.5`}>
          <option value="farmer">Farmer</option>
          <option value="dealer">Dealer</option>
          <option value="wholesaler">Wholesaler</option>
          <option value="contractor">Contractor / Builder</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <Label htmlFor="product">Product *</Label>
        <select id="product" name="product" defaultValue="" className={`${selectClass} mt-1.5`}>
          <option value="" disabled>
            Choose a product
          </option>
          {PRODUCTS.map((p) => (
            <option key={p.slug} value={p.name}>
              {p.name}
            </option>
          ))}
          <option value="Multiple products">Multiple products</option>
        </select>
        {err("product")}
      </div>
      <div>
        <Label htmlFor="city">Village / City</Label>
        <Input id="city" name="city" className="mt-1.5 h-11" maxLength={100} />
      </div>
      <div>
        <Label htmlFor="quantity">Quantity needed</Label>
        <Input id="quantity" name="quantity" placeholder="e.g. 100 pipes, 63 mm" className="mt-1.5 h-11" maxLength={100} />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="email">Email (optional)</Label>
        <Input id="email" name="email" type="email" className="mt-1.5 h-11" maxLength={255} />
        {err("email")}
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" rows={4} className="mt-1.5" maxLength={1000} />
      </div>
      {serverError && <p className="text-sm text-destructive md:col-span-2">{serverError}</p>}
      <div className="md:col-span-2">
        <Button type="submit" variant="leaf" size="lg" disabled={status === "sending"} className="w-full md:w-auto">
          {status === "sending" ? <Loader2 className="animate-spin" /> : <Send />}
          Request a Quote
        </Button>
      </div>
    </form>
  );
}
