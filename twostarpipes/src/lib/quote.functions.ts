import { createServerFn } from "@tanstack/react-start";
import { quoteSubmissionSchema } from "./quote-schema";

export const submitQuote = createServerFn({ method: "POST" })
  .validator((input: unknown) => quoteSubmissionSchema.parse(input))
  .handler(async ({ data }) => {
    const { saveQuote } = await import("./quote.server");
    return saveQuote(data);
  });
