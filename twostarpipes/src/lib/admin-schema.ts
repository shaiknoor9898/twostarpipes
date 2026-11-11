import { z } from "zod";

export const STATUSES = ["New", "Contacted", "Quotation Sent", "Converted", "Closed"] as const;
export const sessionSchema = z.object({ accessToken: z.string().min(1).max(8192) });
export const listSchema = sessionSchema.extend({
  search: z.string().trim().max(100).default(""),
  status: z.enum(STATUSES).optional(),
  dealersOnly: z.boolean().default(false),
  page: z.number().int().min(0).max(100000).default(0),
  ascending: z.boolean().default(false),
});
export const updateEnquirySchema = sessionSchema.extend({
  id: z.uuid(),
  status: z.enum(STATUSES),
  internal_notes: z.string().trim().max(5000),
  follow_up_at: z.iso.datetime({ offset: true }).nullable(),
  updated_at: z.iso.datetime({ offset: true }),
});
const lines = z.array(z.string().trim().min(1).max(300)).max(50);
const isPublicHttps = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
};
const assetUrl = z
  .string()
  .max(2000)
  .refine((value) => {
    if (/^builtin:(pvc|agricultural|casing|upvc|electrical|drip|drip-fittings)$/.test(value))
      return true;
    if (value.startsWith("/assets/") && !value.startsWith("//")) return true;
    return isPublicHttps(value);
  }, "Use an uploaded asset or HTTPS URL");
export const productSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80),
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(80),
  short: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  image: assetUrl,
  uses: lines,
  sizes: lines,
  gauges: lines.default([]),
  advantages: lines.default([]),
  specifications: z.string().trim().max(5000).default(""),
  brochure: z
    .string()
    .max(2000)
    .refine(
      (value) => value === "" || isPublicHttps(value),
      "Use an uploaded PDF HTTPS URL without embedded credentials",
    )
    .default(""),
  published: z.boolean(),
});
export type ManagedProduct = z.infer<typeof productSchema>;
export type Enquiry = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  customer_type: string;
  product: string;
  quantity: string | null;
  message: string | null;
  status: (typeof STATUSES)[number];
  internal_notes: string;
  follow_up_at: string | null;
};
export const productSaveSchema = sessionSchema.extend({ product: productSchema });
export const productDeleteSchema = sessionSchema.extend({ slug: productSchema.shape.slug });
export const uploadSchema = sessionSchema.extend({
  kind: z.enum(["image", "brochure"]),
  mime: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
  content: z.string().min(1).max(7_000_000),
});

// Spreadsheet programs interpret leading formula markers, including after whitespace.
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  // eslint-disable-next-line no-control-regex -- CSV formula sanitization must include leading control bytes.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}
export function enquiryCSV(rows: Enquiry[]) {
  const columns = [
    "created_at",
    "name",
    "phone",
    "email",
    "city",
    "customer_type",
    "product",
    "quantity",
    "status",
    "follow_up_at",
  ] as const;
  return [
    columns.map(csvCell).join(","),
    ...rows.map((row) => columns.map((key) => csvCell(row[key])).join(",")),
  ].join("\r\n");
}

export const notificationSettingsSchema = sessionSchema
  .extend({ enabled: z.boolean(), recipients: z.array(z.email().max(255)).max(10) })
  .refine((v) => !v.enabled || v.recipients.length > 0, "Add at least one recipient");
