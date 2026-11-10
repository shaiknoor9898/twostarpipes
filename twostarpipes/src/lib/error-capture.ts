// Keep framework error interception without retaining messages, causes or stacks.
let lastCapturedAt = 0;
const original = console.error.bind(console);
console.error = (..._args: unknown[]) => {
  lastCapturedAt = Date.now();
  original("Application operation failed");
};
if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", () => {
    lastCapturedAt = Date.now();
  });
  globalThis.addEventListener("unhandledrejection", () => {
    lastCapturedAt = Date.now();
  });
}
export function consumeLastCapturedError() {
  const fresh = Date.now() - lastCapturedAt < 5000;
  lastCapturedAt = 0;
  return fresh ? new Error("Application operation failed") : undefined;
}
