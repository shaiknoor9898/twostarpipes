import { z } from "zod";

export const CUSTOMER_TYPES = ["farmer", "dealer", "wholesaler", "contractor", "other"] as const;

export const quoteSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  phone: z
    .string()
    .trim()
    .min(6, "Please enter a valid phone number")
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Please enter a valid phone number"),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional(),
  customer_type: z.enum(CUSTOMER_TYPES),
  product: z.string().trim().min(1, "Please choose a product").max(100),
  quantity: z.string().trim().max(100).optional(),
  message: z.string().trim().max(1000).optional(),
});

export type QuoteInput = z.infer<typeof quoteSchema>;
