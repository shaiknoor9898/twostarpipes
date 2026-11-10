import { createServerFn } from "@tanstack/react-start";
export const getCatalogue = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await (await import("./catalogue.server")).loadCatalogue();
  } catch {
    throw new Error("Catalogue unavailable. Please call for product details.");
  }
});
