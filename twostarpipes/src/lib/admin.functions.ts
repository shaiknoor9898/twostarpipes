import { notificationSettingsSchema } from "./admin-schema";
import { createServerFn } from "@tanstack/react-start";
import {
  sessionSchema,
  listSchema,
  updateEnquirySchema,
  productSaveSchema,
  productDeleteSchema,
  uploadSchema,
} from "./admin-schema";

// Every operation independently verifies Auth + the database allowlist.
// Generic public errors prevent backend diagnostics from reaching the browser.
async function safe<T>(work: () => Promise<T>) {
  try {
    return { ok: true as const, value: await work() };
  } catch {
    console.error("Admin operation failed", { category: "authorization-or-operation" });
    return {
      ok: false as const,
      error: "Access denied or operation unavailable. Refresh or sign in again.",
    };
  }
}
export const adminDashboard = createServerFn({ method: "POST" })
  .validator(sessionSchema)
  .handler(({ data }) =>
    safe(async () => (await import("./admin.server")).dashboard(data.accessToken)),
  );
export const adminList = createServerFn({ method: "POST" })
  .validator(listSchema)
  .handler(({ data }) => safe(async () => (await import("./admin.server")).listEnquiries(data)));
export const adminExport = createServerFn({ method: "POST" })
  .validator(listSchema)
  .handler(({ data }) =>
    safe(async () => (await import("./admin.server")).listEnquiries(data, true)),
  );
export const adminUpdate = createServerFn({ method: "POST" })
  .validator(updateEnquirySchema)
  .handler(({ data }) => safe(async () => (await import("./admin.server")).updateEnquiry(data)));
export const adminProducts = createServerFn({ method: "POST" })
  .validator(sessionSchema)
  .handler(({ data }) =>
    safe(async () => (await import("./admin.server")).listProducts(data.accessToken)),
  );
export const adminSaveProduct = createServerFn({ method: "POST" })
  .validator(productSaveSchema)
  .handler(({ data }) =>
    safe(async () => (await import("./admin.server")).saveProduct(data.accessToken, data.product)),
  );
export const adminDeleteProduct = createServerFn({ method: "POST" })
  .validator(productDeleteSchema)
  .handler(({ data }) =>
    safe(async () => (await import("./admin.server")).deleteProduct(data.accessToken, data.slug)),
  );
export const adminUpload = createServerFn({ method: "POST" })
  .validator(uploadSchema)
  .handler(({ data }) => safe(async () => (await import("./admin.server")).uploadAsset(data)));

export const adminImportCatalogue = createServerFn({ method: "POST" })
  .validator(sessionSchema)
  .handler(({ data }) =>
    safe(async () => (await import("./admin.server")).importCatalogue(data.accessToken)),
  );
export const adminNotificationSettings = createServerFn({ method: "POST" })
  .validator(sessionSchema)
  .handler(({ data }) =>
    safe(async () => (await import("./admin.server")).notificationSettings(data.accessToken)),
  );
export const adminSaveNotificationSettings = createServerFn({ method: "POST" })
  .validator(notificationSettingsSchema)
  .handler(({ data }) =>
    safe(async () =>
      (await import("./admin.server")).notificationSettings(data.accessToken, {
        enabled: data.enabled,
        recipients: data.recipients,
      }),
    ),
  );

export const adminHistory = createServerFn({ method: "POST" })
  .validator(sessionSchema.extend({ id: updateEnquirySchema.shape.id }))
  .handler(({ data }) =>
    safe(async () => (await import("./admin.server")).enquiryHistory(data.accessToken, data.id)),
  );
