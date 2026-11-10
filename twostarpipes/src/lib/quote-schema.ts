import { z } from "zod";
import { PRODUCTS } from "./site";
export const QUOTE_PRODUCTS = [...PRODUCTS.map((p) => p.name), "Multiple products"];

export const CUSTOMER_TYPES = ["farmer", "dealer", "wholesaler", "contractor", "other"] as const;

export function createQuoteSchema(products: readonly string[]) {
  return z.object({
    name: z.string().trim().min(1, "Please enter your name").max(100),
    phone: z
      .string()
      .trim()
      .min(6, "Please enter a valid phone number")
      .max(20)
      .regex(/^\+?[0-9\-\s()]+$/, "Please enter a valid phone number")
      .refine((value) => {
        const digits = value.replace(/\D/g, "");
        return digits.length >= 6 && digits.length <= 15;
      }, "Please enter a valid phone number"),
    email: z
      .string()
      .trim()
      .pipe(z.email("Invalid email").max(255).or(z.literal("")))
      .optional(),
    city: z.string().trim().max(100).optional(),
    customer_type: z.enum(CUSTOMER_TYPES),
    product: z
      .string({ error: "Please choose a product" })
      .trim()
      .min(1, "Please choose a product")
      .max(100)
      .refine((value) => products.includes(value), "Please choose a product"),
    quantity: z.string().trim().max(100).optional(),
    message: z.string().trim().max(1000).optional(),
  });
}
export const quoteSchema = createQuoteSchema(QUOTE_PRODUCTS);

export type QuoteInput = z.infer<typeof quoteSchema>;

export const quoteSubmissionSchema = quoteSchema.extend({
  requestId: z.uuid(),
  product: z.string().trim().min(1).max(100),
  turnstileToken: z.string().trim().min(1).max(2048),
});
