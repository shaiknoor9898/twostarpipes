import { useEffect, useRef, useState } from "react";

type TurnstileAPI = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileAPI;
  }
}

export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const sitekey = import.meta.env["VITE_TURNSTILE_SITE_KEY"];
  useEffect(() => {
    if (!sitekey) return;
    let id: string | undefined;
    let disposed = false;
    const clear = () => {
      if (!disposed) onToken("");
    };
    const fail = () => {
      if (disposed) return;
      onToken("");
      setFailed(true);
    };
    const render = () => {
      if (disposed || id || !container.current || !window.turnstile) return;
      try {
        id = window.turnstile.render(container.current, {
          sitekey,
          action: "quote",
          callback: (token: string) => {
            if (disposed) return;
            setFailed(false);
            onToken(token);
          },
          "expired-callback": clear,
          "timeout-callback": clear,
          "error-callback": fail,
        });
      } catch {
        fail();
      }
    };
    let script = document.querySelector<HTMLScriptElement>("script[data-quote-turnstile]");
    if (!script) {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.dataset["quoteTurnstile"] = "true";
      document.head.appendChild(script);
    }
    const error = fail;
    script.addEventListener("load", render);
    script.addEventListener("error", error);
    render();
    return () => {
      disposed = true;
      script.removeEventListener("load", render);
      script.removeEventListener("error", error);
      if (id) window.turnstile?.remove(id);
    };
  }, [sitekey, onToken]);
  return (
    <div>
      <div ref={container} />
      {(!sitekey || failed) && (
        <p role="alert">Security check unavailable. Please reload or call us.</p>
      )}
    </div>
  );
}
