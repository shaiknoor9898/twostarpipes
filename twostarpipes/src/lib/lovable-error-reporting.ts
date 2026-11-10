// Send fixed diagnostics only; raw exceptions can contain customer or credential data.
declare global {
  interface Window {
    __lovableEvents?: {
      captureException?: (
        error: unknown,
        context?: Record<string, unknown>,
        options?: Record<string, unknown>,
      ) => void;
    };
    __lovableReportRuntimeError?: (payload: { message: string; filename?: string }) => void;
  }
}
export function reportLovableError(_error: unknown, _context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.__lovableEvents?.captureException?.(
    new Error("Application rendering failed"),
    { source: "react_error_boundary" },
    { handled: true, severity: "error" },
  );
  window.__lovableReportRuntimeError?.({ message: "Application rendering failed" });
}
