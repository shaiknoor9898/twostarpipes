# Changed-file inventory

81 pending tracked/untracked files relative to twostarpipes/. Earlier uncommitted work is preserved. No files were staged, committed, pushed, merged or deployed. Development-only dependencies: Playwright and PGlite. Existing baseline formatting errors were corrected; formatting-only files are explicitly labeled below.

| File | Scope |
| --- | --- |
| .env.example | Placeholder environment-variable matrix |
| .gitignore | Credential and local QA-artifact exclusions |
| AGENTS.md | Updated project architecture guidance |
| README.md | Status, setup, remaining risks and release/recovery instructions |
| docs/LAUNCH.md | Status, setup, remaining risks and release/recovery instructions |
| docs/STATUS.md | Status, setup, remaining risks and release/recovery instructions |
| e2e/public.spec.ts | Automated unit/component/database/browser QA |
| package-lock.json | Development dependencies, scripts or test configuration |
| package.json | Development dependencies, scripts or test configuration |
| playwright.config.ts | Development dependencies, scripts or test configuration |
| public/robots.txt | Public crawler/SEO metadata |
| public/sitemap.xml | Public crawler/SEO metadata |
| scripts/check-public-bundle.mjs | Production client/server bundle boundary check |
| security/000_quote_preflight.sql | Security review, versioned SQL draft or rollback-only verification |
| security/001_quote_hardening.sql | Security review, versioned SQL draft or rollback-only verification |
| security/002_validate_constraints.sql | Security review, versioned SQL draft or rollback-only verification |
| security/003_admin_catalogue_notifications.sql | Security review, versioned SQL draft or rollback-only verification |
| security/004_submission_idempotency.sql | Security review, versioned SQL draft or rollback-only verification |
| security/CHANGES.md | Security review, versioned SQL draft or rollback-only verification |
| security/REVIEW.md | Security review, versioned SQL draft or rollback-only verification |
| security/admin-rls-check.sql | Security review, versioned SQL draft or rollback-only verification |
| security/idempotency-check.sql | Security review, versioned SQL draft or rollback-only verification |
| security/quote-rls-check.sql | Security review, versioned SQL draft or rollback-only verification |
| src/components/admin/AdminWorkspace.tsx | Verified admin workspace, enquiry/product/notification interface |
| src/components/admin/NotificationSettings.tsx | Verified admin workspace, enquiry/product/notification interface |
| src/components/admin/ProductManager.tsx | Verified admin workspace, enquiry/product/notification interface |
| src/components/site/CelebrationBadge.tsx | Formatting-only lint corrections; existing behavior/data preserved |
| src/components/site/FloatingActions.tsx | Formatting-only lint corrections; existing behavior/data preserved |
| src/components/site/HeroSlider.tsx | Public UX, accessibility, routing, catalogue integration or SEO |
| src/components/site/PrivacyControls.tsx | Default-off consent-based aggregate counters |
| src/components/site/QuoteForm.tsx | Quotation validation, CAPTCHA/rate/replay/idempotency protections |
| src/components/site/SiteFooter.tsx | Public UX, accessibility, routing, catalogue integration or SEO |
| src/components/site/SiteHeader.tsx | Public UX, accessibility, routing, catalogue integration or SEO |
| src/components/site/Turnstile.tsx | Quotation validation, CAPTCHA/rate/replay/idempotency protections |
| src/components/ui/button.tsx | Formatting-only lint corrections; existing behavior/data preserved |
| src/integrations/supabase/auth-attacher.ts | Anonymous-compatible session attachment |
| src/integrations/supabase/auth-middleware.ts | Formatting-only lint corrections; existing behavior/data preserved |
| src/integrations/supabase/client.server.ts | Formatting-only lint corrections; existing behavior/data preserved |
| src/integrations/supabase/client.ts | Retained guarded public Supabase configuration |
| src/integrations/supabase/cron-auth.ts | Formatting-only lint corrections; existing behavior/data preserved |
| src/integrations/supabase/previewAuthStorage.ts | Formatting-only lint corrections; existing behavior/data preserved |
| src/integrations/supabase/public-config.ts | Development dependencies, scripts or test configuration |
| src/integrations/supabase/types.ts | Quotation request-ID database types |
| src/lib/admin-schema.ts | Admin authorization, validation and database operations |
| src/lib/admin.functions.ts | Admin authorization, validation and database operations |
| src/lib/admin.server.ts | Admin authorization, validation and database operations |
| src/lib/analytics.functions.ts | Default-off consent-based aggregate counters |
| src/lib/catalogue.functions.ts | Opt-in published product catalogue |
| src/lib/catalogue.server.ts | Opt-in published product catalogue |
| src/lib/error-capture.ts | Redacted diagnostics or response security |
| src/lib/lovable-error-reporting.ts | Redacted diagnostics or response security |
| src/lib/notifications.server.ts | Restricted scheduled notification delivery |
| src/lib/quote-schema.ts | Quotation validation, CAPTCHA/rate/replay/idempotency protections |
| src/lib/quote-security.server.ts | Quotation validation, CAPTCHA/rate/replay/idempotency protections |
| src/lib/quote.functions.ts | Quotation validation, CAPTCHA/rate/replay/idempotency protections |
| src/lib/quote.server.ts | Quotation validation, CAPTCHA/rate/replay/idempotency protections |
| src/lib/security-headers.ts | Redacted diagnostics or response security |
| src/lib/site.ts | Formatting-only lint corrections; existing behavior/data preserved |
| src/routeTree.gen.ts | Generated admin/API route registration |
| src/routes/__root.tsx | Public UX, accessibility, routing, catalogue integration or SEO |
| src/routes/about.tsx | Public UX, accessibility, routing, catalogue integration or SEO |
| src/routes/admin.tsx | Verified admin workspace, enquiry/product/notification interface |
| src/routes/api.notifications.ts | Restricted scheduled notification delivery |
| src/routes/contact.tsx | Public UX, accessibility, routing, catalogue integration or SEO |
| src/routes/dealers.tsx | Public UX, accessibility, routing, catalogue integration or SEO |
| src/routes/index.tsx | Public UX, accessibility, routing, catalogue integration or SEO |
| src/routes/products.tsx | Public UX, accessibility, routing, catalogue integration or SEO |
| src/server.ts | Redacted diagnostics or response security |
| src/styles.css | Public UX, accessibility, routing, catalogue integration or SEO |
| src/test/admin-workspace.test.tsx | Automated unit/component/database/browser QA |
| src/test/admin.test.ts | Automated unit/component/database/browser QA |
| src/test/catalogue.test.ts | Automated unit/component/database/browser QA |
| src/test/database.test.ts | Automated unit/component/database/browser QA |
| src/test/notifications.test.ts | Automated unit/component/database/browser QA |
| src/test/platform.test.ts | Automated unit/component/database/browser QA |
| src/test/quote-form.test.tsx | Automated unit/component/database/browser QA |
| src/test/quote-security.test.ts | Automated unit/component/database/browser QA |
| src/test/quote.test.ts | Automated unit/component/database/browser QA |
| src/test/setup.ts | Automated unit/component/database/browser QA |
| src/test/turnstile.test.tsx | Automated unit/component/database/browser QA |
| tsconfig.json | Development dependencies, scripts or test configuration |

See docs/STATUS.md for current evidence and docs/LAUNCH.md for all manual configuration and approval-dependent steps. Local QA screenshots/reports and generated production output are ignored and excluded from this inventory. SQL drafts were exercised only in disposable embedded PostgreSQL, never on a connected database.
