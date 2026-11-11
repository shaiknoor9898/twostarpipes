import { LocalizedMetadata } from "@/components/site/LocalizedMetadata";
import { Text } from "@/components/site/SitePreferences";
import { useSitePreferences } from "@/lib/site-preferences";
import {
  SitePreferencesProvider,
  SitePreferencesControls,
  APPEARANCE_INIT_SCRIPT,
} from "@/components/site/SitePreferences";
import { PrivacyControls } from "@/components/site/PrivacyControls";
import { useLocation } from "@tanstack/react-router";
import { SITE } from "@/lib/site";
import logo from "@/assets/two-star-logo.png";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileActionBar } from "@/components/site/SiteFooter";
import { FloatingActions, WhatsAppBubble } from "@/components/site/FloatingActions";

function NotFoundComponent() {
  const { t } = useSitePreferences();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          <Text text={"Page not found"} />
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          <Text text={"The page you're looking for doesn't exist or has been moved."} />
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Text text={"Go home"} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const { t } = useSitePreferences();
  console.error("Page rendering failed");
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          <Text text={"This page didn't load"} />
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <Text
            text={"Something went wrong on our end. You can try refreshing or head back home."}
          />
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Text text={"Try again"} />
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Text text={"Go home"} />
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "Two Star Pipes Industries" },
      { name: "theme-color", content: "#0b2a6b" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Two Star Pipes" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: new URL(logo, "https://www.twostarpipes.com").href },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SITE.name,
          url: "https://www.twostarpipes.com",
          telephone: SITE.phone,
          email: SITE.email,
          address: {
            "@type": "PostalAddress",
            streetAddress: SITE.addressLine1,
            addressLocality: "Rayachoty",
            addressRegion: "Andhra Pradesh",
            postalCode: "516269",
            addressCountry: "IN",
          },
        }),
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;500;600;700&family=Lexend:wght@400;500;600;700;800&family=Mulish:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { t } = useSitePreferences();
  const { queryClient } = Route.useRouteContext();
  const admin = useLocation().pathname.startsWith("/admin");

  return (
    <SitePreferencesProvider>
      <QueryClientProvider client={queryClient}>
        <LocalizedMetadata enabled={!admin} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-card focus:p-4"
        >
          <Text text={"Skip to content"} />
        </a>
        {!admin && <SiteHeader />}
        {admin && (
          <div className="border-b bg-card px-4 py-3">
            <SitePreferencesControls />
          </div>
        )}
        <main
          lang={admin ? "en" : undefined}
          id="main-content"
          tabIndex={-1}
          className={admin ? "min-h-screen" : "pb-24 md:pb-0 md:pr-14"}
        >
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </main>
        {!admin && (
          <>
            <PrivacyControls />
            <SiteFooter />
            <MobileActionBar />
            <FloatingActions />
          </>
        )}
      </QueryClientProvider>
    </SitePreferencesProvider>
  );
}
